import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { isTargetParisHour } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChefWithFiches {
  chef_id: string
  chef_email: string
  chef_prenom: string
  chef_nom: string
  nb_fiches: number
  chantiers: Array<{
    chantier_nom: string
    semaine: string
  }>
}

// Template HTML professionnel DIVA pour les emails
function generateEmailHtml(
  prenom: string, 
  content: string, 
  ctaUrl: string, 
  ctaText: string,
  emailType: 'rappel' | 'alerte' | 'validation' = 'rappel'
): string {
  const year = new Date().getFullYear()
  
  const typeConfig = {
    rappel: { icon: '⏰', label: 'Rappel', color: '#f97316' },
    alerte: { icon: '⚠️', label: 'Alerte', color: '#dc2626' },
    validation: { icon: '✅', label: 'Validation', color: '#16a34a' }
  }
  
  const config = typeConfig[emailType]
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DIVA - ${config.label}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header avec logo et badge -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); border-radius: 16px 16px 0 0; padding: 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Logo DIVA -->
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 48px; height: 48px; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; color: white; font-weight: bold;">D</span>
                        </td>
                        <td style="padding-left: 16px;">
                          <span style="font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.5px;">DIVA</span>
                          <br>
                          <span style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Gestion des équipes</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="top">
                    <!-- Badge type -->
                    <span style="display: inline-block; background: ${config.color}; color: white; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${config.icon} ${config.label}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="background: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <!-- Salutation -->
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #111827;">
                Bonjour <strong style="color: #f97316;">${prenom}</strong>,
              </p>
              
              <!-- Contenu dynamique -->
              ${content}
              
              <!-- Bouton CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px 40px; border: 1px solid #e5e7eb; border-top: none;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                      Cet email a été envoyé automatiquement par <strong style="color: #374151;">DIVA</strong>
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #9ca3af;">
                      Vous recevez ce message car vous êtes inscrit sur la plateforme de gestion des équipes.
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://groupe-engo.com" style="font-size: 12px; color: #f97316; text-decoration: none;">Groupe Engo</a>
                        </td>
                        <td style="color: #d1d5db;">•</td>
                        <td style="padding: 0 8px;">
                          <a href="${ctaUrl}" style="font-size: 12px; color: #f97316; text-decoration: none;">Accéder à DIVA</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 11px; color: #9ca3af;">
                      © ${year} Groupe Engo - Tous droits réservés
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const executionId = crypto.randomUUID()
  
  console.log(`[${executionId}] 🚀 Démarrage rappel-chefs-lundi`)

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}))
    const { execution_mode = 'cron', triggered_by = null, force = false } = body

    console.log(`[${executionId}] Mode: ${execution_mode}, Force: ${force}`)

    // Vérifier l'heure (lundi 8h Paris) sauf si force=true
    if (!force && !isTargetParisHour(8)) {
      const now = new Date()
      const day = now.getUTCDay()
      
      // Si ce n'est pas lundi (1), on skip aussi
      if (day !== 1) {
        console.log(`[${executionId}] ⏭️  Pas lundi (jour=${day}), skipping`)
        return new Response(
          JSON.stringify({ 
            skipped: true, 
            reason: 'not_monday',
            day: day 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[${executionId}] ⏭️  Pas 8h Paris, skipping`)
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: 'not_target_hour',
          current_utc_hour: now.getUTCHours() 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Init Supabase et Resend
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY non configuré')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const resend = new Resend(resendApiKey)

    // Calculer la semaine précédente (S-1)
    const now = new Date()
    const previousDate = new Date(now)
    previousDate.setDate(previousDate.getDate() - 7)
    const previousYear = previousDate.getFullYear()
    const previousWeekNum = getWeekNumber(previousDate)
    const previousWeek = `${previousYear}-S${String(previousWeekNum).padStart(2, '0')}`

    console.log(`[${executionId}] 📅 Semaine précédente: ${previousWeek}`)

    // 1. Récupérer tous les chefs
    const { data: chefRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'chef')

    if (rolesError) {
      console.error(`[${executionId}] ❌ Erreur récupération rôles:`, rolesError)
      throw rolesError
    }

    const chefIds = chefRoles.map(r => r.user_id)
    console.log(`[${executionId}] 👥 ${chefIds.length} chefs trouvés`)

    if (chefIds.length === 0) {
      console.log(`[${executionId}] ⚠️  Aucun chef trouvé`)
      return new Response(
        JSON.stringify({ notified: 0, reason: 'no_chefs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Récupérer les infos des chefs
    const { data: chefsData, error: chefsError } = await supabase
      .from('utilisateurs')
      .select('id, email, prenom, nom')
      .in('id', chefIds)

    if (chefsError) {
      console.error(`[${executionId}] ❌ Erreur récupération chefs:`, chefsError)
      throw chefsError
    }

    console.log(`[${executionId}] 📋 ${chefsData.length} profils chefs récupérés`)

    // 3. Récupérer les fiches de S-1 non finalisées
    const { data: fichesData, error: fichesError } = await supabase
      .from('fiches')
      .select('id, statut, chantier_id, user_id')
      .in('user_id', chefIds)
      .eq('semaine', previousWeek)
      .in('statut', ['BROUILLON', 'EN_SIGNATURE'])

    if (fichesError) {
      console.error(`[${executionId}] ❌ Erreur récupération fiches:`, fichesError)
      throw fichesError
    }

    console.log(`[${executionId}] 📄 ${fichesData.length} fiches S-1 non finalisées`)

    let noPendingFiches = false
    if (fichesData.length === 0) {
      console.log(`[${executionId}] ✅ Aucune fiche en retard`)
      if (execution_mode !== 'manual') {
        // Enregistrer dans l'historique et sortir uniquement en mode cron
        await supabase.from('rappels_historique').insert({
          type: 'rappel_chefs_lundi',
          execution_mode,
          triggered_by,
          nb_destinataires: 0,
          nb_succes: 0,
          nb_echecs: 0,
          duration_ms: Date.now() - startTime,
        })

        return new Response(
          JSON.stringify({ notified: 0, reason: 'no_pending_fiches' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Mode manuel: on continue pour envoyer un payload de test
        noPendingFiches = true
      }
    }

    // 4. Récupérer les noms des chantiers
    let chantiersMap = new Map<string, string>()
    const chantierIds = [...new Set(fichesData.map(f => f.chantier_id))]
    if (chantierIds.length > 0) {
      const { data: chantiersData, error: chantiersError } = await supabase
        .from('chantiers')
        .select('id, nom')
        .in('id', chantierIds)

      if (chantiersError) {
        console.error(`[${executionId}] ❌ Erreur récupération chantiers:`, chantiersError)
        throw chantiersError
      }

      chantiersMap = new Map(chantiersData.map(c => [c.id, c.nom]))
    }

    // 5. Grouper par chef
    const chefsWithFiches: ChefWithFiches[] = []

    for (const chef of chefsData) {
      const chefFiches = fichesData.filter(f => f.user_id === chef.id)
      
      if (chefFiches.length > 0) {
        const chantiers = chefFiches.map(f => ({
          chantier_nom: chantiersMap.get(f.chantier_id) || 'Chantier inconnu',
          semaine: previousWeek,
        }))

        chefsWithFiches.push({
          chef_id: chef.id,
          chef_email: chef.email,
          chef_prenom: chef.prenom || '',
          chef_nom: chef.nom || '',
          nb_fiches: chefFiches.length,
          chantiers,
        })
      }
    }

    console.log(`[${executionId}] 🎯 ${chefsWithFiches.length} chefs à notifier`)

    // 🧪 Mode test manuel: si aucun chef à notifier ET mode manuel, créer un payload de test
    if (execution_mode === 'manual' && chefsWithFiches.length === 0 && triggered_by) {
      console.log(`[${executionId}] 🧪 Mode test: envoi d'un payload de démonstration`)
      
      // Récupérer l'utilisateur qui a déclenché le test
      const { data: testUser, error: testUserError } = await supabase
        .from('utilisateurs')
        .select('id, email, prenom, nom')
        .eq('id', triggered_by)
        .single()
      
      if (testUserError) {
        console.error(`[${executionId}] ⚠️  Impossible de récupérer l'utilisateur test:`, testUserError)
      } else if (testUser) {
        // Ajouter un chef fictif avec des données de test
        chefsWithFiches.push({
          chef_id: testUser.id,
          chef_email: testUser.email,
          chef_prenom: testUser.prenom || 'Test',
          chef_nom: testUser.nom || 'User',
          nb_fiches: 2,
          chantiers: [
            { chantier_nom: '🧪 Chantier Test A', semaine: previousWeek },
            { chantier_nom: '🧪 Chantier Test B', semaine: previousWeek }
          ]
        })
        
        console.log(`[${executionId}] ✅ Payload test créé pour ${testUser.email}`)
      }
    }

    // 6. Envoyer les emails via Resend
    let successCount = 0
    let failureCount = 0
    const details: any[] = []

    for (const chef of chefsWithFiches) {
      try {
        const chantiersListHtml = chef.chantiers.map(c => `
          <tr>
            <td style="padding: 12px 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 8px;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: #f97316; border-radius: 50%;"></span>
                  </td>
                  <td style="padding-left: 12px; font-size: 15px; color: #374151; font-weight: 500;">
                    ${c.chantier_nom}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
        `).join('')

        const emailContent = `
          <!-- Alerte urgente -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
              <td style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px;">
                      <span style="font-size: 20px;">🔔</span>
                    </td>
                    <td>
                      <p style="margin: 0; font-size: 15px; color: #991b1b;">
                        <strong style="color: #7f1d1d;">Attention :</strong> Vous avez <strong>${chef.nb_fiches} fiche(s)</strong> de la semaine précédente (<strong>${previousWeek}</strong>) qui n'ont pas encore été validées.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <!-- Liste des chantiers -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
              <td>
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                  🏗️ Chantiers concernés
                </p>
              </td>
            </tr>
            ${chantiersListHtml}
          </table>
          
          <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            Merci de finaliser ces fiches <strong>rapidement</strong> afin d'éviter tout retard dans le traitement des heures.
          </p>
        `

        const emailHtml = generateEmailHtml(
          chef.chef_prenom || 'Chef',
          emailContent,
          'https://crew-time-sheet.lovable.app/',
          '📋 Finaliser mes fiches',
          'alerte'
        )

        console.log(`[${executionId}] 📤 Envoi email à ${chef.chef_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: [chef.chef_email],
          subject: `🔔 Fiches de la semaine dernière (${previousWeek}) non validées`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[${executionId}] ❌ Erreur Resend pour ${chef.chef_email}:`, emailError)
          throw emailError
        }

        console.log(`[${executionId}] ✅ Email envoyé à ${chef.chef_email}`, emailResult)
        successCount++
        details.push({
          chef_email: chef.chef_email,
          status: 'success',
          nb_fiches: chef.nb_fiches,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[${executionId}] ❌ Exception pour ${chef.chef_email}:`, error)
        failureCount++
        details.push({
          chef_email: chef.chef_email,
          status: 'error',
          error: errorMessage,
        })
      }
    }

    const duration = Date.now() - startTime

    // 7. Enregistrer dans l'historique
    await supabase.from('rappels_historique').insert({
      type: 'rappel_chefs_lundi',
      execution_mode,
      triggered_by,
      nb_destinataires: chefsWithFiches.length,
      nb_succes: successCount,
      nb_echecs: failureCount,
      duration_ms: duration,
      details: { items: details },
    })

    console.log(`[${executionId}] ✅ Terminé: ${successCount} succès, ${failureCount} échecs en ${duration}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        notified: successCount,
        failed: failureCount,
        total: chefsWithFiches.length,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${executionId}] ❌ Erreur globale:`, error)

    // Enregistrer l'erreur dans l'historique
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase.from('rappels_historique').insert({
        type: 'rappel_chefs_lundi',
        execution_mode: 'cron',
        triggered_by: null,
        nb_destinataires: 0,
        nb_succes: 0,
        nb_echecs: 0,
        duration_ms: Date.now() - startTime,
        error_message: errorMessage,
      })
    } catch (logError) {
      console.error(`[${executionId}] ❌ Erreur lors de l'enregistrement de l'erreur:`, logError)
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
