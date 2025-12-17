import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { isTargetParisHour } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConducteurWithFiches {
  conducteur_id: string
  conducteur_nom: string
  conducteur_prenom: string
  conducteur_email: string
  nb_fiches_en_attente: number
  chantiers: Array<{
    nom: string
    nb_fiches: number
    chefs: string[]
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('[rappel-conducteurs] 🚀 Démarrage du rappel aux conducteurs...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY non configuré')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    // Lire le body pour récupérer execution_mode, triggered_by et force
    let execution_mode = 'cron'
    let triggered_by = null
    let force = false
    try {
      const body = await req.json()
      execution_mode = body.execution_mode || 'cron'
      triggered_by = body.triggered_by || null
      force = body.force || false
    } catch (e) {
      // Body vide ou invalide, on garde les valeurs par défaut
    }

    // Vérifier si on est à 12h Paris (sauf si force = true)
    if (!force && !isTargetParisHour(12)) {
      console.log('[rappel-conducteurs] ⏭️ Pas encore 12h à Paris, skip')
      return new Response(
        JSON.stringify({ message: 'Not target hour', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (force) {
      console.log('[rappel-conducteurs] 🔥 Mode force activé - bypass de la vérification horaire')
    }

    // ÉTAPE 1: Récupérer les user_id des conducteurs
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'conducteur')

    if (rolesError) {
      console.error('[rappel-conducteurs] ❌ Erreur lors de la récupération des rôles:', rolesError)
      throw rolesError
    }

    if (!rolesData || rolesData.length === 0) {
      console.log('[rappel-conducteurs] ℹ️ Aucun conducteur trouvé')
      return new Response(
        JSON.stringify({ message: 'Aucun conducteur trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const conducteurIds = rolesData.map(r => r.user_id)
    console.log(`[rappel-conducteurs] 👥 ${conducteurIds.length} conducteur(s) trouvé(s)`)

    // ÉTAPE 2: Récupérer les profiles de ces conducteurs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', conducteurIds)

    if (profilesError) {
      console.error('[rappel-conducteurs] ❌ Erreur lors de la récupération des profiles:', profilesError)
      throw profilesError
    }

    // Créer un map id -> profile
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
    console.log(`[rappel-conducteurs] 📋 ${profilesMap.size} profile(s) récupéré(s)`)

    const conducteursANotifier: ConducteurWithFiches[] = []

    // ÉTAPE 3: Pour chaque conducteur, traiter ses chantiers et fiches
    for (const conducteurId of conducteurIds) {
      const profile = profilesMap.get(conducteurId)
      if (!profile) {
        console.warn(`[rappel-conducteurs] ⚠️ Profile non trouvé pour conducteur ${conducteurId}`)
        continue
      }

      // Calculer la semaine ISO actuelle
      const now = new Date()
      const year = now.getFullYear()
      const weekNumber = getWeekNumber(now)
      const currentWeek = `${year}-S${String(weekNumber).padStart(2, '0')}`

      // Récupérer les chantiers du conducteur
      const { data: chantiers, error: chantiersError } = await supabase
        .from('chantiers')
        .select('id, nom')
        .eq('conducteur_id', conducteurId)

      if (chantiersError) {
        console.error(`[rappel-conducteurs] ❌ Erreur chantiers pour ${profile.first_name} ${profile.last_name}:`, chantiersError)
        continue
      }

      if (!chantiers || chantiers.length === 0) {
        continue
      }

      const chantierIds = chantiers.map(c => c.id)
      const chantiersMap = new Map(chantiers.map(c => [c.id, c.nom]))

      // Récupérer les fiches en attente pour ces chantiers
      const { data: fiches, error: fichesError } = await supabase
        .from('fiches')
        .select('id, chantier_id, user_id')
        .in('chantier_id', chantierIds)
        .eq('statut', 'VALIDE_CHEF')

      if (fichesError) {
        console.error(`[rappel-conducteurs] ❌ Erreur fiches pour ${profile.first_name} ${profile.last_name}:`, fichesError)
        continue
      }

      if (!fiches || fiches.length === 0) {
        continue
      }

      // Récupérer les profiles des chefs (user_id dans les fiches)
      const chefIds = [...new Set(fiches.map(f => f.user_id))]
      const { data: chefsProfiles, error: chefsProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', chefIds)

      if (chefsProfilesError) {
        console.error(`[rappel-conducteurs] ❌ Erreur profiles chefs:`, chefsProfilesError)
        continue
      }

      // Map user_id -> nom complet
      const chefsNamesMap = new Map(
        chefsProfiles?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]) || []
      )

      // Grouper par chantier
      const fichesByChantier = new Map<string, any[]>()
      for (const fiche of fiches) {
        if (!fichesByChantier.has(fiche.chantier_id)) {
          fichesByChantier.set(fiche.chantier_id, [])
        }
        fichesByChantier.get(fiche.chantier_id)!.push(fiche)
      }

      // Construire les détails par chantier
      const chantiersDetails = Array.from(fichesByChantier.entries()).map(([chantierId, fichesChantier]) => {
        const chefNamesUniques = [...new Set(
          fichesChantier.map(f => chefsNamesMap.get(f.user_id)).filter(Boolean) as string[]
        )]

        return {
          nom: chantiersMap.get(chantierId) || 'Chantier inconnu',
          nb_fiches: fichesChantier.length,
          chefs: chefNamesUniques
        }
      })

      conducteursANotifier.push({
        conducteur_id: profile.id,
        conducteur_nom: profile.last_name || '',
        conducteur_prenom: profile.first_name || '',
        conducteur_email: profile.email,
        nb_fiches_en_attente: fiches.length,
        chantiers: chantiersDetails
      })

      console.log(`[rappel-conducteurs] ⚠️ Conducteur ${profile.first_name} ${profile.last_name} : ${fiches.length} fiche(s) en attente sur ${chantiersDetails.length} chantier(s)`)
    }

    if (conducteursANotifier.length === 0) {
      console.log('[rappel-conducteurs] ✅ Aucune fiche en attente')
      return new Response(
        JSON.stringify({ message: 'Aucun conducteur à notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ÉTAPE 4: Envoyer les emails via Resend
    console.log(`[rappel-conducteurs] 📧 Envoi de ${conducteursANotifier.length} email(s) via Resend...`)

    const results = []
    for (const conducteur of conducteursANotifier) {
      try {
        const chantiersListHtml = conducteur.chantiers.map(ch => `
          <tr>
            <td style="padding: 16px; background: #f9fafb; border-radius: 10px; margin-bottom: 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🏗️ ${ch.nom}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      <span style="display: inline-block; background: #f97316; color: white; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; margin-right: 8px;">${ch.nb_fiches} fiche(s)</span>
                      Chef(s) : ${ch.chefs.join(', ') || 'N/A'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height: 10px;"></td></tr>
        `).join('')

        const emailContent = `
          <!-- Info principale -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
              <td style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px;">
                      <span style="font-size: 20px;">📋</span>
                    </td>
                    <td>
                      <p style="margin: 0; font-size: 15px; color: #1e40af;">
                        Vous avez <strong style="color: #1e3a8a;">${conducteur.nb_fiches_en_attente} fiche(s)</strong> transmise(s) par vos chefs en attente de votre validation.
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
                  📊 Détail par chantier
                </p>
              </td>
            </tr>
            ${chantiersListHtml}
          </table>
          
          <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            Merci de valider ces fiches dès que possible afin de permettre le traitement des heures par le service RH.
          </p>
        `

        const emailHtml = generateEmailHtml(
          conducteur.conducteur_prenom || 'Conducteur',
          emailContent,
          'https://crew-time-sheet.lovable.app/validation-conducteur',
          '✅ Valider les fiches',
          'validation'
        )

        console.log(`[rappel-conducteurs] 📤 Envoi email à ${conducteur.conducteur_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: [conducteur.conducteur_email],
          subject: `📋 ${conducteur.nb_fiches_en_attente} fiche(s) en attente de votre validation`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[rappel-conducteurs] ❌ Erreur Resend pour ${conducteur.conducteur_email}:`, emailError)
          throw emailError
        }

        console.log(`[rappel-conducteurs] ✅ Email envoyé à ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`, emailResult)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          email: conducteur.conducteur_email,
          success: true
        })
      } catch (emailError) {
        console.error(`[rappel-conducteurs] ❌ Erreur envoi email pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          email: conducteur.conducteur_email,
          success: false,
          error: errorMessage
        })
      }
    }

    console.log(`[rappel-conducteurs] 🎉 Traitement terminé: ${results.filter(r => r.success).length}/${results.length} succès`)

    // ÉTAPE 5: Enregistrer dans l'historique
    const endTime = Date.now()
    const duration_ms = endTime - startTime

    await supabase.from('rappels_historique').insert({
      type: 'rappel_conducteurs',
      execution_mode,
      triggered_by,
      nb_destinataires: conducteursANotifier.length,
      nb_succes: results.filter(r => r.success).length,
      nb_echecs: results.filter(r => !r.success).length,
      details: results,
      duration_ms
    })

    return new Response(
      JSON.stringify({
        message: 'Rappel aux conducteurs terminé',
        total_conducteurs: conducteursANotifier.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[rappel-conducteurs] ❌ Erreur globale:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Enregistrer l'erreur dans l'historique
    const endTime = Date.now()
    const duration_ms = endTime - startTime

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      let execution_mode = 'cron'
      let triggered_by = null
      try {
        const body = await req.json()
        execution_mode = body.execution_mode || 'cron'
        triggered_by = body.triggered_by || null
      } catch (e) {
        // Ignore
      }

      await supabase.from('rappels_historique').insert({
        type: 'rappel_conducteurs',
        execution_mode,
        triggered_by,
        nb_destinataires: 0,
        nb_succes: 0,
        nb_echecs: 0,
        error_message: errorMessage,
        duration_ms
      })
    } catch (histError) {
      console.error('[rappel-conducteurs] ❌ Erreur lors de l\'enregistrement dans l\'historique:', histError)
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Fonction utilitaire pour obtenir le numéro de semaine ISO
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
