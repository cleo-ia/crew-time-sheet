import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { isTargetParisHour } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncResult {
  employe_id: string
  employe_nom: string
  action: 'copied' | 'created' | 'deleted' | 'skipped'
  details: string
}

// Heures par jour de la semaine (conformes à la logique métier)
// Lundi=1, Mardi=2, Mercredi=3, Jeudi=4, Vendredi=5
const HEURES_PAR_JOUR: Record<number, number> = {
  1: 8,  // Lundi
  2: 8,  // Mardi
  3: 8,  // Mercredi
  4: 8,  // Jeudi
  5: 7,  // Vendredi
}

// Obtenir le jour de la semaine (1=Lundi, 5=Vendredi) à partir d'une date
function getDayOfWeekNumber(dateStr: string): number {
  const date = new Date(dateStr)
  const day = date.getUTCDay()
  // getUTCDay: 0=Dimanche, 1=Lundi... → on veut 1=Lundi, 7=Dimanche
  return day === 0 ? 7 : day
}

// Calculer le total d'heures pour une liste de dates
function calculateTotalHeures(jours: string[]): number {
  return jours.reduce((sum, jour) => {
    const dayNum = getDayOfWeekNumber(jour)
    return sum + (HEURES_PAR_JOUR[dayNum] || 0)
  }, 0)
}

