import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { isTargetParisHour } from '../_shared/timezone.ts'
import { 
  generateEmailHtml, 
  createAlertBox, 
  createListItem, 
  createSectionTitle,
  createClosingMessage 
} from '../_shared/emailTemplate.ts'

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
  
  console.log(`[${executionId}] Demarrage rappel-chefs-lundi`)

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
        console.log(`[${executionId}] Pas lundi (jour=${day}), skipping`)
        return new Response(
          JSON.stringify({ 
            skipped: true, 
            reason: 'not_monday',
            day: day 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[${executionId}] Pas 8h Paris, skipping`)
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
      throw new Error('RESEND_API_KEY non configure')
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

    console.log(`[${executionId}] Semaine precedente: ${previousWeek}`)

    // 1. Récupérer tous les chefs
    const { data: chefRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'chef')

    if (rolesError) {
      console.error(`[${executionId}] Erreur recuperation roles:`, rolesError)
      throw rolesError
    }

    const chefIds = chefRoles.map(r => r.user_id)
    console.log(`[${executionId}] ${chefIds.length} chefs trouves`)

    if (chefIds.length === 0) {
      console.log(`[${executionId}] Aucun chef trouve`)
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
      console.error(`[${executionId}] Erreur recuperation chefs:`, chefsError)
      throw chefsError
    }

    console.log(`[${executionId}] ${chefsData.length} profils chefs recuperes`)

    // 3. Récupérer les fiches de S-1 non finalisées
    const { data: fichesData, error: fichesError } = await supabase
      .from('fiches')
      .select('id, statut, chantier_id, user_id')
      .in('user_id', chefIds)
      .eq('semaine', previousWeek)
      .in('statut', ['BROUILLON', 'EN_SIGNATURE'])

    if (fichesError) {
      console.error(`[${executionId}] Erreur recuperation fiches:`, fichesError)
      throw fichesError
    }

    console.log(`[${executionId}] ${fichesData.length} fiches S-1 non finalisees`)

    let noPendingFiches = false
    if (fichesData.length === 0) {
      console.log(`[${executionId}] Aucune fiche en retard`)
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
        console.error(`[${executionId}] Erreur recuperation chantiers:`, chantiersError)
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

    console.log(`[${executionId}] ${chefsWithFiches.length} chefs a notifier`)

    // Mode test manuel: si aucun chef à notifier ET mode manuel, créer un payload de test
    if (execution_mode === 'manual' && chefsWithFiches.length === 0 && triggered_by) {
      console.log(`[${executionId}] Mode test: envoi d'un payload de demonstration`)
      
      // Récupérer l'utilisateur qui a déclenché le test
      const { data: testUser, error: testUserError } = await supabase
        .from('utilisateurs')
        .select('id, email, prenom, nom')
        .eq('id', triggered_by)
        .single()
      
      if (testUserError) {
        console.error(`[${executionId}] Impossible de recuperer l'utilisateur test:`, testUserError)
      } else if (testUser) {
        // Ajouter un chef fictif avec des données de test
        chefsWithFiches.push({
          chef_id: testUser.id,
          chef_email: testUser.email,
          chef_prenom: testUser.prenom || 'Test',
          chef_nom: testUser.nom || 'User',
          nb_fiches: 2,
          chantiers: [
            { chantier_nom: 'Chantier Test A', semaine: previousWeek },
            { chantier_nom: 'Chantier Test B', semaine: previousWeek }
          ]
        })
        
        console.log(`[${executionId}] Payload test cree pour ${testUser.email}`)
      }
    }

    // 6. Envoyer les emails via Resend
    let successCount = 0
    let failureCount = 0
    const details: any[] = []

    for (const chef of chefsWithFiches) {
      try {
        // Construire la liste des chantiers
        const chantiersListHtml = chef.chantiers.map(c => createListItem(c.chantier_nom)).join('')

        const emailContent = `
          ${createAlertBox(
            `<strong>Attention :</strong> Vous avez <strong>${chef.nb_fiches} fiche(s)</strong> de la semaine precedente (<strong>${previousWeek}</strong>) qui n'ont pas encore ete validees.`,
            'error'
          )}
          
          ${createSectionTitle('Chantiers concernes')}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            ${chantiersListHtml}
          </table>
          
          ${createClosingMessage('Merci de finaliser ces fiches <strong>rapidement</strong> afin d\'eviter tout retard dans le traitement des heures.')}
        `

        const emailHtml = generateEmailHtml(
          chef.chef_prenom || 'Chef',
          emailContent,
          'https://crew-time-sheet.lovable.app/',
          'Finaliser mes fiches',
          'alerte'
        )

        console.log(`[${executionId}] Envoi email a ${chef.chef_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: [chef.chef_email],
          subject: `Fiches de la semaine derniere (${previousWeek}) non validees`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[${executionId}] Erreur Resend pour ${chef.chef_email}:`, emailError)
          throw emailError
        }

        console.log(`[${executionId}] Email envoye a ${chef.chef_prenom} ${chef.chef_nom}`, emailResult)
        successCount++
        details.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          email: chef.chef_email,
          success: true,
        })
      } catch (emailError) {
        console.error(`[${executionId}] Erreur envoi pour ${chef.chef_prenom} ${chef.chef_nom}:`, emailError)
        failureCount++
        details.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          email: chef.chef_email,
          success: false,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        })
      }
    }

    // 7. Enregistrer dans l'historique
    const duration_ms = Date.now() - startTime

    await supabase.from('rappels_historique').insert({
      type: 'rappel_chefs_lundi',
      execution_mode,
      triggered_by,
      nb_destinataires: chefsWithFiches.length,
      nb_succes: successCount,
      nb_echecs: failureCount,
      duration_ms,
      details: {
        semaine_precedente: previousWeek,
        chefs: details,
      },
    })

    console.log(`[${executionId}] Termine: ${successCount} succes, ${failureCount} echecs`)

    return new Response(
      JSON.stringify({
        success: true,
        notified: chefsWithFiches.length,
        successes: successCount,
        failures: failureCount,
        semaine_precedente: previousWeek,
        details,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[${executionId}] Erreur globale:`, error)

    // Enregistrer l'erreur
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase.from('rappels_historique').insert({
      type: 'rappel_chefs_lundi',
      execution_mode: 'cron',
      nb_destinataires: 0,
      nb_succes: 0,
      nb_echecs: 0,
      error_message: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    })

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
