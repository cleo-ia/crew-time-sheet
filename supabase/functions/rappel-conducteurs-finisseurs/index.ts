import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('[rappel-conducteurs-finisseurs] 🚀 Démarrage du rappel aux conducteurs pour finisseurs...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!
    const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log de l'URL cible pour diagnostic
    try {
      const url = new URL(n8nWebhookUrl)
      console.log(`[rappel-conducteurs-finisseurs] 🎯 URL cible: ${url.host}${url.pathname}`)
    } catch (e) {
      console.error(`[rappel-conducteurs-finisseurs] ⚠️ URL webhook invalide: ${n8nWebhookUrl}`)
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

    // ÉTAPE 4: Envoyer les notifications via n8n
    console.log(`[rappel-conducteurs-finisseurs] 📧 Envoi de ${conducteursANotifier.length} notification(s) via n8n...`)

    const results = []
    for (const conducteur of conducteursANotifier) {
      try {
        const webhookPayload = {
          type: 'rappel_conducteur_finisseurs',
          conducteur_id: conducteur.conducteur_id,
          conducteur_nom: conducteur.conducteur_nom,
          conducteur_prenom: conducteur.conducteur_prenom,
          conducteur_email: conducteur.conducteur_email,
          nb_finisseurs_en_attente: conducteur.nb_finisseurs_en_attente,
          finisseurs: conducteur.finisseurs,
          semaine: currentWeek,
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
          console.error(`[rappel-conducteurs-finisseurs] ❌ Réponse n8n (${webhookResponse.status}): ${errorText}`)
          throw new Error(`Erreur webhook: ${webhookResponse.status} - ${errorText}`)
        }

        console.log(`[rappel-conducteurs-finisseurs] ✅ Notification envoyée pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          success: true
        })
      } catch (webhookError) {
        console.error(`[rappel-conducteurs-finisseurs] ❌ Erreur webhook pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}:`, webhookError)
        const errorMessage = webhookError instanceof Error ? webhookError.message : String(webhookError)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
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