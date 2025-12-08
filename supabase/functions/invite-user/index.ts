import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    if (userError || !user) {
      // Aucun JWT utilisateur valide. Si aucun admin n'existe encore, autoriser une invitation unique pour bootstrap.
      const { data: existingAdmins, error: adminsError } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (adminsError) {
        console.error('Error checking admin existence:', adminsError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existingAdmins || existingAdmins.length === 0) {
        console.log('BOOTSTRAP MODE: no admin found, allowing first admin invitation');
        isBootstrap = true;
      } else {
        console.error('Authentication error:', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
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

    // La vérification du rôle admin est effectuée après le parsing de la requête
    // afin de permettre le mode bootstrap (première invitation admin) si nécessaire.

    // Parser les données de la requête
    const { email, role, conducteur_id, entreprise_id: requestedEntrepriseId } = await req.json();
    console.log('Invitation request:', { email, role, conducteur_id, requestedEntrepriseId });

    // Déterminer l'entreprise_id à utiliser
    let finalEntrepriseId: string | null = null;
    
    if (isBootstrap) {
      // En mode bootstrap, on doit fournir une entreprise_id (ou utiliser Limoge Revillon par défaut)
      if (requestedEntrepriseId) {
        finalEntrepriseId = requestedEntrepriseId;
      } else {
        // Récupérer Limoge Revillon par défaut
        const { data: defaultEntreprise } = await supabaseAdmin
          .from('entreprises')
          .select('id')
          .eq('slug', 'limoge-revillon')
          .single();
        finalEntrepriseId = defaultEntreprise?.id || null;
      }
    } else {
      // Utiliser l'entreprise de l'admin qui invite (priorité) ou celle passée en paramètre
      finalEntrepriseId = inviterEntrepriseId || requestedEntrepriseId || null;
    }

    if (!finalEntrepriseId) {
      return new Response(
        JSON.stringify({ error: 'entreprise_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const { data: userRoles, error: rolesError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', invitedByUserId as string)
        .eq('role', 'admin')
        .single();

      if (rolesError || !userRoles) {
        console.error('Admin role check failed:', rolesError);
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin role required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Admin role verified');
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

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Envoyer l'email d'invitation via l'API Admin de Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/auth`,
      }
    );

    if (inviteError) {
      console.error('Error sending invitation email:', inviteError);
      
      // Supprimer l'invitation de la base de données en cas d'échec
      await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation email sent successfully');

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