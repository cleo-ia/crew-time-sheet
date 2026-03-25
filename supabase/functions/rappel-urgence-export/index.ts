import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { 
  generateEmailHtml, 
  createAlertBox, 
  createClosingMessage 
} from '../_shared/emailTemplate.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const { targetUserId, targetRole, semaine, chantierNom, teamCount } = await req.json()

    if (!targetUserId || !targetRole || !semaine || !chantierNom) {
      throw new Error('Paramètres manquants: targetUserId, targetRole, semaine, chantierNom requis')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY non configuré')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    // Récupérer le profil du destinataire
    const { data: profile, error: profileError } = await supabase
      .from('utilisateurs')
      .select('id, email, prenom, nom')
      .eq('id', targetUserId)
      .maybeSingle()

    if (profileError || !profile) {
      throw new Error(`Profil non trouvé pour l'utilisateur ${targetUserId}`)
    }

    if (!profile.email) {
      throw new Error(`Pas d'email pour l'utilisateur ${targetUserId}`)
    }

    console.log(`[rappel-urgence-export] Envoi à ${profile.prenom} ${profile.nom} (${profile.email}) - rôle: ${targetRole}`)

    const roleLabel = targetRole === 'chef' ? 'chef de chantier' : 'conducteur de travaux'
    const actionLabel = targetRole === 'chef' 
      ? 'transmettre les fiches de pointage de votre équipe'
      : 'valider les fiches de pointage transmises par le chef'

    const emailContent = `
      ${createAlertBox(
        `<strong>Rappel urgent pour l'export de paie</strong><br/>En tant que ${roleLabel}, vous devez ${actionLabel} pour la semaine <strong>${semaine}</strong> sur le chantier <strong>${chantierNom}</strong>.`,
        'error'
      )}
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px; background-color: #f9fafb; border-radius: 10px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="font-size: 14px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  <strong>Chantier :</strong> ${chantierNom}<br/>
                  <strong>Semaine :</strong> ${semaine}<br/>
                  ${teamCount ? `<strong>Salariés concernés :</strong> ${teamCount}` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      ${createClosingMessage('Le service RH a besoin de ces fiches pour procéder à l\'export de paie. Merci d\'agir au plus vite.')}
    `

    const emailHtml = generateEmailHtml(
      profile.first_name || roleLabel,
      emailContent,
      'https://crew-time-sheet.lovable.app/',
      targetRole === 'chef' ? 'Transmettre mes fiches' : 'Valider les fiches',
      'alerte'
    )

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'DIVA Urgence <rappels-diva-LR@groupe-engo.com>',
      to: [profile.email],
      subject: `URGENT - Fiches ${semaine} en attente (${chantierNom})`,
      html: emailHtml,
    })

    if (emailError) {
      console.error('[rappel-urgence-export] Erreur Resend:', emailError)
      throw emailError
    }

    console.log('[rappel-urgence-export] Email envoyé avec succès:', emailResult)

    // Historique
    const endTime = Date.now()
    await supabase.from('rappels_historique').insert({
      type: 'urgence_export',
      execution_mode: 'manuel',
      nb_destinataires: 1,
      nb_succes: 1,
      nb_echecs: 0,
      duration_ms: endTime - startTime,
      details: {
        semaine,
        chantier: chantierNom,
        destinataire: {
          nom: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          role: targetRole,
        },
        team_count: teamCount,
      }
    })

    return new Response(
      JSON.stringify({ success: true, email: profile.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[rappel-urgence-export] Erreur:', error)

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase.from('rappels_historique').insert({
        type: 'urgence_export',
        execution_mode: 'manuel',
        nb_destinataires: 0,
        nb_succes: 0,
        nb_echecs: 1,
        error_message: error instanceof Error ? error.message : String(error)
      })
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
