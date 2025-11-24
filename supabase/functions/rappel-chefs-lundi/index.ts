import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
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

    // Init Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

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

    // 6. Envoyer les notifications via n8n
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    const n8nSecret = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (!n8nWebhookUrl || !n8nSecret) {
      throw new Error('N8N_WEBHOOK_URL ou N8N_WEBHOOK_SECRET non configuré')
    }

    // Log de l'URL cible pour diagnostic
    try {
      const url = new URL(n8nWebhookUrl)
      console.log(`[${executionId}] 🎯 URL cible: ${url.host}${url.pathname}`)
    } catch (e) {
      console.error(`[${executionId}] ⚠️ URL webhook invalide: ${n8nWebhookUrl}`)
    }

    let successCount = 0
    let failureCount = 0
    const details: any[] = []

    for (const chef of chefsWithFiches) {
      const payload = {
        type: 'rappel_chef_lundi',
        chef_id: chef.chef_id,
        chef_nom: chef.chef_nom,
        chef_prenom: chef.chef_prenom,
        chef_email: chef.chef_email,
        nb_fiches: chef.nb_fiches,
        items: chef.chantiers,
        timestamp: new Date().toISOString(),
      }

      try {
        console.log(`[${executionId}] 📤 Payload envoyé:`, JSON.stringify(payload, null, 2))

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Secret': n8nSecret,
          },
          body: JSON.stringify(payload),
        })

        const responseText = await webhookResponse.text()
        console.log(`[${executionId}] 📥 Réponse n8n: status=${webhookResponse.status}, body=${responseText}`)

        if (webhookResponse.ok) {
          console.log(`[${executionId}] ✅ Notification envoyée à ${chef.chef_email}`)
          successCount++
          details.push({
            chef_email: chef.chef_email,
            status: 'success',
            nb_fiches: chef.nb_fiches,
          })
        } else {
          console.error(`[${executionId}] ❌ Réponse n8n (${webhookResponse.status}): ${responseText}`)
          failureCount++
          details.push({
            chef_email: chef.chef_email,
            status: 'error',
            error: responseText,
          })
        }
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
