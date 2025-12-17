import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
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
    console.log('[rappel-chefs] Demarrage du rappel aux chefs...')

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
      console.log('[rappel-chefs] Pas encore 12h a Paris, skip')
      return new Response(
        JSON.stringify({ message: 'Not target hour', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (force) {
      console.log('[rappel-chefs] Mode force active - bypass de la verification horaire')
    }

    // Récupérer la semaine en cours (format YYYY-Sww)
    const now = new Date()
    const year = now.getFullYear()
    const weekNumber = getWeekNumber(now)
    const currentWeek = `${year}-S${String(weekNumber).padStart(2, '0')}`

    console.log(`[rappel-chefs] Semaine en cours : ${currentWeek}`)

    // ÉTAPE 1: Récupérer les user_id des chefs
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'chef')

    if (rolesError) {
      console.error('[rappel-chefs] Erreur lors de la recuperation des roles:', rolesError)
      throw rolesError
    }

    if (!rolesData || rolesData.length === 0) {
      console.log('[rappel-chefs] Aucun chef trouve')
      return new Response(
        JSON.stringify({ message: 'Aucun chef trouve' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const chefIds = rolesData.map(r => r.user_id)
    console.log(`[rappel-chefs] ${chefIds.length} chef(s) trouve(s)`)

    // ÉTAPE 2: Récupérer les profiles de ces chefs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', chefIds)

    if (profilesError) {
      console.error('[rappel-chefs] Erreur lors de la recuperation des profiles:', profilesError)
      throw profilesError
    }

    // Créer un map id -> profile
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
    console.log(`[rappel-chefs] ${profilesMap.size} profile(s) recupere(s)`)

    // ÉTAPE 3: Récupérer toutes les fiches non finalisées pour ces chefs
    const { data: fichesData, error: fichesError } = await supabase
      .from('fiches')
      .select('id, statut, chantier_id, user_id')
      .in('user_id', chefIds)
      .eq('semaine', currentWeek)
      .in('statut', ['BROUILLON', 'EN_SIGNATURE'])

    if (fichesError) {
      console.error('[rappel-chefs] Erreur lors de la recuperation des fiches:', fichesError)
      throw fichesError
    }

    console.log(`[rappel-chefs] ${fichesData?.length || 0} fiche(s) en cours trouvee(s)`)

    if (!fichesData || fichesData.length === 0) {
      console.log('[rappel-chefs] Tous les chefs ont finalise leurs fiches')
      return new Response(
        JSON.stringify({ message: 'Aucun chef a notifier' }),
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
      console.error('[rappel-chefs] Erreur lors de la recuperation des chantiers:', chantiersError)
      throw chantiersError
    }

    // Créer un map chantier_id -> nom
    const chantiersMap = new Map(chantiersData?.map(c => [c.id, c.nom]) || [])
    console.log(`[rappel-chefs] ${chantiersMap.size} chantier(s) recupere(s)`)

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
        console.warn(`[rappel-chefs] Profile non trouve pour chef ${chefId}`)
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

      console.log(`[rappel-chefs] Chef ${profile.first_name} ${profile.last_name} : ${fiches.length} fiche(s) en cours sur ${chantiers.length} chantier(s)`)
    }

    if (chefsANotifier.length === 0) {
      console.log('[rappel-chefs] Aucun chef a notifier apres filtrage')
      return new Response(
        JSON.stringify({ message: 'Aucun chef a notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ÉTAPE 7: Envoyer les emails via Resend
    console.log(`[rappel-chefs] Envoi de ${chefsANotifier.length} email(s) via Resend...`)

    const results = []
    for (const chef of chefsANotifier) {
      try {
        // Construire la liste des chantiers
        const chantiersListHtml = chef.chantiers.map(c => createListItem(c)).join('')
        
        const emailContent = `
          ${createAlertBox(
            `Vous avez <strong>${chef.nb_fiches_en_cours} fiche(s)</strong> non finalisee(s) pour la semaine <strong>${currentWeek}</strong>.`,
            'warning'
          )}
          
          ${createSectionTitle('Chantiers concernes')}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            ${chantiersListHtml}
          </table>
          
          ${createClosingMessage('Merci de finaliser vos fiches des que possible afin de permettre la validation par votre conducteur.')}
        `

        const emailHtml = generateEmailHtml(
          chef.chef_prenom || 'Chef',
          emailContent,
          'https://crew-time-sheet.lovable.app/',
          'Acceder a mes fiches',
          'rappel'
        )

        console.log(`[rappel-chefs] Envoi email a ${chef.chef_email}...`)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: ['tom.genin@groupe-engo.com'], // TEMPORAIRE POUR TEST - remettre [chef.chef_email]
          subject: `Rappel - ${chef.nb_fiches_en_cours} fiche(s) en attente de validation`,
          html: emailHtml,
        })

        if (emailError) {
          console.error(`[rappel-chefs] Erreur Resend pour ${chef.chef_email}:`, emailError)
          throw emailError
        }

        console.log(`[rappel-chefs] Email envoye a ${chef.chef_prenom} ${chef.chef_nom} (${chef.chef_email})`, emailResult)
        results.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          email: chef.chef_email,
          success: true
        })
      } catch (emailError) {
        console.error(`[rappel-chefs] Erreur envoi email pour ${chef.chef_prenom} ${chef.chef_nom}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
        results.push({
          chef: `${chef.chef_prenom} ${chef.chef_nom}`,
          email: chef.chef_email,
          success: false,
          error: errorMessage
        })
      }
    }

    console.log(`[rappel-chefs] Traitement termine: ${results.filter(r => r.success).length}/${results.length} succes`)

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
      duration_ms,
      details: {
        semaine: currentWeek,
        chefs: chefsANotifier.map(c => ({
          nom: `${c.chef_prenom} ${c.chef_nom}`,
          email: c.chef_email,
          nb_fiches: c.nb_fiches_en_cours,
          chantiers: c.chantiers
        })),
        results
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        semaine: currentWeek,
        nb_chefs_notifies: chefsANotifier.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[rappel-chefs] Erreur globale:', error)
    
    // Enregistrer l'erreur dans l'historique
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase.from('rappels_historique').insert({
      type: 'rappel_chefs',
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
