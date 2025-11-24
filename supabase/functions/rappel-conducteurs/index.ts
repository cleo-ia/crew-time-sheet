import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('[rappel-conducteurs] 🚀 Démarrage du rappel aux conducteurs...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!
    const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log de l'URL cible pour diagnostic
    try {
      const url = new URL(n8nWebhookUrl)
      console.log(`[rappel-conducteurs] 🎯 URL cible: ${url.host}${url.pathname}`)
    } catch (e) {
      console.error(`[rappel-conducteurs] ⚠️ URL webhook invalide: ${n8nWebhookUrl}`)
    }

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

    // ÉTAPE 4: Envoyer les notifications via n8n
    console.log(`[rappel-conducteurs] 📧 Envoi de ${conducteursANotifier.length} notification(s) via n8n...`)

    const results = []
    for (const conducteur of conducteursANotifier) {
      try {
        // Calculer la semaine ISO pour le payload
        const now = new Date()
        const year = now.getFullYear()
        const weekNumber = getWeekNumber(now)
        const currentWeek = `${year}-S${String(weekNumber).padStart(2, '0')}`

        const webhookPayload = {
          type: 'rappel_conducteur',
          conducteur_id: conducteur.conducteur_id,
          conducteur_nom: conducteur.conducteur_nom,
          conducteur_prenom: conducteur.conducteur_prenom,
          conducteur_email: conducteur.conducteur_email,
          items: conducteur.chantiers.map(ch => ({
            chantier_nom: ch.nom,
            semaine: currentWeek,
            nb_fiches: ch.nb_fiches
          })),
          timestamp: new Date().toISOString()
        }

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Secret': n8nWebhookSecret,
          },
          body: JSON.stringify(webhookPayload),
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error(`[rappel-conducteurs] ❌ Réponse n8n (${webhookResponse.status}): ${errorText}`)
          throw new Error(`Erreur webhook: ${webhookResponse.status} - ${errorText}`)
        }

        console.log(`[rappel-conducteurs] ✅ Notification envoyée pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          success: true
        })
      } catch (webhookError) {
        console.error(`[rappel-conducteurs] ❌ Erreur webhook pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}:`, webhookError)
        const errorMessage = webhookError instanceof Error ? webhookError.message : String(webhookError)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
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