// Obtenir les heures pour un jour spécifique
function getHeuresForDay(dateStr: string): number {
  const dayNum = getDayOfWeekNumber(dateStr)
  return HEURES_PAR_JOUR[dayNum] || 8
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    console.log('[sync-planning-to-teams] Démarrage de la synchronisation...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // deno-lint-ignore no-explicit-any
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any

    // Lire le body pour récupérer execution_mode, triggered_by, force et semaine_override
    let execution_mode = 'cron'
    let triggered_by = null
    let force = false
    let semaine_override = null
    try {
      const body = await req.json()
      execution_mode = body.execution_mode || 'cron'
      triggered_by = body.triggered_by || null
      force = body.force || false
      semaine_override = body.semaine || null
    } catch {
      // Body vide ou invalide, on garde les valeurs par défaut
    }

    // Vérifier si on est à 5h Paris (sauf si force = true)
    if (!force && !isTargetParisHour(5)) {
      console.log('[sync-planning-to-teams] Pas encore 5h à Paris, skip')
      return new Response(
        JSON.stringify({ message: 'Not target hour', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (force) {
      console.log('[sync-planning-to-teams] Mode force activé - bypass de la vérification horaire')
    }

    // Calculer la semaine courante (S) et la semaine précédente (S-1)
    const currentWeek = semaine_override || getCurrentWeek()
    const previousWeek = getPreviousWeek(currentWeek)

    console.log(`[sync-planning-to-teams] Semaine courante: ${currentWeek}, Semaine précédente: ${previousWeek}`)

    // Récupérer toutes les entreprises avec planning
    const { data: entreprises, error: entError } = await supabase
      .from('planning_affectations')
      .select('entreprise_id')
      .eq('semaine', currentWeek)
    
    if (entError) throw entError

    const uniqueEntreprises = [...new Set((entreprises || []).map((e: { entreprise_id: string }) => e.entreprise_id))]
    console.log(`[sync-planning-to-teams] ${uniqueEntreprises.length} entreprise(s) avec planning pour ${currentWeek}`)

    const allResults: SyncResult[] = []
    let totalCopied = 0
    let totalCreated = 0
    let totalDeleted = 0

    let skippedEntreprises = 0

    for (const entrepriseId of uniqueEntreprises) {
      console.log(`[sync-planning-to-teams] Traitement entreprise ${entrepriseId}...`)
      
      // Vérifier si le planning est validé pour cette entreprise/semaine
      const { data: validation } = await supabase
        .from('planning_validations')
        .select('id')
        .eq('entreprise_id', entrepriseId)
        .eq('semaine', currentWeek)
        .maybeSingle()

      if (!validation) {
        console.log(`[sync-planning-to-teams] Entreprise ${entrepriseId}: planning non validé, skip`)
        skippedEntreprises++
        continue
      }

      console.log(`[sync-planning-to-teams] Entreprise ${entrepriseId}: planning validé, synchronisation...`)
      
      const { results, stats } = await syncEntreprise(
        supabase, 
        entrepriseId as string, 
        currentWeek, 
        previousWeek
      )
      
      allResults.push(...results)
      totalCopied += stats.copied
      totalCreated += stats.created
      totalDeleted += stats.deleted
    }

    console.log(`[sync-planning-to-teams] ${skippedEntreprises} entreprise(s) ignorée(s) (planning non validé)`)

    const endTime = Date.now()
    const duration_ms = endTime - startTime

    // Enregistrer dans l'historique
    await supabase.from('rappels_historique').insert({
      type: 'sync_planning_teams',
      execution_mode,
      triggered_by,
      nb_destinataires: allResults.length,
      nb_succes: totalCopied + totalCreated,
      nb_echecs: 0,
      duration_ms,
      details: {
        semaine: currentWeek,
        semaine_precedente: previousWeek,
        entreprises: uniqueEntreprises.length,
        stats: { copied: totalCopied, created: totalCreated, deleted: totalDeleted },
        results: allResults.slice(0, 50) // Limiter pour éviter payload trop gros
      }
    })

    console.log(`[sync-planning-to-teams] Terminé: ${totalCopied} copiés, ${totalCreated} créés, ${totalDeleted} supprimés`)

    return new Response(
      JSON.stringify({
        success: true,
        semaine: currentWeek,
        stats: { copied: totalCopied, created: totalCreated, deleted: totalDeleted },
        duration_ms
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[sync-planning-to-teams] Erreur globale:', error)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // deno-lint-ignore no-explicit-any
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any
    
    await supabase.from('rappels_historique').insert({
      type: 'sync_planning_teams',
      execution_mode: 'cron',
      nb_destinataires: 0,
      nb_succes: 0,
      nb_echecs: 1,
      error_message: error instanceof Error ? error.message : String(error)
    })
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// deno-lint-ignore no-explicit-any
async function syncEntreprise(
  supabase: any,
  entrepriseId: string,
  currentWeek: string,
  previousWeek: string
) {
  const results: SyncResult[] = []
  const stats = { copied: 0, created: 0, deleted: 0 }

  // 1. Récupérer le planning S pour cette entreprise
  const { data: planningData, error: planningError } = await supabase
    .from('planning_affectations')
    .select(`
      *,
      employe:utilisateurs!planning_affectations_employe_id_fkey(id, prenom, nom)
    `)
    .eq('semaine', currentWeek)
    .eq('entreprise_id', entrepriseId)

  if (planningError) throw planningError

  // Grouper par couple (employé, chantier) pour gérer les multi-chantiers
  // deno-lint-ignore no-explicit-any
  const planningByEmployeChantier = new Map<string, any[]>()
  // deno-lint-ignore no-explicit-any
  for (const aff of (planningData || []) as any[]) {
    const key = `${aff.employe_id}|${aff.chantier_id}`
    if (!planningByEmployeChantier.has(key)) {
      planningByEmployeChantier.set(key, [])
    }
    planningByEmployeChantier.get(key)!.push(aff)
  }

  console.log(`[sync-planning-to-teams] ${planningByEmployeChantier.size} couple(s) employé-chantier dans le planning`)

  // 2. Récupérer les affectations existantes S-1 (pour comparaison)
  const { data: affectationsS1Chef } = await supabase
    .from('affectations_jours_chef')
    .select('*')
    .eq('semaine', previousWeek)
    .eq('entreprise_id', entrepriseId)

  const { data: affectationsS1Finisseurs } = await supabase
    .from('affectations_finisseurs_jours')
    .select('*')
    .eq('semaine', previousWeek)

  // Grouper S-1 par couple (employé, chantier)
  const s1ByEmployeChantier = new Map<string, { jours: string[] }>()
  
  // deno-lint-ignore no-explicit-any
  for (const aff of (affectationsS1Chef || []) as any[]) {
    const key = `${aff.macon_id}|${aff.chantier_id}`
    if (!s1ByEmployeChantier.has(key)) {
      s1ByEmployeChantier.set(key, { jours: [] })
    }
    s1ByEmployeChantier.get(key)!.jours.push(aff.jour)
  }
  
  // deno-lint-ignore no-explicit-any
  for (const aff of (affectationsS1Finisseurs || []) as any[]) {
    const key = `${aff.finisseur_id}|${aff.chantier_id}`
    if (!s1ByEmployeChantier.has(key)) {
      s1ByEmployeChantier.set(key, { jours: [] })
    }
    s1ByEmployeChantier.get(key)!.jours.push(aff.date)
  }

  // 3. Récupérer les chantiers pour savoir s'ils ont un chef
  // deno-lint-ignore no-explicit-any
  const chantierIds = [...new Set((planningData || []).map((a: any) => a.chantier_id))]
  const { data: chantiersData } = await supabase
    .from('chantiers')
    .select('id, chef_id, conducteur_id, entreprise_id')
    .in('id', chantierIds.length > 0 ? chantierIds : ['00000000-0000-0000-0000-000000000000'])

  // deno-lint-ignore no-explicit-any
  const chantiersMap = new Map((chantiersData || []).map((c: any) => [c.id, c]))

  // 4. Traiter chaque employé du planning
  for (const [key, affectations] of planningByEmployeChantier) {
    const [employeId, chantierId] = key.split('|')
    const employeNom = (affectations[0]?.employe?.prenom || '') + ' ' + (affectations[0]?.employe?.nom || '') || employeId
    // deno-lint-ignore no-explicit-any
    const joursPlanning = affectations.map((a: any) => a.jour).sort()
    const chantier = chantiersMap.get(chantierId)

    // Récupérer les affectations S-1 de ce couple employé-chantier
    const affS1 = s1ByEmployeChantier.get(key)
    
    // Comparer: mêmes jours pour ce couple employé-chantier?
    const isIdentique = affS1 && arraysEqual(affS1.jours.sort(), joursPlanning)

    if (isIdentique) {
      // COPIER les heures de S-1 vers S
      const copyResult = await copyFichesFromPreviousWeek(
        supabase, 
        employeId, 
        chantierId, 
        previousWeek, 
        currentWeek,
        chantier
      )
      
      if (copyResult.copied) {
        results.push({ employe_id: employeId, employe_nom: employeNom, action: 'copied', details: `Heures copiées de ${previousWeek}` })
        stats.copied++
      } else {
        results.push({ employe_id: employeId, employe_nom: employeNom, action: 'skipped', details: copyResult.reason })
      }
    } else {
      // CRÉER nouvelle affectation avec heures par jour spécifiques
      const createResult = await createNewAffectation(
        supabase,
        employeId,
        chantierId,
        currentWeek,
        joursPlanning,
        chantier,
        entrepriseId
      )
      
      if (createResult.created) {
        const totalHeures = calculateTotalHeures(joursPlanning)
        results.push({ employe_id: employeId, employe_nom: employeNom, action: 'created', details: `Nouvelle affectation créée avec ${totalHeures}h` })
        stats.created++
      } else {
        results.push({ employe_id: employeId, employe_nom: employeNom, action: 'skipped', details: createResult.reason })
      }
    }
  }

  // 5. PHASE NETTOYAGE: supprimer les affectations hors planning (SANS PROTECTION)
  const employeChantierInPlanning = new Set([...planningByEmployeChantier.keys()])
  
  // Récupérer les affectations S qui ne sont pas dans le planning
  const { data: existingChefS } = await supabase
    .from('affectations_jours_chef')
    .select('macon_id, chantier_id')
    .eq('semaine', currentWeek)
    .eq('entreprise_id', entrepriseId)

  const { data: existingFinisseursS } = await supabase
    .from('affectations_finisseurs_jours')
    .select('finisseur_id, chantier_id')
    .eq('semaine', currentWeek)

  // Identifier les couples employé-chantier à supprimer (dans affectations mais pas dans planning)
  // deno-lint-ignore no-explicit-any
  const toDeleteChef: string[] = [...new Set((existingChefS || [])
    .filter((a: any) => !employeChantierInPlanning.has(`${a.macon_id}|${a.chantier_id}`))
    .map((a: any) => `${a.macon_id}|${a.chantier_id}` as string))] as string[]

  // deno-lint-ignore no-explicit-any
  const toDeleteFinisseur: string[] = [...new Set((existingFinisseursS || [])
    .filter((a: any) => !employeChantierInPlanning.has(`${a.finisseur_id}|${a.chantier_id}`))
    .map((a: any) => `${a.finisseur_id}|${a.chantier_id}` as string))] as string[]

  // Supprimer les couples employé-chantier hors planning
  for (const key of toDeleteChef) {
    const [maconId, chantierId] = key.split('|')
    
    // Récupérer la fiche pour pouvoir la supprimer (liée au chantier spécifique)
    const { data: fiche } = await supabase
      .from('fiches')
      .select('id, total_heures')
      .eq('salarie_id', maconId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .maybeSingle()

    // Supprimer les affectations_jours_chef pour ce couple
    await supabase
      .from('affectations_jours_chef')
      .delete()
      .eq('macon_id', maconId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)

    // Supprimer les fiches_jours et la fiche associées
    if (fiche) {
      await supabase
        .from('fiches_jours')
        .delete()
        .eq('fiche_id', fiche.id)
      
      await supabase
        .from('fiches')
        .delete()
        .eq('id', fiche.id)
      
      console.log(`[sync-planning-to-teams] Supprimé macon ${maconId} chantier ${chantierId} avec fiche ${fiche.id} (${fiche.total_heures || 0}h)`)
    }

    results.push({ employe_id: maconId, employe_nom: maconId, action: 'deleted', details: `Hors planning chantier ${chantierId}` })
    stats.deleted++
  }

  for (const key of toDeleteFinisseur) {
    const [finisseurId, chantierId] = key.split('|')
    
    // Récupérer la fiche pour pouvoir la supprimer
    const { data: fiche } = await supabase
      .from('fiches')
      .select('id, total_heures')
      .eq('salarie_id', finisseurId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .maybeSingle()

    // Supprimer les affectations_finisseurs_jours pour ce couple
    await supabase
      .from('affectations_finisseurs_jours')
      .delete()
      .eq('finisseur_id', finisseurId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)

    // Supprimer les fiches_jours et la fiche associées
    if (fiche) {
      await supabase
        .from('fiches_jours')
        .delete()
        .eq('fiche_id', fiche.id)
      
      await supabase
        .from('fiches')
        .delete()
        .eq('id', fiche.id)
      
      console.log(`[sync-planning-to-teams] Supprimé finisseur ${finisseurId} chantier ${chantierId} avec fiche ${fiche.id} (${fiche.total_heures || 0}h)`)
    }

    results.push({ employe_id: finisseurId, employe_nom: finisseurId, action: 'deleted', details: `Hors planning chantier ${chantierId}` })
    stats.deleted++
  }

  return { results, stats }
}

// deno-lint-ignore no-explicit-any
async function copyFichesFromPreviousWeek(
  supabase: any,
  employeId: string,
  chantierId: string,
  previousWeek: string,
  currentWeek: string,
  // deno-lint-ignore no-explicit-any
  chantier: any
): Promise<{ copied: boolean; reason: string }> {
  
  // Vérifier si une fiche existe déjà pour S
  const { data: existingFiche } = await supabase
    .from('fiches')
    .select('id, total_heures, statut')
    .eq('salarie_id', employeId)
    .eq('chantier_id', chantierId)
    .eq('semaine', currentWeek)
    .maybeSingle()

  if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
    return { copied: false, reason: `Fiche existante avec ${existingFiche.total_heures}h` }
  }

  // Récupérer la fiche S-1
  const { data: ficheS1 } = await supabase
    .from('fiches')
    .select('id, user_id')
    .eq('salarie_id', employeId)
    .eq('chantier_id', chantierId)
    .eq('semaine', previousWeek)
    .maybeSingle()

  if (!ficheS1) {
    return { copied: false, reason: 'Pas de fiche S-1 à copier' }
  }

  // Récupérer les fiches_jours de S-1
  const { data: joursS1 } = await supabase
    .from('fiches_jours')
    .select('*')
    .eq('fiche_id', ficheS1.id)

  if (!joursS1 || joursS1.length === 0) {
    return { copied: false, reason: 'Pas de jours S-1 à copier' }
  }

  // Créer ou récupérer la fiche S
  let ficheIdS = existingFiche?.id

  if (!ficheIdS) {
    const { data: newFiche, error: newFicheError } = await supabase
      .from('fiches')
      .insert({
        salarie_id: employeId,
        chantier_id: chantierId,
        semaine: currentWeek,
        user_id: ficheS1.user_id,
        statut: 'BROUILLON',
        total_heures: 0
      })
      .select('id')
      .single()

    if (newFicheError) throw newFicheError
    ficheIdS = newFiche.id
  }

  // Calculer le décalage de jours entre S-1 et S
  const mondayS1 = parseISOWeek(previousWeek)
  const mondayS = parseISOWeek(currentWeek)
  const daysDiff = Math.round((mondayS.getTime() - mondayS1.getTime()) / (1000 * 60 * 60 * 24))

  // Copier les fiches_jours avec les nouvelles dates
  // deno-lint-ignore no-explicit-any
  for (const jourS1 of joursS1 as any[]) {
    const oldDate = new Date(jourS1.date)
    const newDate = new Date(oldDate.getTime() + daysDiff * 24 * 60 * 60 * 1000)
    const newDateStr = newDate.toISOString().split('T')[0]

    await supabase
      .from('fiches_jours')
      .upsert({
        fiche_id: ficheIdS,
        date: newDateStr,
        heures: jourS1.heures,
        heure_debut: jourS1.heure_debut,
        heure_fin: jourS1.heure_fin,
        pause_minutes: jourS1.pause_minutes,
        code_trajet: jourS1.code_trajet,
        HNORM: jourS1.HNORM,
        HI: jourS1.HI,
        T: jourS1.T,
        HP: jourS1.HP,
        total_jour: jourS1.total_jour,
        // Ne pas copier: signature_data, commentaire
      }, { onConflict: 'fiche_id,date' })
  }

  // Mettre à jour le total_heures de la fiche
  // deno-lint-ignore no-explicit-any
  const totalHeures = joursS1.reduce((sum: number, j: any) => sum + (j.heures || 0), 0)
  await supabase
    .from('fiches')
    .update({ total_heures: totalHeures, statut: 'BROUILLON' })
    .eq('id', ficheIdS)

  // Créer les affectations_jours_chef ou affectations_finisseurs_jours
  // deno-lint-ignore no-explicit-any
  const jours = joursS1.map((j: any) => {
    const oldDate = new Date(j.date)
    const newDate = new Date(oldDate.getTime() + daysDiff * 24 * 60 * 60 * 1000)
    return newDate.toISOString().split('T')[0]
  })

  if (chantier?.chef_id) {
    // Router vers affectations_jours_chef
    for (const jour of jours) {
      await supabase
        .from('affectations_jours_chef')
        .upsert({
          macon_id: employeId,
          chef_id: chantier.chef_id,
          chantier_id: chantierId,
          jour,
          semaine: currentWeek,
          entreprise_id: chantier.entreprise_id
        }, { onConflict: 'macon_id,jour' })
    }
  } else if (chantier?.conducteur_id) {
    // Router vers affectations_finisseurs_jours
    for (const jour of jours) {
      await supabase
        .from('affectations_finisseurs_jours')
        .upsert({
          finisseur_id: employeId,
          conducteur_id: chantier.conducteur_id,
          chantier_id: chantierId,
          date: jour,
          semaine: currentWeek
        }, { onConflict: 'finisseur_id,date' })
    }
  }

  return { copied: true, reason: '' }
}

// deno-lint-ignore no-explicit-any
async function createNewAffectation(
  supabase: any,
  employeId: string,
  chantierId: string,
  currentWeek: string,
  joursPlanning: string[],
  // deno-lint-ignore no-explicit-any
  chantier: any,
  entrepriseId: string
): Promise<{ created: boolean; reason: string }> {

  // Vérifier si une fiche existe déjà avec des heures
  const { data: existingFiche } = await supabase
    .from('fiches')
    .select('id, total_heures')
    .eq('salarie_id', employeId)
    .eq('chantier_id', chantierId)
    .eq('semaine', currentWeek)
    .maybeSingle()

  if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
    return { created: false, reason: `Fiche existante avec ${existingFiche.total_heures}h` }
  }

  // Calculer les heures par jour spécifiques (L-J: 8h, V: 7h)
  const nbJours = joursPlanning.length
  if (nbJours === 0) {
    return { created: false, reason: 'Aucun jour planifié' }
  }

  // Calculer le total basé sur les jours réels
  const totalHeures = calculateTotalHeures(joursPlanning)

  // Créer ou mettre à jour la fiche
  let ficheId = existingFiche?.id

  if (!ficheId) {
    const chefId = chantier?.chef_id || null
    const { data: newFiche, error } = await supabase
      .from('fiches')
      .insert({
        salarie_id: employeId,
        chantier_id: chantierId,
        semaine: currentWeek,
        user_id: chefId,
        statut: 'BROUILLON',
        total_heures: totalHeures
      })
      .select('id')
      .single()

    if (error) throw error
    ficheId = newFiche.id
  }

  // Créer les fiches_jours avec les heures spécifiques à chaque jour
  for (const jour of joursPlanning) {
    const heuresJour = getHeuresForDay(jour)
    await supabase
      .from('fiches_jours')
      .upsert({
        fiche_id: ficheId,
        date: jour,
        heures: heuresJour,
        HNORM: heuresJour,
        total_jour: heuresJour,
        HI: 0,
        T: 1,
        PA: true,
        pause_minutes: 0
      }, { onConflict: 'fiche_id,date' })
  }

  // Mettre à jour le total
  await supabase
    .from('fiches')
    .update({ total_heures: totalHeures })
    .eq('id', ficheId)

  // Créer les affectations_jours_chef ou affectations_finisseurs_jours
  if (chantier?.chef_id) {
    for (const jour of joursPlanning) {
      await supabase
        .from('affectations_jours_chef')
        .upsert({
          macon_id: employeId,
          chef_id: chantier.chef_id,
          chantier_id: chantierId,
          jour,
          semaine: currentWeek,
          entreprise_id: entrepriseId
        }, { onConflict: 'macon_id,jour' })
    }
  } else if (chantier?.conducteur_id) {
    for (const jour of joursPlanning) {
      await supabase
        .from('affectations_finisseurs_jours')
        .upsert({
          finisseur_id: employeId,
          conducteur_id: chantier.conducteur_id,
          chantier_id: chantierId,
          date: jour,
          semaine: currentWeek
        }, { onConflict: 'finisseur_id,date' })
    }
  }

  return { created: true, reason: '' }
}

// Helpers
function getCurrentWeek(): string {
  const now = new Date()
  const year = now.getFullYear()
  const weekNumber = getWeekNumber(now)
  return `${year}-S${String(weekNumber).padStart(2, '0')}`
}

function getPreviousWeek(week: string): string {
  const match = week.match(/^(\d{4})-S(\d{2})$/)
  if (!match) return week
  
  let year = parseInt(match[1])
  let weekNum = parseInt(match[2])
  
  weekNum--
  if (weekNum < 1) {
    year--
    weekNum = 52 // Simplification, certaines années ont 53 semaines
  }
  
  return `${year}-S${String(weekNum).padStart(2, '0')}`
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function parseISOWeek(semaine: string): Date {
  const match = semaine.match(/^(\d{4})-S(\d{2})$/)
  if (!match) throw new Error(`Invalid week format: ${semaine}`)
  
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  
  // 4 janvier est toujours dans la semaine 1
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  
  // Calculer le lundi de la semaine 1
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setDate(jan4.getDate() - dayOfWeek + 1)
  
  // Ajouter les semaines
  const result = new Date(mondayWeek1)
  result.setDate(mondayWeek1.getDate() + (week - 1) * 7)
  
  return result
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}
