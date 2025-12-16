import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { isTargetParisHour } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConducteurWithFinisseurs {
  conducteur_id: string
  conducteur_nom: string
  conducteur_prenom: string
  conducteur_email: string
  nb_finisseurs_en_attente: number
  finisseurs: Array<{
    finisseur_nom: string
    finisseur_prenom: string
    nb_fiches: number
  }>
}

// Template HTML professionnel pour les emails
function generateEmailHtml(prenom: string, content: string, ctaUrl: string, ctaText: string): string {
  const year = new Date().getFullYear()
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .list { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; }
    .finisseur-item { background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center; }
    .finisseur-name { font-weight: bold; color: #374151; }
    .finisseur-count { background: #f97316; color: white; padding: 4px 10px; border-radius: 12px; font-size: 14px; }
    .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .button:hover { background: #ea580c; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; padding: 16px; }
    .footer a { color: #f97316; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ DIVA - Finisseurs en attente</h1>
    </div>
    <div class="content">
      <p class="greeting">Bonjour ${prenom},</p>
      ${content}
      <div style="text-align: center;">
        <a href="${ctaUrl}" class="button">${ctaText}</a>
      </div>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par DIVA.</p>
      <p>© ${year} <a href="https://groupe-engo.com">Groupe Engo</a></p>
    </div>
  </div>
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
    console.log('[rappel-conducteurs-finisseurs] 🚀 Démarrage du rappel aux conducteurs pour finisseurs...')

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
      console.log('[rappel-conducteurs-finisseurs] ⏭️ Pas encore 12h à Paris, skip')
      return new Response(
        JSON.stringify({ message: 'Not target hour', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (force) {
      console.log('[rappel-conducteurs-finisseurs] 🔥 Mode force activé - bypass de la vérification horaire')
    }

    // Calculer la semaine ISO actuelle
    const now = new Date()
    const year = now.getFullYear()
    const weekNumber = getWeekNumber(now)
    const currentWeek = `${year}-S${String(weekNumber).padStart(2, '0')}`
    console.log(`[rappel-conducteurs-finisseurs] 📅 Semaine courante: ${currentWeek}`)

    // ÉTAPE 1: Récupérer les user_id des conducteurs
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'conducteur')

    if (rolesError) {
      console.error('[rappel-conducteurs-finisseurs] ❌ Erreur lors de la récupération des rôles:', rolesError)
      throw rolesError
    }

    if (!rolesData || rolesData.length === 0) {
      console.log('[rappel-conducteurs-finisseurs] ℹ️ Aucun conducteur trouvé')
      return new Response(
        JSON.stringify({ message: 'Aucun conducteur trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const conducteurIds = rolesData.map(r => r.user_id)
    console.log(`[rappel-conducteurs-finisseurs] 👥 ${conducteurIds.length} conducteur(s) trouvé(s)`)

    // ÉTAPE 2: Récupérer les profiles de ces conducteurs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', conducteurIds)

    if (profilesError) {
      console.error('[rappel-conducteurs-finisseurs] ❌ Erreur lors de la récupération des profiles:', profilesError)
      throw profilesError
    }

    // Créer un map id -> profile
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
    console.log(`[rappel-conducteurs-finisseurs] 📋 ${profilesMap.size} profile(s) récupéré(s)`)

    const conducteursANotifier: ConducteurWithFinisseurs[] = []

    // ÉTAPE 3: Pour chaque conducteur, traiter ses finisseurs affectés
    for (const conducteurId of conducteurIds) {
      const profile = profilesMap.get(conducteurId)
      if (!profile) {
        console.warn(`[rappel-conducteurs-finisseurs] ⚠️ Profile non trouvé pour conducteur ${conducteurId}`)
        continue
      }

      // Récupérer les affectations actives de finisseurs pour ce conducteur
      const { data: affectations, error: affectationsError } = await supabase
        .from('affectations_finisseurs')
        .select('finisseur_id')
        .eq('conducteur_id', conducteurId)
        .or('date_fin.is.null,date_fin.gte.' + now.toISOString().split('T')[0])

      if (affectationsError) {
        console.error(`[rappel-conducteurs-finisseurs] ❌ Erreur affectations pour ${profile.first_name} ${profile.last_name}:`, affectationsError)
        continue
      }

      if (!affectations || affectations.length === 0) {
        continue
      }

      const finisseurIds = affectations.map(a => a.finisseur_id)

      // Récupérer les fiches non finalisées de ces finisseurs pour la semaine courante
      const { data: fiches, error: fichesError } = await supabase
        .from('fiches')
        .select('id, salarie_id')
        .in('salarie_id', finisseurIds)
        .eq('semaine', currentWeek)
        .in('statut', ['BROUILLON', 'EN_SIGNATURE'])

      if (fichesError) {
        console.error(`[rappel-conducteurs-finisseurs] ❌ Erreur fiches pour ${profile.first_name} ${profile.last_name}:`, fichesError)
        continue
      }

      if (!fiches || fiches.length === 0) {
        continue
      }

      // Récupérer les profiles des finisseurs concernés
      const finisseursAvecFiches = [...new Set(fiches.map(f => f.salarie_id))]
      const { data: finisseursProfiles, error: finisseursProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', finisseursAvecFiches)

      if (finisseursProfilesError) {
        console.error(`[rappel-conducteurs-finisseurs] ❌ Erreur profiles finisseurs:`, finisseursProfilesError)
        continue
      }

      // Compter les fiches par finisseur
      const fichesByFinisseur = new Map<string, number>()
      for (const fiche of fiches) {
        fichesByFinisseur.set(
          fiche.salarie_id,
          (fichesByFinisseur.get(fiche.salarie_id) || 0) + 1
        )
      }

      // Construire les détails par finisseur
      const finisseursDetails = finisseursProfiles?.map(fp => ({
        finisseur_nom: fp.last_name || '',
        finisseur_prenom: fp.first_name || '',
        nb_fiches: fichesByFinisseur.get(fp.id) || 0
      })).filter(fd => fd.nb_fiches > 0) || []

      if (finisseursDetails.length === 0) {
        continue
      }

      conducteursANotifier.push({
        conducteur_id: profile.id,
        conducteur_nom: profile.last_name || '',
        conducteur_prenom: profile.first_name || '',
        conducteur_email: profile.email,
        nb_finisseurs_en_attente: finisseursDetails.length,
        finisseurs: finisseursDetails
      })

      console.log(`[rappel-conducteurs-finisseurs] ⚠️ Conducteur ${profile.first_name} ${profile.last_name} : ${finisseursDetails.length} finisseur(s) avec fiches non finalisées`)
    }

    if (conducteursANotifier.length === 0) {
      console.log('[rappel-conducteurs-finisseurs] ✅ Aucune fiche en attente')
      
      // Enregistrer dans l'historique même si aucune notification
      await supabase.from('rappels_historique').insert({
        type: 'rappel_conducteurs_finisseurs',
        execution_mode,
        triggered_by,
        nb_destinataires: 0,
        nb_succes: 0,
        nb_echecs: 0,
        duration_ms: Date.now() - startTime
      })
      
      return new Response(
        JSON.stringify({ message: 'Aucun conducteur à notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ÉTAPE 4: Envoyer les emails via Resend
    console.log(`[rappel-conducteurs-finisseurs] 📧 Envoi de ${conducteursANotifier.length} email(s) via Resend...`)

    const results = []
    for (const conducteur of conducteursANotifier) {
      try {
        const finisseursListHtml = conducteur.finisseurs.map(f => `
          <div class="finisseur-item">
            <span class="finisseur-name">👷 ${f.finisseur_prenom} ${f.finisseur_nom}</span>
            <span class="finisseur-count">${f.nb_fiches} fiche(s)</span>
          </div>
        `).join('')

        const emailContent = `
          <div class="alert">
            <strong>⚠️ Attention :</strong> ${conducteur.nb_finisseurs_en_attente} finisseur(s) ont des fiches non finalisées pour la semaine <strong>${currentWeek}</strong>.
          </div>
          <div class="list">
            <p><strong>Finisseurs concernés :</strong></p>
            ${finisseursListHtml}
          </div>
          <p>Merci de vérifier et relancer ces finisseurs si nécessaire.</p>
        `

        const emailHtml = generateEmailHtml(
          conducteur.conducteur_prenom || 'Conducteur',
          emailContent,
          'https://crew-time-sheet.lovable.app/validation-conducteur',
          '📋 Voir les fiches'
        )

        console.log(`[rappel-conducteurs-finisseurs] 📤 Envoi email à ${conducteur.conducteur_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: [conducteur.conducteur_email],
          subject: `⚠️ ${conducteur.nb_finisseurs_en_attente} finisseur(s) avec fiches non finalisées`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[rappel-conducteurs-finisseurs] ❌ Erreur Resend pour ${conducteur.conducteur_email}:`, emailError)
          throw emailError
        }

        console.log(`[rappel-conducteurs-finisseurs] ✅ Email envoyé à ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`, emailResult)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          email: conducteur.conducteur_email,
          success: true
        })
      } catch (emailError) {
        console.error(`[rappel-conducteurs-finisseurs] ❌ Erreur envoi email pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          email: conducteur.conducteur_email,
          success: false,
          error: errorMessage
        })
      }
    }

    console.log(`[rappel-conducteurs-finisseurs] 🎉 Traitement terminé: ${results.filter(r => r.success).length}/${results.length} succès`)

    // ÉTAPE 5: Enregistrer dans l'historique
    const endTime = Date.now()
    const duration_ms = endTime - startTime

    await supabase.from('rappels_historique').insert({
      type: 'rappel_conducteurs_finisseurs',
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
        message: 'Rappel aux conducteurs pour finisseurs terminé',
        total_conducteurs: conducteursANotifier.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[rappel-conducteurs-finisseurs] ❌ Erreur globale:', error)
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
        type: 'rappel_conducteurs_finisseurs',
        execution_mode,
        triggered_by,
        nb_destinataires: 0,
        nb_succes: 0,
        nb_echecs: 0,
        error_message: errorMessage,
        duration_ms
      })
    } catch (histError) {
      console.error('[rappel-conducteurs-finisseurs] ❌ Erreur lors de l\'enregistrement dans l\'historique:', histError)
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
