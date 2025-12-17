import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { isTargetParisHour } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChefWithFiches {
  chef_id: string
  chef_nom: string
  chef_prenom: string
  chef_email: string
  nb_fiches_en_cours: number
  chantiers: string[]
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
    console.log('[rappel-chefs] 🚀 Démarrage du rappel aux chefs...')

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
      console.log('[rappel-chefs] ⏭️ Pas encore 12h à Paris, skip')
      return new Response(
        JSON.stringify({ message: 'Not target hour', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (force) {
      console.log('[rappel-chefs] 🔥 Mode force activé - bypass de la vérification horaire')
    }

    // Récupérer la semaine en cours (format YYYY-Sww)
    const now = new Date()
    const year = now.getFullYear()
    const weekNumber = getWeekNumber(now)
    const currentWeek = `${year}-S${String(weekNumber).padStart(2, '0')}`

    console.log(`[rappel-chefs] 📅 Semaine en cours : ${currentWeek}`)

    // ÉTAPE 1: Récupérer les user_id des chefs
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'chef')

    if (rolesError) {
      console.error('[rappel-chefs] ❌ Erreur lors de la récupération des rôles:', rolesError)
      throw rolesError
    }

    if (!rolesData || rolesData.length === 0) {
      console.log('[rappel-chefs] ℹ️ Aucun chef trouvé')
      return new Response(
        JSON.stringify({ message: 'Aucun chef trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const chefIds = rolesData.map(r => r.user_id)
    console.log(`[rappel-chefs] 👥 ${chefIds.length} chef(s) trouvé(s)`)

    // ÉTAPE 2: Récupérer les profiles de ces chefs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', chefIds)

    if (profilesError) {
      console.error('[rappel-chefs] ❌ Erreur lors de la récupération des profiles:', profilesError)
      throw profilesError
    }

    // Créer un map id -> profile
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
    console.log(`[rappel-chefs] 📋 ${profilesMap.size} profile(s) récupéré(s)`)

    // ÉTAPE 3: Récupérer toutes les fiches non finalisées pour ces chefs
    const { data: fichesData, error: fichesError } = await supabase
      .from('fiches')
      .select('id, statut, chantier_id, user_id')
      .in('user_id', chefIds)
      .eq('semaine', currentWeek)
      .in('statut', ['BROUILLON', 'EN_SIGNATURE'])

    if (fichesError) {
      console.error('[rappel-chefs] ❌ Erreur lors de la récupération des fiches:', fichesError)
      throw fichesError
    }

    console.log(`[rappel-chefs] 📝 ${fichesData?.length || 0} fiche(s) en cours trouvée(s)`)

    if (!fichesData || fichesData.length === 0) {
      console.log('[rappel-chefs] ✅ Tous les chefs ont finalisé leurs fiches')
      return new Response(
        JSON.stringify({ message: 'Aucun chef à notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ÉTAPE 4: Récupérer les noms des chantiers
    const chantierIds = [...new Set(fichesData.map(f => f.chantier_id).filter(Boolean))]
    const { data: chantiersData, error: chantiersError } = await supabase
      .from('chantiers')
      .select('id, nom')
      .in('id', chantierIds)

    if (chantiersError) {
      console.error('[rappel-chefs] ❌ Erreur lors de la récupération des chantiers:', chantiersError)
      throw chantiersError
    }

    // Créer un map chantier_id -> nom
    const chantiersMap = new Map(chantiersData?.map(c => [c.id, c.nom]) || [])
    console.log(`[rappel-chefs] 🏗️ ${chantiersMap.size} chantier(s) récupéré(s)`)

    // ÉTAPE 5: Grouper les fiches par chef
    const fichesByChef = new Map<string, any[]>()
    for (const fiche of fichesData) {
      if (!fichesByChef.has(fiche.user_id)) {
        fichesByChef.set(fiche.user_id, [])
      }
      fichesByChef.get(fiche.user_id)!.push(fiche)
    }

    // ÉTAPE 6: Construire la liste des chefs à notifier
    const chefsANotifier: ChefWithFiches[] = []

    for (const [chefId, fiches] of fichesByChef) {
      const profile = profilesMap.get(chefId)
      if (!profile) {
        console.warn(`[rappel-chefs] ⚠️ Profile non trouvé pour chef ${chefId}`)
        continue
      }

      // Extraire les noms uniques des chantiers
      const chantiers = [...new Set(
        fiches
          .map(f => chantiersMap.get(f.chantier_id))
          .filter(Boolean) as string[]
      )]

      chefsANotifier.push({
        chef_id: profile.id,
        chef_nom: profile.last_name || '',
        chef_prenom: profile.first_name || '',
        chef_email: profile.email,
        nb_fiches_en_cours: fiches.length,
        chantiers
      })

      console.log(`[rappel-chefs] ⚠️ Chef ${profile.first_name} ${profile.last_name} : ${fiches.length} fiche(s) en cours sur ${chantiers.length} chantier(s)`)
    }

    if (chefsANotifier.length === 0) {
      console.log('[rappel-chefs] ✅ Aucun chef à notifier après filtrage')
      return new Response(
        JSON.stringify({ message: 'Aucun chef à notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ÉTAPE 7: Envoyer les emails via Resend
    console.log(`[rappel-chefs] 📧 Envoi de ${chefsANotifier.length} email(s) via Resend...`)

    const results = []
    for (const chef of chefsANotifier) {
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
                    ${c}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
        `).join('')
        
        const emailContent = `
          <!-- Alerte principale -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
              <td style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px;">
                      <span style="font-size: 20px;">📝</span>
                    </td>
                    <td>
                      <p style="margin: 0; font-size: 15px; color: #92400e;">
                        Vous avez <strong style="color: #78350f;">${chef.nb_fiches_en_cours} fiche(s)</strong> non finalisée(s) pour la semaine <strong style="color: #78350f;">${currentWeek}</strong>.
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
            Merci de finaliser vos fiches dès que possible afin de permettre la validation par votre conducteur.
          </p>
        `

        const emailHtml = generateEmailHtml(
          chef.chef_prenom || 'Chef',
          emailContent,
          'https://crew-time-sheet.lovable.app/',
          '📋 Accéder à mes fiches',
          'rappel'
        )

        console.log(`[rappel-chefs] 📤 Envoi email à ${chef.chef_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: ['tom.genin@groupe-engo.com'], // TEMPORAIRE POUR TEST - remettre [chef.chef_email]
          subject: `⏰ Rappel - ${chef.nb_fiches_en_cours} fiche(s) en attente de validation`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[rappel-chefs] ❌ Erreur Resend pour ${chef.chef_email}:`, emailError)
          throw emailError
        }

        console.log(`[rappel-chefs] ✅ Email envoyé à ${chef.chef_prenom} ${chef.chef_nom} (${chef.chef_email})`, emailResult)
        results.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          email: chef.chef_email,
          success: true
        })
      } catch (emailError) {
        console.error(`[rappel-chefs] ❌ Erreur envoi email pour ${chef.chef_prenom} ${chef.chef_nom}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
        results.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          email: chef.chef_email,
          success: false,
          error: errorMessage
        })
      }
    }

    console.log(`[rappel-chefs] 🎉 Traitement terminé: ${results.filter(r => r.success).length}/${results.length} succès`)

    // ÉTAPE 8: Enregistrer dans l'historique
    const endTime = Date.now()
    const duration_ms = endTime - startTime

    await supabase.from('rappels_historique').insert({
      type: 'rappel_chefs',
      execution_mode,
      triggered_by,
      nb_destinataires: chefsANotifier.length,
      nb_succes: results.filter(r => r.success).length,
      nb_echecs: results.filter(r => !r.success).length,
      details: results,
      duration_ms
    })

    return new Response(
      JSON.stringify({
        message: 'Rappel aux chefs terminé',
        total_chefs: chefsANotifier.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[rappel-chefs] ❌ Erreur globale:', error)
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
        type: 'rappel_chefs',
        execution_mode,
        triggered_by,
        nb_destinataires: 0,
        nb_succes: 0,
        nb_echecs: 0,
        error_message: errorMessage,
        duration_ms
      })
    } catch (histError) {
      console.error('[rappel-chefs] ❌ Erreur lors de l\'enregistrement dans l\'historique:', histError)
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
