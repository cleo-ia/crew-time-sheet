import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { isTargetParisHour } from '../_shared/timezone.ts'
import { 
  generateEmailHtml, 
  createAlertBox, 
  createPersonCard, 
  createSectionTitle,
  createClosingMessage 
} from '../_shared/emailTemplate.ts'

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
    console.log('[rappel-conducteurs-finisseurs] Demarrage du rappel aux conducteurs pour finisseurs...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY non configure')
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
      console.log('[rappel-conducteurs-finisseurs] Pas encore 12h a Paris, skip')
      return new Response(
        JSON.stringify({ message: 'Not target hour', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (force) {
      console.log('[rappel-conducteurs-finisseurs] Mode force active - bypass de la verification horaire')
    }

    // Calculer la semaine ISO actuelle
    const now = new Date()
    const year = now.getFullYear()
    const weekNumber = getWeekNumber(now)
    const currentWeek = `${year}-S${String(weekNumber).padStart(2, '0')}`
    console.log(`[rappel-conducteurs-finisseurs] Semaine courante: ${currentWeek}`)

    // ÉTAPE 1: Récupérer les user_id des conducteurs
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'conducteur')

    if (rolesError) {
      console.error('[rappel-conducteurs-finisseurs] Erreur lors de la recuperation des roles:', rolesError)
      throw rolesError
    }

    if (!rolesData || rolesData.length === 0) {
      console.log('[rappel-conducteurs-finisseurs] Aucun conducteur trouve')
      return new Response(
        JSON.stringify({ message: 'Aucun conducteur trouve' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const conducteurIds = rolesData.map(r => r.user_id)
    console.log(`[rappel-conducteurs-finisseurs] ${conducteurIds.length} conducteur(s) trouve(s)`)

    // ÉTAPE 2: Récupérer les profiles de ces conducteurs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', conducteurIds)

    if (profilesError) {
      console.error('[rappel-conducteurs-finisseurs] Erreur lors de la recuperation des profiles:', profilesError)
      throw profilesError
    }

    // Créer un map id -> profile
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
    console.log(`[rappel-conducteurs-finisseurs] ${profilesMap.size} profile(s) recupere(s)`)

    const conducteursANotifier: ConducteurWithFinisseurs[] = []

    // ÉTAPE 3: Pour chaque conducteur, traiter ses finisseurs affectés
    for (const conducteurId of conducteurIds) {
      const profile = profilesMap.get(conducteurId)
      if (!profile) {
        console.warn(`[rappel-conducteurs-finisseurs] Profile non trouve pour conducteur ${conducteurId}`)
        continue
      }

      // Récupérer les affectations actives de finisseurs pour ce conducteur
      const { data: affectations, error: affectationsError } = await supabase
        .from('affectations_finisseurs')
        .select('finisseur_id')
        .eq('conducteur_id', conducteurId)
        .or('date_fin.is.null,date_fin.gte.' + now.toISOString().split('T')[0])

      if (affectationsError) {
        console.error(`[rappel-conducteurs-finisseurs] Erreur affectations pour ${profile.first_name} ${profile.last_name}:`, affectationsError)
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
        console.error(`[rappel-conducteurs-finisseurs] Erreur fiches pour ${profile.first_name} ${profile.last_name}:`, fichesError)
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
        console.error(`[rappel-conducteurs-finisseurs] Erreur profiles finisseurs:`, finisseursProfilesError)
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

      console.log(`[rappel-conducteurs-finisseurs] Conducteur ${profile.first_name} ${profile.last_name} : ${finisseursDetails.length} finisseur(s) avec fiches non finalisees`)
    }

    if (conducteursANotifier.length === 0) {
      console.log('[rappel-conducteurs-finisseurs] Aucune fiche en attente')
      
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
        JSON.stringify({ message: 'Aucun conducteur a notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ÉTAPE 4: Envoyer les emails via Resend
    console.log(`[rappel-conducteurs-finisseurs] Envoi de ${conducteursANotifier.length} email(s) via Resend...`)

    const results = []
    for (const conducteur of conducteursANotifier) {
      try {
        // Construire la liste des finisseurs
        const finisseursListHtml = conducteur.finisseurs.map(f => 
          createPersonCard(f.finisseur_prenom, f.finisseur_nom, f.nb_fiches)
        ).join('')

        const emailContent = `
          ${createAlertBox(
            `<strong>${conducteur.nb_finisseurs_en_attente} finisseur(s)</strong> ont des fiches non finalisees pour la semaine <strong>${currentWeek}</strong>.`,
            'warning'
          )}
          
          ${createSectionTitle('Finisseurs concernes')}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            ${finisseursListHtml}
          </table>
          
          ${createClosingMessage('Merci de verifier l\'avancement et de relancer ces finisseurs si necessaire.')}
        `

        const emailHtml = generateEmailHtml(
          conducteur.conducteur_prenom || 'Conducteur',
          emailContent,
          'https://crew-time-sheet.lovable.app/validation-conducteur',
          'Voir les fiches',
          'rappel'
        )

        console.log(`[rappel-conducteurs-finisseurs] Envoi email a ${conducteur.conducteur_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: [conducteur.conducteur_email],
          subject: `${conducteur.nb_finisseurs_en_attente} finisseur(s) avec fiches non finalisees`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[rappel-conducteurs-finisseurs] Erreur Resend pour ${conducteur.conducteur_email}:`, emailError)
          throw emailError
        }

        console.log(`[rappel-conducteurs-finisseurs] Email envoye a ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom} (${conducteur.conducteur_email})`, emailResult)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          email: conducteur.conducteur_email,
          success: true
        })
      } catch (emailError) {
        console.error(`[rappel-conducteurs-finisseurs] Erreur envoi email pour ${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
        results.push({
          conducteur: `${conducteur.conducteur_prenom} ${conducteur.conducteur_nom}`,
          email: conducteur.conducteur_email,
          success: false,
          error: errorMessage
        })
      }
    }

    console.log(`[rappel-conducteurs-finisseurs] Traitement termine: ${results.filter(r => r.success).length}/${results.length} succes`)

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
      duration_ms,
      details: {
        semaine: currentWeek,
        conducteurs: conducteursANotifier.map(c => ({
          nom: `${c.conducteur_prenom} ${c.conducteur_nom}`,
          email: c.conducteur_email,
          nb_finisseurs: c.nb_finisseurs_en_attente,
          finisseurs: c.finisseurs.map(f => `${f.finisseur_prenom} ${f.finisseur_nom}`)
        })),
        results
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        semaine: currentWeek,
        nb_conducteurs_notifies: conducteursANotifier.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[rappel-conducteurs-finisseurs] Erreur globale:', error)
    
    // Enregistrer l'erreur dans l'historique
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase.from('rappels_historique').insert({
      type: 'rappel_conducteurs_finisseurs',
      execution_mode: 'cron',
      nb_destinataires: 0,
      nb_succes: 0,
      nb_echecs: 0,
      error_message: error instanceof Error ? error.message : String(error)
    })
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
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
