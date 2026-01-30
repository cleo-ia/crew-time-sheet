import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateInvitationEmailHtml } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Créer le client Supabase avec la clé service role pour les opérations admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Créer le client avec l'autorisation de l'utilisateur appelant
    const authHeader = req.headers.get('Authorization');
    
    // Créer le client - inclure le header seulement s'il existe
    const clientOptions: any = {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    };
    
    if (authHeader) {
      clientOptions.global = {
        headers: { Authorization: authHeader }
      };
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      clientOptions
    );

    // Vérifier l'authentification de l'utilisateur appelant ou activer le mode bootstrap (premier admin)
    let isBootstrap = false;
    let invitedByUserId: string | null = null;
    let inviterEntrepriseId: string | null = null;

    // Tenter d'obtenir l'utilisateur seulement si un header d'auth est présent
    let user = null;
    let userError = null;
    
    if (authHeader) {
      const authResult = await supabaseClient.auth.getUser();
      user = authResult.data.user;
      userError = authResult.error;
    }
    
    // Parser les données de la requête en premier pour le mode bootstrap par entreprise
    const { email, role, conducteur_id, entreprise_id: requestedEntrepriseId, entreprise_slug } = await req.json();
    console.log('📧 Invitation request:', { email, role, conducteur_id, requestedEntrepriseId, entreprise_slug });

    // Résoudre l'entreprise_id depuis le slug si fourni
    let bootstrapEntrepriseId: string | null = requestedEntrepriseId || null;
    if (!bootstrapEntrepriseId && entreprise_slug) {
      const { data: entreprise } = await supabaseAdmin
        .from('entreprises')
        .select('id')
        .eq('slug', entreprise_slug)
        .single();
      bootstrapEntrepriseId = entreprise?.id || null;
    }

    if (userError || !user) {
      // Aucun JWT utilisateur valide. Vérifier si un admin existe pour l'entreprise demandée.
      if (!bootstrapEntrepriseId) {
        console.error('Bootstrap mode requires entreprise_id or entreprise_slug');
        return new Response(
          JSON.stringify({ error: 'entreprise_id or entreprise_slug is required for bootstrap' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingAdmins, error: adminsError } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .eq('entreprise_id', bootstrapEntrepriseId)
        .limit(1);

      if (adminsError) {
        console.error('Error checking admin existence:', adminsError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existingAdmins || existingAdmins.length === 0) {
        console.log('BOOTSTRAP MODE: no admin found for entreprise', bootstrapEntrepriseId, ', allowing first admin invitation');
        isBootstrap = true;
      } else {
        console.error('Authentication error: admin already exists for this enterprise');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: an admin already exists for this enterprise' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      invitedByUserId = user.id;
      console.log('User authenticated:', user.id);
      
      // Récupérer l'entreprise_id de l'utilisateur qui invite
      const { data: inviterRole, error: inviterRoleError } = await supabaseAdmin
        .from('user_roles')
        .select('entreprise_id')
        .eq('user_id', user.id)
        .single();
      
      if (inviterRoleError) {
        console.error('Error fetching inviter entreprise:', inviterRoleError);
      } else {
        inviterEntrepriseId = inviterRole?.entreprise_id || null;
        console.log('Inviter entreprise_id:', inviterEntrepriseId);
      }
    }

    // Déterminer l'entreprise_id à utiliser
    let finalEntrepriseId: string | null = null;
    
    if (isBootstrap) {
      // En mode bootstrap, utiliser l'entreprise résolue depuis le slug ou l'id
      finalEntrepriseId = bootstrapEntrepriseId;
    } else {
      // Priorité à l'entreprise passée en paramètre (entreprise sélectionnée dans le frontend)
      // Cela permet aux admins multi-entreprises d'inviter dans l'entreprise actuellement sélectionnée
      finalEntrepriseId = bootstrapEntrepriseId || inviterEntrepriseId || null;
      console.log('Using entreprise_id:', finalEntrepriseId, '(requested:', bootstrapEntrepriseId, ', inviter:', inviterEntrepriseId, ')');
    }

    if (!finalEntrepriseId) {
      return new Response(
        JSON.stringify({ error: 'entreprise_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le slug ET le nom de l'entreprise pour les URLs et l'email
    const { data: entrepriseData } = await supabaseAdmin
      .from('entreprises')
      .select('slug, nom')
      .eq('id', finalEntrepriseId)
      .single();
    
    const entrepriseSlug = entrepriseData?.slug || '';
    const entrepriseNom = entrepriseData?.nom || 'Groupe Engo';
    const baseUrl = req.headers.get('origin') || 'https://crew-time-sheet.lovable.app';
    const redirectUrl = `${baseUrl}/auth?entreprise=${entrepriseSlug}`;

    // Validation de l'email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le domaine email (@groupe-engo.com)
    const emailRegex = /^[a-z0-9._%+-]+@groupe-engo\.com$/i;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email must be from @groupe-engo.com domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation du rôle + vérifications d'autorisation
    const validRoles = ['admin', 'rh', 'conducteur', 'chef'];
    if (!role || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifications d'autorisation
    if (!isBootstrap) {
      // Vérifier si l'utilisateur est admin OU super_admin
      const { data: userRoles, error: rolesError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', invitedByUserId as string)
        .in('role', ['admin', 'super_admin'])
        .limit(1);

      if (rolesError || !userRoles || userRoles.length === 0) {
        console.error('Admin role check failed:', rolesError);
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin role required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Admin role verified:', userRoles[0].role);
    } else {
      // En mode bootstrap, seul le rôle 'admin' est autorisé
      if (role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Bootstrap mode only allows creating an admin' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Bootstrap mode: bypassing admin check');
    }

    // Vérifier si l'utilisateur existe déjà dans profiles
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking existing profile:', profileCheckError);
      return new Response(
        JSON.stringify({ error: 'Database error while checking existing user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si une fiche utilisateurs existe (liaison automatique future via trigger)
    // Utiliser ilike pour une comparaison case-insensitive (évite les doublons Jorge.martins vs jorge.martins)
    const { data: existingUtilisateur } = await supabaseAdmin
      .from('utilisateurs')
      .select('id, prenom, nom, role_metier')
      .ilike('email', email.trim())
      .eq('entreprise_id', finalEntrepriseId)
      .maybeSingle();

    if (existingUtilisateur) {
      console.log('📋 Fiche RH existante trouvée:', {
        id: existingUtilisateur.id,
        nom: `${existingUtilisateur.prenom} ${existingUtilisateur.nom}`,
        role_metier: existingUtilisateur.role_metier,
      });
      console.log('✅ Le trigger handle_new_user_signup liera automatiquement auth_user_id lors de l\'acceptation');
    }

    // Si l'utilisateur existe déjà
    if (existingProfile) {
      console.log('User already exists:', existingProfile.id);

      // Vérifier si ce rôle existe déjà pour cette entreprise
      const { data: existingRole, error: roleCheckError } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', existingProfile.id)
        .eq('role', role)
        .eq('entreprise_id', finalEntrepriseId)
        .maybeSingle();

      if (roleCheckError) {
        console.error('Error checking existing role:', roleCheckError);
        return new Response(
          JSON.stringify({ error: 'Database error while checking existing role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si c'est un mode resend (utilisateur existe avec le même rôle pour cette entreprise)
      // Envoyer un email de récupération de mot de passe
      if (existingRole) {
        console.log('User already has this role, sending password reset email');
        
        // Utiliser resetPasswordForEmail qui ENVOIE réellement l'email
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
          email.toLowerCase(),
          {
            redirectTo: redirectUrl,
          }
        );

        if (resetError) {
          console.error('Error sending reset password email:', resetError);
          return new Response(
            JSON.stringify({ error: 'Failed to send reset email', details: resetError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Password reset email sent successfully');

        return new Response(
          JSON.stringify({
            success: true,
            mode: 'recovery_sent',
            message: 'Un email de réinitialisation de mot de passe a été envoyé'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Si bootstrap ou admin invitant → ajouter le nouveau rôle pour cette entreprise
      console.log('Adding new role for existing user');

      const { error: insertRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: existingProfile.id,
          role: role,
          entreprise_id: finalEntrepriseId,
        });

      if (insertRoleError) {
        console.error('Error inserting role:', insertRoleError);
        return new Response(
          JSON.stringify({ error: 'Failed to add role', details: insertRoleError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Envoyer également un email de reset pour que l'utilisateur puisse se connecter
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) {
        console.warn('Warning: Role added but reset email failed:', resetError);
      }

      console.log('Role added successfully for existing user');

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'role_added',
          message: `Role ${role} added successfully for existing user. Recovery email sent.`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Vérifier s'il y a déjà une invitation en attente
    const { data: existingInvitation, error: invitationCheckError } = await supabaseAdmin
      .from('invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (invitationCheckError) {
      console.error('Error checking existing invitation:', invitationCheckError);
      return new Response(
        JSON.stringify({ error: 'Database error while checking existing invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: 'Pending invitation already exists for this email' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer l'invitation dans la base de données avec entreprise_id
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        conducteur_id: conducteur_id || null,
        entreprise_id: finalEntrepriseId,
        // invited_by référence utilisateurs.id (pas profiles). Comme tous les admins n'ont pas d'entrée
        // dans "utilisateurs", on évite la violation FK en le laissant à NULL et on stocke l'info dans meta.
        invited_by: null,
        meta: { invited_by_auth_user_id: invitedByUserId },
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting invitation:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation created in database:', invitation.id, 'for entreprise:', finalEntrepriseId);

    // Générer le lien d'invitation via generateLink (sans envoyer d'email)
    // Cette méthode crée l'utilisateur dans auth.users ET génère le lien
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email.toLowerCase(),
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (linkError) {
      console.error('Error generating invitation link:', linkError);
      
      // Supprimer l'invitation de la base de données en cas d'échec
      await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Failed to generate invitation link', details: linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation link generated successfully');

    // Envoyer l'email via Resend avec le template personnalisé
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const invitationLink = linkData.properties?.action_link;
    
    if (!invitationLink) {
      console.error('No action_link in generateLink response');
      
      // Rollback: supprimer l'invitation et l'utilisateur créé
      await supabaseAdmin.from('invitations').delete().eq('id', invitation.id);
      if (linkData.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(linkData.user.id);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to get invitation link from response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailHtml = generateInvitationEmailHtml(entrepriseNom, invitationLink, email.toLowerCase(), role);

    const { error: emailError } = await resend.emails.send({
      from: 'DIVA <rappels-diva-LR@groupe-engo.com>',
      to: [email.toLowerCase()],
      subject: `Invitation à rejoindre DIVA - ${entrepriseNom}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending invitation email via Resend:', emailError);
      
      // Rollback: supprimer l'invitation et l'utilisateur créé
      await supabaseAdmin.from('invitations').delete().eq('id', invitation.id);
      if (linkData.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(linkData.user.id);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: String(emailError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation email sent successfully via Resend to:', email.toLowerCase());

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          entreprise_id: invitation.entreprise_id,
          expires_at: invitation.expires_at,
        },
        message: 'Invitation sent successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in invite-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});