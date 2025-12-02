import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('[rappel-chefs] 🚀 Démarrage du rappel aux chefs...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!
    const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log de l'URL cible pour diagnostic
    try {
      const url = new URL(n8nWebhookUrl)
      console.log(`[rappel-chefs] 🎯 URL cible: ${url.host}${url.pathname}`)
    } catch (e) {
      console.error(`[rappel-chefs] ⚠️ URL webhook invalide: ${n8nWebhookUrl}`)
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

    // ÉTAPE 7: Envoyer les notifications via n8n
    console.log(`[rappel-chefs] 📧 Envoi de ${chefsANotifier.length} notification(s) via n8n...`)

    const results = []
    for (const chef of chefsANotifier) {
      try {
        const webhookPayload = {
          type: 'rappel_chef',
          chef_id: chef.chef_id,
          chef_nom: chef.chef_nom,
          chef_prenom: chef.chef_prenom,
          chef_email: chef.chef_email,
          // Duplication pour compatibilité n8n
          conducteur_id: chef.chef_id,
          conducteur_nom: chef.chef_nom,
          conducteur_prenom: chef.chef_prenom,
          conducteur_email: chef.chef_email,
          nb_fiches: chef.nb_fiches_en_cours,
          items: chef.chantiers.map(chantier_nom => ({
            chantier_nom,
            semaine: currentWeek
          })),
          appBaseUrl: 'https://crew-time-sheet.lovable.app/',
          timestamp: new Date().toISOString()
        }

        console.log('[rappel-chefs] 📤 Payload envoyé:', JSON.stringify(webhookPayload, null, 2))

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Secret': n8nWebhookSecret,
          },
          body: JSON.stringify(webhookPayload),
        })

        const responseText = await webhookResponse.text()
        console.log(`[rappel-chefs] 📥 Réponse n8n: status=${webhookResponse.status}, body=${responseText}`)

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error(`[rappel-chefs] ❌ Réponse n8n (${webhookResponse.status}): ${errorText}`)
          throw new Error(`Erreur webhook: ${webhookResponse.status} - ${errorText}`)
        }

        console.log(`[rappel-chefs] ✅ Notification envoyée pour ${chef.chef_prenom} ${chef.chef_nom}`)
        results.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          success: true
        })
      } catch (webhookError) {
        console.error(`[rappel-chefs] ❌ Erreur webhook pour ${chef.chef_prenom} ${chef.chef_nom}:`, webhookError)
        const errorMessage = webhookError instanceof Error ? webhookError.message : String(webhookError)
        results.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
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
