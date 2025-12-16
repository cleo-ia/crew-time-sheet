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
    .list { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; }
    .list ul { margin: 0; padding-left: 20px; }
    .list li { margin: 8px 0; }
    .chantier-item { background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0; }
    .chantier-name { font-weight: bold; color: #374151; }
    .chantier-details { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .button:hover { background: #ea580c; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; padding: 16px; }
    .footer a { color: #f97316; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 DIVA - Fiches à valider</h1>
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
          <div class="chantier-item">
            <div class="chantier-name">🏗️ ${ch.nom}</div>
            <div class="chantier-details">${ch.nb_fiches} fiche(s) • Chef(s) : ${ch.chefs.join(', ') || 'N/A'}</div>
          </div>
        `).join('')

        const emailContent = `
          <p>Vous avez <strong>${conducteur.nb_fiches_en_attente} fiche(s)</strong> transmise(s) par vos chefs en attente de validation.</p>
          <div class="list">
            <p><strong>Détail par chantier :</strong></p>
            ${chantiersListHtml}
          </div>
          <p>Merci de valider ces fiches dès que possible.</p>
        `

        const emailHtml = generateEmailHtml(
          conducteur.conducteur_prenom || 'Conducteur',
          emailContent,
          'https://crew-time-sheet.lovable.app/validation-conducteur',
          '✅ Valider les fiches'
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
