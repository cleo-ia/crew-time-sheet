import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { isTargetParisHour } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
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

    // Lire le body pour récupérer execution_mode, triggered_by, force, semaine_override et entreprise_id
    let execution_mode = 'cron'
    let triggered_by = null
    let force = false
    let semaine_override = null
    let target_entreprise_id: string | null = null
    try {
      const body = await req.json()
      execution_mode = body.execution_mode || 'cron'
      triggered_by = body.triggered_by || null
      force = body.force || false
      semaine_override = body.semaine || null
      target_entreprise_id = body.entreprise_id || null  // ✅ NOUVEAU: Paramètre entreprise ciblée
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

    // ✅ CORRECTIF MULTI-TENANT: Déterminer les entreprises à traiter
    let uniqueEntreprises: string[]
    
    if (target_entreprise_id) {
      // Mode ciblé : traiter UNIQUEMENT l'entreprise spécifiée
      uniqueEntreprises = [target_entreprise_id]
      console.log(`[sync-planning-to-teams] Mode ciblé: entreprise ${target_entreprise_id} uniquement`)
    } else {
      // Mode CRON : récupérer toutes les entreprises avec planning
      const { data: entreprises, error: entError } = await supabase
        .from('planning_affectations')
        .select('entreprise_id')
        .eq('semaine', currentWeek)
      
      if (entError) throw entError

      uniqueEntreprises = [...new Set((entreprises || []).map((e: { entreprise_id: string }) => e.entreprise_id))] as string[]
      console.log(`[sync-planning-to-teams] Mode global: ${uniqueEntreprises.length} entreprise(s) avec planning pour ${currentWeek}`)
    }

    const allResults: SyncResult[] = []
    let totalCopied = 0
    let totalCreated = 0
    let totalDeleted = 0
    let totalProtected = 0

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
      totalProtected += stats.protected || 0
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
        target_entreprise_id: target_entreprise_id || 'all',
        stats: { copied: totalCopied, created: totalCreated, deleted: totalDeleted, protected: totalProtected },
        results: allResults.slice(0, 50) // Limiter pour éviter payload trop gros
      }
    })

    console.log(`[sync-planning-to-teams] Terminé: ${totalCopied} copiés, ${totalCreated} créés, ${totalDeleted} supprimés, ${totalProtected} protégés`)

    return new Response(
      JSON.stringify({
        success: true,
        semaine: currentWeek,
        stats: { copied: totalCopied, created: totalCreated, deleted: totalDeleted, protected: totalProtected },
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
  const stats = { copied: 0, created: 0, deleted: 0, protected: 0 }

  // 1. Récupérer le planning S pour cette entreprise
  const { data: planningData, error: planningError } = await supabase
    .from('planning_affectations')
    .select(`
      *,
      employe:utilisateurs!planning_affectations_employe_id_fkey(id, prenom, nom, role_metier)
    `)
    .eq('semaine', currentWeek)
    .eq('entreprise_id', entrepriseId)

  if (planningError) throw planningError

  // ========================================================================
  // NOUVELLE ÉTAPE: Calculer le chef responsable par chantier depuis le planning
  // ========================================================================
  // deno-lint-ignore no-explicit-any
  const chefsByChantier = new Map<string, { chefId: string; dayCount: number; chefNom: string }>()
  
  // deno-lint-ignore no-explicit-any
  for (const aff of (planningData || []) as any[]) {
    if (aff.employe?.role_metier === 'chef') {
      const chantierId = aff.chantier_id
      const chefId = aff.employe_id
      const chefNom = `${aff.employe.prenom || ''} ${aff.employe.nom || ''}`.trim()
      
      const existing = chefsByChantier.get(chantierId)
      if (!existing || existing.dayCount < 1) {
        // Premier chef trouvé ou on incrémente
        chefsByChantier.set(chantierId, { 
          chefId, 
          dayCount: (existing?.dayCount || 0) + 1,
          chefNom 
        })
      } else if (existing.chefId === chefId) {
        // Même chef, incrémenter les jours
        existing.dayCount++
      } else {
        // Chef différent : garder celui avec le plus de jours
        // On continue de compter
      }
    }
  }

  // Recompter proprement : grouper par chantier, puis par chef, compter les jours + flag is_chef_responsable
  const chefDaysPerChantier = new Map<string, Map<string, { count: number; nom: string; isResponsable: boolean }>>()
  // deno-lint-ignore no-explicit-any
  for (const aff of (planningData || []) as any[]) {
    if (aff.employe?.role_metier === 'chef') {
      const chantierId = aff.chantier_id
      const chefId = aff.employe_id
      const chefNom = `${aff.employe.prenom || ''} ${aff.employe.nom || ''}`.trim()
      
      if (!chefDaysPerChantier.has(chantierId)) {
        chefDaysPerChantier.set(chantierId, new Map())
      }
      const chefsMap = chefDaysPerChantier.get(chantierId)!
      const existing = chefsMap.get(chefId)
      if (existing) {
        existing.count++
        // Si au moins une affectation a is_chef_responsable = true, le marquer
        if (aff.is_chef_responsable) existing.isResponsable = true
      } else {
        chefsMap.set(chefId, { count: 1, nom: chefNom, isResponsable: !!aff.is_chef_responsable })
      }
    }
  }

  // Pour chaque chantier, déterminer le chef responsable :
  // 1. Priorité au flag is_chef_responsable = true
  // 2. Fallback : chef avec le plus de jours (compatibilité données anciennes)
  const plannedChefByChantier = new Map<string, { chefId: string; chefNom: string }>()
  // Aussi tracker tous les chefs par chantier pour la logique multi-chef
  const allChefsPerChantier = new Map<string, Set<string>>()
  
  for (const [chantierId, chefsMap] of chefDaysPerChantier) {
    const allChefIds = new Set<string>()
    let responsableChef: { chefId: string; chefNom: string } | null = null
    let bestByDays: { chefId: string; chefNom: string; count: number } | null = null
    
    for (const [chefId, data] of chefsMap) {
      allChefIds.add(chefId)
      // Priorité 1 : flag is_chef_responsable
      if (data.isResponsable) {
        responsableChef = { chefId, chefNom: data.nom }
      }
      // Fallback : le plus de jours
      if (!bestByDays || data.count > bestByDays.count) {
        bestByDays = { chefId, chefNom: data.nom, count: data.count }
      }
    }
    
    allChefsPerChantier.set(chantierId, allChefIds)
    
    // ✅ CORRECTIF: Chef seul sur un chantier = TOUJOURS responsable (ignorer le flag)
    // Le badge "Saisie" et le flag is_chef_responsable ne concernent que les chantiers multi-chefs
    let selectedChef: { chefId: string; chefNom: string } | null = null
    if (chefsMap.size === 1) {
      // Un seul chef → automatiquement responsable, peu importe le flag
      const [soloChefId, soloData] = [...chefsMap.entries()][0]
      selectedChef = { chefId: soloChefId, chefNom: soloData.nom }
      console.log(`[sync-planning-to-teams] Chantier ${chantierId}: chef unique = ${selectedChef.chefNom} (auto-responsable)`)
    } else {
      // Plusieurs chefs → utiliser is_chef_responsable, puis fallback jours
      selectedChef = responsableChef || (bestByDays ? { chefId: bestByDays.chefId, chefNom: bestByDays.chefNom } : null)
      if (selectedChef) {
        if (responsableChef) {
          console.log(`[sync-planning-to-teams] Chantier ${chantierId}: chef responsable (flag) = ${responsableChef.chefNom}`)
        } else {
          console.log(`[sync-planning-to-teams] Chantier ${chantierId}: chef responsable (fallback jours) = ${selectedChef.chefNom}`)
        }
      }
    }
    if (selectedChef) {
      plannedChefByChantier.set(chantierId, selectedChef)
    }
  }

  console.log(`[sync-planning-to-teams] ${plannedChefByChantier.size} chantier(s) avec chef planifié`)

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
  // ✅ CORRECTIF: Ajouter filtre entreprise_id
  const { data: affectationsS1Chef } = await supabase
    .from('affectations_jours_chef')
    .select('*')
    .eq('semaine', previousWeek)
    .eq('entreprise_id', entrepriseId)

  // ✅ CORRECTIF: Ajouter filtre entreprise_id
  const { data: affectationsS1Finisseurs } = await supabase
    .from('affectations_finisseurs_jours')
    .select('*')
    .eq('semaine', previousWeek)
    .eq('entreprise_id', entrepriseId)

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
    .select('id, chef_id, conducteur_id, entreprise_id, code_chantier, ville')
    .in('id', chantierIds.length > 0 ? chantierIds : ['00000000-0000-0000-0000-000000000000'])

  // deno-lint-ignore no-explicit-any
  const chantiersMap = new Map((chantiersData || []).map((c: any) => [c.id, c]))

  // ========================================================================
  // NOUVELLE ÉTAPE: Mettre à jour chantiers.chef_id depuis le planning
  // ET migrer les données si le chef change
  // ========================================================================
  for (const [chantierId, plannedChef] of plannedChefByChantier) {
    // deno-lint-ignore no-explicit-any
    const chantier = chantiersMap.get(chantierId) as any
    if (!chantier) continue

    const currentChefId = chantier.chef_id
    const newChefId = plannedChef.chefId

    // Si le chef planifié est différent du chef actuel, mettre à jour
    if (currentChefId !== newChefId) {
      console.log(`[sync-planning-to-teams] Chantier ${chantierId}: chef change de ${currentChefId || 'NULL'} vers ${newChefId} (${plannedChef.chefNom})`)
      
      // 1. Mettre à jour chantiers.chef_id
      const { error: updateChantierError } = await supabase
        .from('chantiers')
        .update({ chef_id: newChefId })
        .eq('id', chantierId)
      
      if (updateChantierError) {
        console.error(`[sync-planning-to-teams] Erreur update chantiers.chef_id:`, updateChantierError)
      } else {
        // Mettre à jour l'objet local
        chantier.chef_id = newChefId
        chantiersMap.set(chantierId, chantier)
        
        // 2. Migrer les fiches de la semaine courante vers le nouveau chef
        // SAUF les fiches où salarie_id est un chef (chaque chef garde sa propre fiche)
        const allChefsOnChantier = allChefsPerChantier.get(chantierId) || new Set<string>()
        const chefIdsOnChantier = [...allChefsOnChantier]
        
        // Récupérer les fiches du chantier pour filtrer manuellement
        const { data: fichesToMigrate } = await supabase
          .from('fiches')
          .select('id, salarie_id')
          .eq('chantier_id', chantierId)
          .eq('semaine', currentWeek)
        
        // Migrer uniquement les fiches des non-chefs
        // deno-lint-ignore no-explicit-any
        const nonChefFiches = (fichesToMigrate || []).filter((f: any) => !chefIdsOnChantier.includes(f.salarie_id))
        
        if (nonChefFiches.length > 0) {
          // deno-lint-ignore no-explicit-any
          const ficheIds = nonChefFiches.map((f: any) => f.id)
          const { error: updateFichesError } = await supabase
            .from('fiches')
            .update({ user_id: newChefId })
            .in('id', ficheIds)
          
          if (updateFichesError) {
            console.error(`[sync-planning-to-teams] Erreur migration fiches:`, updateFichesError)
          } else {
            console.log(`[sync-planning-to-teams] ${nonChefFiches.length} fiches non-chef du chantier ${chantierId} migrées vers chef ${newChefId}`)
          }
        }
        
        // 3. Migrer les affectations_jours_chef vers le nouveau chef
        // SAUF celles où macon_id est un chef (chaque chef secondaire garde son propre chef_id)
        // On migre uniquement les affectations des non-chefs
        if (chefIdsOnChantier.length > 0) {
          // Récupérer les affectations à migrer (non-chefs uniquement)
          const { data: affToMigrate } = await supabase
            .from('affectations_jours_chef')
            .select('id, macon_id')
            .eq('chantier_id', chantierId)
            .eq('semaine', currentWeek)
            .eq('entreprise_id', entrepriseId)
          
          // deno-lint-ignore no-explicit-any
          const nonChefAffIds = (affToMigrate || []).filter((a: any) => !chefIdsOnChantier.includes(a.macon_id)).map((a: any) => a.id)
          
          if (nonChefAffIds.length > 0) {
            const { error: updateAffectationsError } = await supabase
              .from('affectations_jours_chef')
              .update({ chef_id: newChefId })
              .in('id', nonChefAffIds)
            
            if (updateAffectationsError) {
              console.error(`[sync-planning-to-teams] Erreur migration affectations:`, updateAffectationsError)
            } else {
              console.log(`[sync-planning-to-teams] ${nonChefAffIds.length} affectations non-chef du chantier ${chantierId} migrées vers chef ${newChefId}`)
            }
          }
        }
      }
    }
  }

  // ========================================================================
  // Mettre chef_id = NULL pour les chantiers du planning sans chef planifié
  // (pour que l'équipe soit gérée côté conducteur)
  // ========================================================================
  for (const chantierId of chantierIds as string[]) {
    if (!plannedChefByChantier.has(chantierId)) {
      // deno-lint-ignore no-explicit-any
      const chantier = chantiersMap.get(chantierId) as any
      if (chantier && chantier.chef_id !== null) {
        console.log(`[sync-planning-to-teams] Chantier ${chantierId}: aucun chef planifié, reset chef_id à NULL (conducteur gérera)`)
        
        const { error: resetError } = await supabase
          .from('chantiers')
          .update({ chef_id: null })
          .eq('id', chantierId)
        
        if (!resetError) {
          chantier.chef_id = null
          chantiersMap.set(chantierId, chantier)
        }
      }
    }
  }

  // 3b. Récupérer les chefs avec leur chantier principal depuis utilisateurs
  // Pour éviter les doublons d'heures pour les chefs multi-chantiers
  const { data: chefsData } = await supabase
    .from('utilisateurs')
    .select('id, chantier_principal_id')
    .not('chantier_principal_id', 'is', null)
    .eq('entreprise_id', entrepriseId)

  // Map: chef_id -> chantier_principal_id
  const chefPrincipalMap = new Map<string, string>()
  // deno-lint-ignore no-explicit-any
  for (const chef of (chefsData || []) as any[]) {
    chefPrincipalMap.set(chef.id, chef.chantier_principal_id)
  }
  
  console.log(`[sync-planning-to-teams] ${chefPrincipalMap.size} chef(s) avec chantier principal défini`)

  // ========================================================================
  // AUTO-ASSIGN chantier_principal_id pour les chefs mono-chantier
  // Si un chef n'est affecté qu'à un seul chantier dans le planning,
  // on force automatiquement son chantier_principal_id sur ce chantier.
  // ========================================================================
  const chantiersByChef = new Map<string, Set<string>>()
  for (const [chantierId, chefsMap] of chefDaysPerChantier) {
    for (const [chefId] of chefsMap) {
      if (!chantiersByChef.has(chefId)) {
        chantiersByChef.set(chefId, new Set())
      }
      chantiersByChef.get(chefId)!.add(chantierId)
    }
  }

  for (const [chefId, chantierSet] of chantiersByChef) {
    if (chantierSet.size === 1) {
      const uniqueChantierId = [...chantierSet][0]
      const currentPrincipal = chefPrincipalMap.get(chefId)
      
      if (currentPrincipal !== uniqueChantierId) {
        console.log(`[sync-planning-to-teams] Chef mono-chantier ${chefId}: auto-assign chantier_principal_id = ${uniqueChantierId}`)
        
        const { error: updateError } = await supabase
          .from('utilisateurs')
          .update({ chantier_principal_id: uniqueChantierId })
          .eq('id', chefId)
        
        if (updateError) {
          console.error(`[sync-planning-to-teams] Erreur auto-assign chantier_principal_id:`, updateError)
        } else {
          // Mettre à jour le map local
          chefPrincipalMap.set(chefId, uniqueChantierId)
        }
      }
    }
  }

  // 4. Traiter chaque employé du planning
  for (const [key, affectations] of planningByEmployeChantier) {
    const [employeId, chantierId] = key.split('|')
    const employe = affectations[0]?.employe
    const employeNom = (employe?.prenom || '') + ' ' + (employe?.nom || '') || employeId
    // deno-lint-ignore no-explicit-any
    const joursPlanning = affectations.map((a: any) => a.jour).sort()
    // deno-lint-ignore no-explicit-any
    const chantier = chantiersMap.get(chantierId) as any

    // NOUVEAU: Vérifier si c'est un chef sur ce chantier
    // Distinguer "chef responsable" vs "chef secondaire" via is_chef_responsable
    if (employe?.role_metier === 'chef') {
      const plannedChef = plannedChefByChantier.get(chantierId)
      const isChefResponsable = plannedChef?.chefId === employeId
      
      if (!isChefResponsable) {
        // C'est un chef secondaire sur ce chantier → créer une fiche avec ses heures personnelles
        // mais PAS de gestion d'équipe (pas d'affectations_jours_chef en tant que chef_id)
        console.log(`[sync-planning-to-teams] Chef secondaire ${employeNom} sur chantier ${chantierId} (responsable: ${plannedChef?.chefNom || 'aucun'})`)
        
        // Récupérer ou créer une fiche pour le chef secondaire
        const { data: ficheSecondaire } = await supabase
          .from('fiches')
          .select('id, total_heures, statut')
          .eq('salarie_id', employeId)
          .eq('chantier_id', chantierId)
          .eq('semaine', currentWeek)
          .maybeSingle()

        // Ne pas toucher aux fiches protégées
        const STATUTS_PROTEGES = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
        if (ficheSecondaire && STATUTS_PROTEGES.includes(ficheSecondaire.statut)) {
          console.log(`[sync-planning-to-teams] Chef secondaire ${employeNom}: fiche protégée (${ficheSecondaire.statut}), skip`)
          results.push({ employe_id: employeId, employe_nom: employeNom, action: 'skipped', details: `Chef secondaire, fiche protégée` })
          continue
        }
        
        let ficheSecId = ficheSecondaire?.id

        if (ficheSecId) {
          // Fiche existante — mettre à jour les heures par jour
          // Supprimer les anciens fiches_jours pour les recréer proprement
          await supabase
            .from('fiches_jours')
            .delete()
            .eq('fiche_id', ficheSecId)
            .eq('entreprise_id', entrepriseId)
        } else {
          // Créer la fiche pour le chef secondaire
          const { data: newFiche } = await supabase
            .from('fiches')
            .insert({
              salarie_id: employeId,
              chantier_id: chantierId,
              semaine: currentWeek,
              user_id: employeId, // chaque chef gère sa propre fiche indépendamment
              statut: 'BROUILLON',
              total_heures: 0,
              entreprise_id: entrepriseId
            })
            .select('id')
            .single()
          
          ficheSecId = newFiche?.id
        }
        
        if (ficheSecId) {
          // Créer les fiches_jours avec les heures personnelles du chef secondaire
          const chantierCode = chantier?.code_chantier || null
          const chantierVille = chantier?.ville || null
          let totalHeuresChefSec = 0
          
          // Déterminer si ce chantier est le chantier SECONDAIRE du chef
          // (pas son chantier_principal_id) → initialiser à 0h pour éviter les doublons
          const chefPrincipalChantierId = chefPrincipalMap.get(employeId)
          const isChantierSecondaire = chefPrincipalChantierId && chefPrincipalChantierId !== chantierId

          for (const jour of joursPlanning) {
            if (isChantierSecondaire) {
              // Chantier secondaire : 0h, 0 trajet, 0 panier
              await supabase
                .from('fiches_jours')
                .upsert({
                  fiche_id: ficheSecId,
                  date: jour,
                  heures: 0,
                  HNORM: 0,
                  HI: 0,
                  T: 0,
                  PA: false,
                  pause_minutes: 0,
                  code_trajet: null,
                  code_chantier_du_jour: chantierCode,
                  ville_du_jour: chantierVille,
                  repas_type: null,
                  entreprise_id: entrepriseId
                }, { onConflict: 'fiche_id,date' })
            } else {
              // Chantier principal ou pas de chantier principal défini : heures normales
              const heuresJour = getHeuresForDay(jour) // 8h L-J, 7h V
              totalHeuresChefSec += heuresJour
              
              await supabase
                .from('fiches_jours')
                .upsert({
                  fiche_id: ficheSecId,
                  date: jour,
                  heures: heuresJour,
                  HNORM: heuresJour,
                  HI: 0,
                  T: 1,
                  PA: true,
                  pause_minutes: 0,
                  code_trajet: "A_COMPLETER",
                  code_chantier_du_jour: chantierCode,
                  ville_du_jour: chantierVille,
                  repas_type: "PANIER",
                  entreprise_id: entrepriseId
                }, { onConflict: 'fiche_id,date' })
            }
          }
          
          // Mettre à jour le total (0 si chantier secondaire)
          const finalTotal = isChantierSecondaire ? 0 : totalHeuresChefSec
          await supabase
            .from('fiches')
            .update({ total_heures: finalTotal, statut: 'BROUILLON' })
            .eq('id', ficheSecId)
          
          // Créer les affectations_jours_chef pour le chef secondaire
          // Le chef_id de l'affectation est le chef RESPONSABLE (pour le routage)
          for (const jour of joursPlanning) {
            await supabase
              .from('affectations_jours_chef')
              .upsert({
                macon_id: employeId,
                chef_id: plannedChef?.chefId || employeId,
                chantier_id: chantierId,
                jour,
                semaine: currentWeek,
                entreprise_id: entrepriseId
              }, { onConflict: 'macon_id,jour' })
          }
          
          console.log(`[sync-planning-to-teams] Chef secondaire ${employeNom}: fiche créée avec ${finalTotal}h sur ${joursPlanning.length} jours (chantier ${isChantierSecondaire ? 'secondaire → 0h' : 'principal → heures normales'})`)
        }
        
        const chefPrincipalChantierIdForLog = chefPrincipalMap.get(employeId)
        const isSecondaireForLog = chefPrincipalChantierIdForLog && chefPrincipalChantierIdForLog !== chantierId
        results.push({ 
          employe_id: employeId, 
          employe_nom: employeNom, 
          action: 'created', 
          details: `Chef secondaire - ${isSecondaireForLog ? '0h (chantier secondaire)' : 'heures normales'} sur ${joursPlanning.length} jours` 
        })
        stats.created++
        continue
      }
      // Si isChefResponsable = true, vérifier si c'est le chantier SECONDAIRE du chef
      // (pas son chantier_principal_id) → initialiser à 0h pour éviter les doublons d'heures
      const chefPrincipalChantierId = chefPrincipalMap.get(employeId)
      if (chefPrincipalChantierId && chefPrincipalChantierId !== chantierId) {
        console.log(`[sync-planning-to-teams] Chef responsable ${employeNom} sur chantier SECONDAIRE ${chantierId} (principal: ${chefPrincipalChantierId}) → 0h`)

        // Récupérer ou créer la fiche
        const { data: ficheChefSec } = await supabase
          .from('fiches')
          .select('id, total_heures, statut')
          .eq('salarie_id', employeId)
          .eq('chantier_id', chantierId)
          .eq('semaine', currentWeek)
          .maybeSingle()

        const STATUTS_PROTEGES_CHEF = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
        if (ficheChefSec && STATUTS_PROTEGES_CHEF.includes(ficheChefSec.statut)) {
          console.log(`[sync-planning-to-teams] Chef ${employeNom}: fiche protégée (${ficheChefSec.statut}) sur chantier secondaire, skip`)
          results.push({ employe_id: employeId, employe_nom: employeNom, action: 'skipped', details: `Chef responsable chantier secondaire, fiche protégée` })
          continue
        }

        let ficheChefSecId = ficheChefSec?.id

        if (ficheChefSecId) {
          // Supprimer les fiches_jours existantes pour les recréer à 0h
          await supabase
            .from('fiches_jours')
            .delete()
            .eq('fiche_id', ficheChefSecId)
            .eq('entreprise_id', entrepriseId)
        } else {
          // Créer la fiche
          const { data: newFicheChefSec } = await supabase
            .from('fiches')
            .insert({
              salarie_id: employeId,
              chantier_id: chantierId,
              semaine: currentWeek,
              user_id: employeId,
              statut: 'BROUILLON',
              total_heures: 0,
              entreprise_id: entrepriseId
            })
            .select('id')
            .single()
          ficheChefSecId = newFicheChefSec?.id
        }

        if (ficheChefSecId) {
          const chantierCode = chantier?.code_chantier || null
          const chantierVille = chantier?.ville || null

          // Créer les fiches_jours à 0h pour chaque jour planifié
          for (const jour of joursPlanning) {
            await supabase
              .from('fiches_jours')
              .upsert({
                fiche_id: ficheChefSecId,
                date: jour,
                heures: 0,
                HNORM: 0,
                HI: 0,
                T: 0,
                PA: false,
                pause_minutes: 0,
                code_trajet: null,
                code_chantier_du_jour: chantierCode,
                ville_du_jour: chantierVille,
                repas_type: null,
                entreprise_id: entrepriseId
              }, { onConflict: 'fiche_id,date' })
          }

          // Forcer total_heures = 0
          await supabase
            .from('fiches')
            .update({ total_heures: 0, statut: 'BROUILLON' })
            .eq('id', ficheChefSecId)

          // Créer les affectations_jours_chef (chef = lui-même sur son chantier secondaire)
          for (const jour of joursPlanning) {
            await supabase
              .from('affectations_jours_chef')
              .upsert({
                macon_id: employeId,
                chef_id: employeId,
                chantier_id: chantierId,
                jour,
                semaine: currentWeek,
                entreprise_id: entrepriseId
              }, { onConflict: 'macon_id,jour' })
          }

          console.log(`[sync-planning-to-teams] Chef ${employeNom}: fiche 0h créée sur chantier secondaire ${chantierId} (${joursPlanning.length} jours)`)
        }

        results.push({
          employe_id: employeId,
          employe_nom: employeNom,
          action: 'created',
          details: `Chef responsable chantier secondaire → 0h sur ${joursPlanning.length} jours`
        })
        stats.created++
        continue
      }
      // Si isChefResponsable = true ET chantier principal → traitement normal ci-dessous
    }

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
        chantier,
        entrepriseId,
        joursPlanning
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

  // ========================================================================
  // GARDE-FOU: Garantir les affectations du chef sur son chantier principal
  // + Supprimer toute affectation "polluée" du chef sur un chantier secondaire
  // ========================================================================
  const mondayOfWeek = parseISOWeek(currentWeek)
  const weekDays: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayOfWeek)
    d.setDate(mondayOfWeek.getDate() + i)
    weekDays.push(d.toISOString().split('T')[0])
  }

  for (const [chefId, chantierPrincipalId] of chefPrincipalMap) {
    // CORRECTION: Vérifier si le chef est réellement présent dans le planning de cette semaine
    // Si le chef n'est pas dans le planning, ne pas forcer ses affectations (ex: FAY Philippe absent volontairement)
    const chefInPlanning = [...planningByEmployeChantier.keys()].some(key => key.startsWith(`${chefId}|`))
    
    if (!chefInPlanning) {
      console.log(`[sync-planning-to-teams] Chef ${chefId}: absent du planning S, skip garde-fou (pas de forçage d'affectations)`)
      continue
    }

    // Récupérer les infos du chantier principal
    // deno-lint-ignore no-explicit-any
    const chantierPrincipalInfo = chantiersMap.get(chantierPrincipalId) as any
    if (!chantierPrincipalInfo) {
      console.log(`[sync-planning-to-teams] Chef ${chefId}: chantier principal ${chantierPrincipalId} non trouvé, skip garde-fou`)
      continue
    }

    // 1. Supprimer toutes les affectations du chef (macon_id = chefId) sur des chantiers != principal
    const { data: pollutedAffectations } = await supabase
      .from('affectations_jours_chef')
      .select('id, chantier_id')
      .eq('macon_id', chefId)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)
      .neq('chantier_id', chantierPrincipalId)

    if (pollutedAffectations && pollutedAffectations.length > 0) {
      console.log(`[sync-planning-to-teams] Chef ${chefId}: suppression de ${pollutedAffectations.length} affectation(s) polluée(s) sur chantiers secondaires`)
      
      await supabase
        .from('affectations_jours_chef')
        .delete()
        .eq('macon_id', chefId)
        .eq('semaine', currentWeek)
        .eq('entreprise_id', entrepriseId)
        .neq('chantier_id', chantierPrincipalId)
    }

    // 2. Forcer la création des 5 affectations sur le chantier principal
    for (const jour of weekDays) {
      await supabase
        .from('affectations_jours_chef')
        .upsert({
          macon_id: chefId,
          chef_id: chefId, // Le chef est son propre "chef" pour ses affectations
          chantier_id: chantierPrincipalId,
          jour,
          semaine: currentWeek,
          entreprise_id: entrepriseId
        }, { onConflict: 'macon_id,jour' })
    }

    console.log(`[sync-planning-to-teams] Chef ${chefId}: 5 affectations forcées sur chantier principal ${chantierPrincipalId}`)
  }

  // 5. PHASE NETTOYAGE: supprimer les affectations hors planning (SANS PROTECTION)
  const employeChantierInPlanning = new Set([...planningByEmployeChantier.keys()])
  
  // Récupérer les affectations S qui ne sont pas dans le planning
  // ✅ CORRECTIF: Ajouter filtre entreprise_id
  const { data: existingChefS } = await supabase
    .from('affectations_jours_chef')
    .select('macon_id, chantier_id')
    .eq('semaine', currentWeek)
    .eq('entreprise_id', entrepriseId)

  // ✅ CORRECTIF CRITIQUE: Ajouter filtre entreprise_id
  const { data: existingFinisseursS } = await supabase
    .from('affectations_finisseurs_jours')
    .select('finisseur_id, chantier_id')
    .eq('semaine', currentWeek)
    .eq('entreprise_id', entrepriseId)

  // Identifier les couples employé-chantier à supprimer (dans affectations mais pas dans planning)
  // PROTECTION: Ne jamais supprimer les affectations d'un chef sur son chantier principal
  // deno-lint-ignore no-explicit-any
  const toDeleteChef: string[] = [...new Set((existingChefS || [])
    .filter((a: any) => {
      const key = `${a.macon_id}|${a.chantier_id}`
      // Ne pas supprimer si dans le planning
      if (employeChantierInPlanning.has(key)) return false
      // PROTECTION: Ne jamais supprimer le chef sur son chantier principal SI il est dans le planning
      const chefPrincipal = chefPrincipalMap.get(a.macon_id)
      // Vérifier si ce chef est réellement dans le planning de cette semaine
      const chefDansPlanning = employeChantierInPlanning.has(`${a.macon_id}|${chefPrincipal}`) ||
        [...employeChantierInPlanning.keys()].some(key => key.startsWith(`${a.macon_id}|`))
      if (chefPrincipal && a.chantier_id === chefPrincipal && chefDansPlanning) return false
      return true
    })
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
      .select('id, total_heures, statut')
      .eq('salarie_id', maconId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)
      .maybeSingle()

    // Supprimer les affectations_jours_chef pour ce couple
    await supabase
      .from('affectations_jours_chef')
      .delete()
      .eq('macon_id', maconId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)

    // Supprimer les fiches_jours et la fiche associées (sauf si fiche protégée)
    const STATUTS_PROTEGES_CHEF = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
    if (fiche) {
      if (STATUTS_PROTEGES_CHEF.includes(fiche.statut)) {
        console.log(`[sync-planning-to-teams] ⚠️ Fiche protégée (statut=${fiche.statut}) — suppression ignorée pour macon ${maconId} chantier ${chantierId}`)
      } else {
        await supabase
          .from('fiches_jours')
          .delete()
          .eq('fiche_id', fiche.id)
          .eq('entreprise_id', entrepriseId)
        
        await supabase
          .from('fiches')
          .delete()
          .eq('id', fiche.id)
          .eq('entreprise_id', entrepriseId)
        
        console.log(`[sync-planning-to-teams] Supprimé macon ${maconId} chantier ${chantierId} avec fiche ${fiche.id} (${fiche.total_heures || 0}h)`)
      }
    }

    results.push({ employe_id: maconId, employe_nom: maconId, action: 'deleted', details: `Hors planning chantier ${chantierId}` })
    stats.deleted++
  }

  for (const key of toDeleteFinisseur) {
    const [finisseurId, chantierId] = key.split('|')
    
    // ✅ CORRECTIF: Ajouter filtre entreprise_id
    // Récupérer la fiche pour pouvoir la supprimer
    const { data: fiche } = await supabase
      .from('fiches')
      .select('id, total_heures, statut')
      .eq('salarie_id', finisseurId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)
      .maybeSingle()

    // ✅ CORRECTIF CRITIQUE: Ajouter filtre entreprise_id sur la suppression
    // Supprimer les affectations_finisseurs_jours pour ce couple
    await supabase
      .from('affectations_finisseurs_jours')
      .delete()
      .eq('finisseur_id', finisseurId)
      .eq('chantier_id', chantierId)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)

    // Supprimer les fiches_jours et la fiche associées (sauf si fiche protégée)
    const STATUTS_PROTEGES_FINISSEUR = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
    if (fiche) {
      if (STATUTS_PROTEGES_FINISSEUR.includes(fiche.statut)) {
        console.log(`[sync-planning-to-teams] ⚠️ Fiche protégée (statut=${fiche.statut}) — suppression ignorée pour finisseur ${finisseurId} chantier ${chantierId}`)
      } else {
        await supabase
          .from('fiches_jours')
          .delete()
          .eq('fiche_id', fiche.id)
          .eq('entreprise_id', entrepriseId)
        
        await supabase
          .from('fiches')
          .delete()
          .eq('id', fiche.id)
          .eq('entreprise_id', entrepriseId)
        
        console.log(`[sync-planning-to-teams] Supprimé finisseur ${finisseurId} chantier ${chantierId} avec fiche ${fiche.id} (${fiche.total_heures || 0}h)`)
      }
    }

    results.push({ employe_id: finisseurId, employe_nom: finisseurId, action: 'deleted', details: `Hors planning chantier ${chantierId}` })
    stats.deleted++
  }

  // ========================================================================
  // PHASE NETTOYAGE CROSS-TABLE: supprimer les affectations dans la mauvaise table
  // Si un chantier a un chef_id → supprimer les lignes dans affectations_finisseurs_jours
  // Si un chantier n'a PAS de chef_id → supprimer les lignes dans affectations_jours_chef
  // ========================================================================
  console.log(`[sync-planning-to-teams] Phase nettoyage cross-table...`)

  // Collecter les chantiers impliqués dans le planning de cette semaine
  const chantiersInPlanning = new Set<string>()
  for (const key of employeChantierInPlanning) {
    const chantierId = key.split('|')[1]
    if (chantierId) chantiersInPlanning.add(chantierId)
  }

  for (const chantierId of chantiersInPlanning) {
    // deno-lint-ignore no-explicit-any
    const chantier = chantiersMap.get(chantierId) as any
    if (!chantier) continue

    if (chantier.chef_id) {
      // Ce chantier a un chef → les affectations doivent être dans affectations_jours_chef
      // Supprimer les lignes parasites dans affectations_finisseurs_jours
      const { data: parasites, error: parasiteErr } = await supabase
        .from('affectations_finisseurs_jours')
        .delete()
        .eq('chantier_id', chantierId)
        .eq('semaine', currentWeek)
        .eq('entreprise_id', entrepriseId)
        .select('id')

      if (!parasiteErr && parasites && parasites.length > 0) {
        console.log(`[sync-planning-to-teams] 🧹 Cross-table: supprimé ${parasites.length} lignes parasites dans affectations_finisseurs_jours pour chantier ${chantierId} (a un chef_id)`)
        stats.deleted += parasites.length
      }
    } else if (chantier.conducteur_id) {
      // Ce chantier n'a PAS de chef → les affectations doivent être dans affectations_finisseurs_jours
      // Supprimer les lignes parasites dans affectations_jours_chef
      const { data: parasites, error: parasiteErr } = await supabase
        .from('affectations_jours_chef')
        .delete()
        .eq('chantier_id', chantierId)
        .eq('semaine', currentWeek)
        .eq('entreprise_id', entrepriseId)
        .select('id')

      if (!parasiteErr && parasites && parasites.length > 0) {
        console.log(`[sync-planning-to-teams] 🧹 Cross-table: supprimé ${parasites.length} lignes parasites dans affectations_jours_chef pour chantier ${chantierId} (pas de chef, géré par conducteur)`)
        stats.deleted += parasites.length
      }
    }
  }

  // ========================================================================
  // NOUVELLE PHASE: Nettoyage direct des fiches orphelines (hors planning)
  // Cette phase supprime les fiches créées par useAutoSaveFiche pour des
  // couples (salarie_id, chantier_id) qui ne sont pas dans le planning validé
  // ========================================================================
  console.log(`[sync-planning-to-teams] Phase nettoyage fiches orphelines...`)

  // 1. Construire l'ensemble des couples valides depuis le planning
  const validEmployeChantierFromPlanning = new Set(
    // deno-lint-ignore no-explicit-any
    (planningData || []).map((p: any) => `${p.employe_id}|${p.chantier_id}`)
  )
  
  console.log(`[sync-planning-to-teams] ${validEmployeChantierFromPlanning.size} couple(s) employé-chantier valides dans le planning`)

  // 2. Récupérer toutes les fiches existantes pour cette semaine/entreprise
  const { data: allFichesS, error: fichesError } = await supabase
    .from('fiches')
    .select('id, salarie_id, chantier_id, total_heures, statut')
    .eq('semaine', currentWeek)
    .eq('entreprise_id', entrepriseId)

  if (fichesError) {
    console.error(`[sync-planning-to-teams] Erreur récupération fiches:`, fichesError)
  }

  // 3. Identifier les fiches orphelines (pas dans le planning)
  const STATUTS_PROTEGES_ORPHAN = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']
  // deno-lint-ignore no-explicit-any
  const orphanFiches = (allFichesS || []).filter((f: any) => {
    // ✅ Skip fiches sans chantier (absences longue durée)
    if (!f.chantier_id) return false
    const key = `${f.salarie_id}|${f.chantier_id}`
    if (validEmployeChantierFromPlanning.has(key)) return false
    if (STATUTS_PROTEGES_ORPHAN.includes(f.statut)) {
      console.log(`[sync-planning-to-teams] ⚠️ Fiche orpheline protégée (statut=${f.statut}) — ignorée pour salarie=${f.salarie_id} chantier=${f.chantier_id}`)
      return false
    }
    return true
  })

  console.log(`[sync-planning-to-teams] ${orphanFiches.length} fiche(s) orpheline(s) détectée(s)`)

  // 4. Supprimer les fiches orphelines
  let orphanDeletedCount = 0
  // deno-lint-ignore no-explicit-any
  for (const fiche of orphanFiches as any[]) {
    // Supprimer fiches_jours d'abord (contrainte FK)
    const { error: deleteJoursError } = await supabase
      .from('fiches_jours')
      .delete()
      .eq('fiche_id', fiche.id)
      .eq('entreprise_id', entrepriseId)
    
    if (deleteJoursError) {
      console.error(`[sync-planning-to-teams] Erreur suppression fiches_jours orpheline:`, deleteJoursError)
      continue
    }
    
    // Supprimer la fiche
    const { error: deleteFicheError } = await supabase
      .from('fiches')
      .delete()
      .eq('id', fiche.id)
      .eq('entreprise_id', entrepriseId)
    
    if (deleteFicheError) {
      console.error(`[sync-planning-to-teams] Erreur suppression fiche orpheline:`, deleteFicheError)
      continue
    }
    
    console.log(`[sync-planning-to-teams] Fiche orpheline supprimée: salarie=${fiche.salarie_id}, chantier=${fiche.chantier_id} (${fiche.total_heures || 0}h)`)
    
    results.push({
      employe_id: fiche.salarie_id,
      employe_nom: fiche.salarie_id,
      action: 'deleted',
      details: `Fiche orpheline (hors planning) - ${fiche.total_heures || 0}h supprimées`
    })
    orphanDeletedCount++
    stats.deleted++
  }

  console.log(`[sync-planning-to-teams] ${orphanDeletedCount} fiche(s) orpheline(s) supprimée(s)`)

  // ========================================================================
  // ABSENCES LONGUE DURÉE: Générer automatiquement des fiches "ghost"
  // pour les salariés en absence longue durée (AT, AM, congé parental, etc.)
  // Fiches sans chantier, 0h, type_absence pré-qualifié, statut ENVOYE_RH
  // ========================================================================
  console.log(`[sync-planning-to-teams] Phase absences longue durée...`)

  const mondayOfCurrentWeek = parseISOWeek(currentWeek)
  const fridayOfCurrentWeek = new Date(mondayOfCurrentWeek)
  fridayOfCurrentWeek.setDate(mondayOfCurrentWeek.getDate() + 4)
  const mondayStr = mondayOfCurrentWeek.toISOString().split('T')[0]
  const fridayStr = fridayOfCurrentWeek.toISOString().split('T')[0]

  // Récupérer les absences longue durée actives pour cette semaine
  const { data: absencesLD, error: absLDError } = await supabase
    .from('absences_longue_duree')
    .select('*, salarie:utilisateurs!absences_longue_duree_salarie_id_fkey(id, prenom, nom)')
    .eq('entreprise_id', entrepriseId)
    .lte('date_debut', fridayStr) // Commence avant ou pendant la semaine
    .or(`date_fin.is.null,date_fin.gte.${mondayStr}`) // Pas encore terminée ou se termine pendant/après la semaine

  if (absLDError) {
    console.error(`[sync-planning-to-teams] Erreur récupération absences longue durée:`, absLDError)
  }

  let absLDCreated = 0
  // deno-lint-ignore no-explicit-any
  for (const absence of (absencesLD || []) as any[]) {
    const salarieId = absence.salarie_id
    const salarieNom = `${absence.salarie?.prenom || ''} ${absence.salarie?.nom || ''}`.trim() || salarieId
    const typeAbsence = absence.type_absence
    const absDateDebut = new Date(absence.date_debut)
    const absDateFin = absence.date_fin ? new Date(absence.date_fin) : null

    // Vérifier si une fiche ghost existe déjà pour ce salarié cette semaine (chantier_id = NULL)
    const { data: existingGhost } = await supabase
      .from('fiches')
      .select('id')
      .eq('salarie_id', salarieId)
      .is('chantier_id', null)
      .eq('semaine', currentWeek)
      .eq('entreprise_id', entrepriseId)
      .maybeSingle()

    if (existingGhost) {
      console.log(`[sync-planning-to-teams] Fiche absence LD déjà existante pour ${salarieNom} (${typeAbsence})`)
      continue
    }

    // Calculer les jours d'absence dans la semaine (Lun-Ven)
    const joursAbsence: string[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(mondayOfCurrentWeek)
      d.setDate(mondayOfCurrentWeek.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      // Le jour doit être >= date_debut et <= date_fin (ou pas de date_fin)
      if (d >= absDateDebut && (!absDateFin || d <= absDateFin)) {
        joursAbsence.push(dateStr)
      }
    }

    if (joursAbsence.length === 0) {
      console.log(`[sync-planning-to-teams] Aucun jour d'absence LD pour ${salarieNom} cette semaine`)
      continue
    }

    console.log(`[sync-planning-to-teams] Création fiche absence LD: ${salarieNom} (${typeAbsence}) - ${joursAbsence.length} jour(s)`)

    // Créer la fiche ghost (sans chantier, statut ENVOYE_RH)
    const { data: newFiche, error: ficheError } = await supabase
      .from('fiches')
      .insert({
        salarie_id: salarieId,
        chantier_id: null,
        semaine: currentWeek,
        user_id: null,
        statut: 'ENVOYE_RH',
        total_heures: 0,
        entreprise_id: entrepriseId
      })
      .select('id')
      .single()

    if (ficheError) {
      console.error(`[sync-planning-to-teams] Erreur création fiche absence LD pour ${salarieNom}:`, ficheError)
      continue
    }

    // Créer les fiches_jours avec 0h et type_absence pré-qualifié
    for (const jour of joursAbsence) {
      const { error: jourError } = await supabase
        .from('fiches_jours')
        .upsert({
          fiche_id: newFiche.id,
          date: jour,
          heures: 0,
          HNORM: 0,
          HI: 0,
          T: 0,
          PA: false,
          pause_minutes: 0,
          type_absence: typeAbsence,
          code_trajet: null,
          code_chantier_du_jour: null,
          ville_du_jour: null,
          repas_type: null,
          entreprise_id: entrepriseId
        }, { onConflict: 'fiche_id,date' })

      if (jourError) {
        console.error(`[sync-planning-to-teams] Erreur création fiche_jour absence LD:`, jourError)
      }
    }

    results.push({
      employe_id: salarieId,
      employe_nom: salarieNom,
      action: 'created',
      details: `Absence longue durée (${typeAbsence}) - ${joursAbsence.length} jour(s)`
    })
    absLDCreated++
    stats.created++
  }

  console.log(`[sync-planning-to-teams] ${absLDCreated} fiche(s) absence longue durée créée(s)`)

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
  chantier: any,
  entrepriseId: string,
  joursPlanning: string[]
): Promise<{ copied: boolean; reason: string }> {
  
  // Vérifier si une fiche existe déjà pour S
  const { data: existingFiche } = await supabase
    .from('fiches')
    .select('id, total_heures, statut')
    .eq('salarie_id', employeId)
    .eq('chantier_id', chantierId)
    .eq('semaine', currentWeek)
    .maybeSingle()

  // Si fiche existe avec heures, on ne copie pas les heures
  // MAIS on crée quand même les affectations_jours_chef pour que l'équipe soit visible
  if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
    // Créer les affectations malgré tout
    if (chantier?.chef_id) {
      const mondayS = parseISOWeek(currentWeek)
      for (let i = 0; i < 5; i++) {
        const d = new Date(mondayS)
        d.setDate(mondayS.getDate() + i)
        const jour = d.toISOString().split('T')[0]
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
      console.log(`[sync] Affectations créées pour ${employeId} (fiche protégée ${existingFiche.total_heures}h)`)
    } else if (chantier?.conducteur_id) {
      // ✅ CORRECTIF: utiliser les vrais jours du planning, pas une boucle fixe 5 jours
      for (const jour of joursPlanning) {
        await supabase
          .from('affectations_finisseurs_jours')
          .upsert({
            finisseur_id: employeId,
            conducteur_id: chantier.conducteur_id,
            chantier_id: chantierId,
            date: jour,
            semaine: currentWeek,
            entreprise_id: entrepriseId
          }, { onConflict: 'finisseur_id,date' })
      }
      console.log(`[sync] Affectations finisseurs créées pour ${employeId} (fiche protégée ${existingFiche.total_heures}h, ${joursPlanning.length} jours)`)
    }
    return { copied: false, reason: `Fiche protégée (${existingFiche.total_heures}h), affectations créées` }
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

  // ✅ FIX: Utiliser le chef COURANT du chantier, pas celui de S-1
  const currentChefId = chantier?.chef_id || ficheS1.user_id

  // Créer ou récupérer la fiche S
  let ficheIdS = existingFiche?.id

  if (!ficheIdS) {
    const { data: newFiche, error: newFicheError } = await supabase
      .from('fiches')
      .insert({
        salarie_id: employeId,
        chantier_id: chantierId,
        semaine: currentWeek,
        user_id: currentChefId, // ✅ Chef courant, pas celui de S-1
        statut: 'BROUILLON',
        total_heures: 0,
        entreprise_id: entrepriseId
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

    const { error: jourError } = await supabase
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
        PA: jourS1.PA,
        entreprise_id: entrepriseId,
        // total_jour est une colonne générée, ne pas l'inclure
        // Ne pas copier: signature_data, commentaire
      }, { onConflict: 'fiche_id,date' })
    
    if (jourError) {
      console.error(`[sync] Erreur copie fiches_jours pour ${newDateStr}:`, jourError)
      throw jourError
    }
  }

  // ✅ CORRECTIF: Nettoyer les jours fantômes copiés de S-1 qui ne sont pas dans le planning actuel
  if (chantier?.conducteur_id) {
    const mondayOfWeek = parseISOWeek(currentWeek)
    const allWeekDates: string[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(mondayOfWeek)
      d.setDate(mondayOfWeek.getDate() + i)
      allWeekDates.push(d.toISOString().split('T')[0])
    }
    const datesToDelete = allWeekDates.filter(d => !joursPlanning.includes(d))
    if (datesToDelete.length > 0) {
      await supabase
        .from('fiches_jours')
        .delete()
        .eq('fiche_id', ficheIdS)
        .in('date', datesToDelete)
      console.log(`[sync] Supprimé ${datesToDelete.length} jours fantômes hors planning pour ${employeId}: ${datesToDelete.join(', ')}`)
    }
  }

  // Mettre à jour le total_heures de la fiche
  // deno-lint-ignore no-explicit-any
  // R3 FIX: Pour les chantiers conducteur, filtrer joursS1 par joursPlanning (après nettoyage des jours fantômes)
  // Pour les chantiers chef, garder le calcul d'origine (5 jours intacts)
  // deno-lint-ignore no-explicit-any
  const totalHeures = chantier?.conducteur_id
    ? (joursS1 as any[])
        .filter((j: any) => {
          const oldDate = new Date(j.date)
          const newDate = new Date(oldDate.getTime() + daysDiff * 24 * 60 * 60 * 1000)
          return joursPlanning.includes(newDate.toISOString().split('T')[0])
        })
        .reduce((sum: number, j: any) => sum + (j.heures || 0), 0)
    : (joursS1 as any[]).reduce((sum: number, j: any) => sum + (j.heures || 0), 0)
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
    // Router vers affectations_jours_chef avec le chef COURANT
    for (const jour of jours) {
      await supabase
        .from('affectations_jours_chef')
        .upsert({
          macon_id: employeId,
          chef_id: chantier.chef_id, // ✅ Chef courant
          chantier_id: chantierId,
          jour,
          semaine: currentWeek,
          entreprise_id: chantier.entreprise_id
        }, { onConflict: 'macon_id,jour' })
    }
  } else if (chantier?.conducteur_id) {
    // ✅ CORRECTIF: Utiliser joursPlanning (vrais jours du planning S) et non jours (dates de S-1)
    for (const jour of joursPlanning) {
      await supabase
        .from('affectations_finisseurs_jours')
        .upsert({
          finisseur_id: employeId,
          conducteur_id: chantier.conducteur_id,
          chantier_id: chantierId,
          date: jour,
          semaine: currentWeek,
          entreprise_id: entrepriseId
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

  // Si fiche existe avec heures, on ne crée pas de nouvelles heures
  // MAIS on crée quand même les affectations pour que l'équipe soit visible
  if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
    // Créer les affectations sur les jours planifiés malgré tout
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
      console.log(`[sync] Affectations créées pour ${employeId} sur ${joursPlanning.length} jours (fiche protégée ${existingFiche.total_heures}h)`)
    } else if (chantier?.conducteur_id) {
      for (const jour of joursPlanning) {
        await supabase
          .from('affectations_finisseurs_jours')
          .upsert({
            finisseur_id: employeId,
            conducteur_id: chantier.conducteur_id,
            chantier_id: chantierId,
            date: jour,
            semaine: currentWeek,
            entreprise_id: entrepriseId
          }, { onConflict: 'finisseur_id,date' })
      }
      console.log(`[sync] Affectations finisseurs créées pour ${employeId} sur ${joursPlanning.length} jours (fiche protégée ${existingFiche.total_heures}h)`)
    }
    return { created: false, reason: `Fiche protégée (${existingFiche.total_heures}h), affectations créées` }
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
        total_heures: totalHeures,
        entreprise_id: entrepriseId
      })
      .select('id')
      .single()

    if (error) throw error
    ficheId = newFiche.id
  }

  // Créer les fiches_jours avec les heures spécifiques à chaque jour
  // + Initialiser code_trajet et code_chantier_du_jour dès la création
  const chantierCode = chantier?.code_chantier || null
  const chantierVille = chantier?.ville || null
  
  for (const jour of joursPlanning) {
    const heuresJour = getHeuresForDay(jour)
    const { error: jourError } = await supabase
      .from('fiches_jours')
      .upsert({
        fiche_id: ficheId,
        date: jour,
        heures: heuresJour,
        HNORM: heuresJour,
        // total_jour est une colonne générée, ne pas l'inclure
        HI: 0,
        T: 1,
        PA: true,
        pause_minutes: 0,
        // ✅ Initialiser les champs pour le RH consolidé
        code_trajet: "A_COMPLETER",
        code_chantier_du_jour: chantierCode,
        ville_du_jour: chantierVille,
        repas_type: "PANIER",
        entreprise_id: entrepriseId
      }, { onConflict: 'fiche_id,date' })
    
    if (jourError) {
      console.error(`[sync] Erreur création fiches_jours pour ${jour}:`, jourError)
      throw jourError
    }
  }

  // ✅ FIX: Nettoyer les jours fantômes (fiches_jours hors planning)
  // Supprimer tous les fiches_jours pour cette fiche dont la date n'est pas dans joursPlanning
  const mondayOfWeek = parseISOWeek(currentWeek)
  const allWeekDates: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayOfWeek)
    d.setDate(mondayOfWeek.getDate() + i)
    allWeekDates.push(d.toISOString().split('T')[0])
  }
  
  const datesToDelete = allWeekDates.filter(d => !joursPlanning.includes(d))
  
  if (datesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('fiches_jours')
      .delete()
      .eq('fiche_id', ficheId)
      .in('date', datesToDelete)
    
    if (deleteError) {
      console.error(`[sync] Erreur suppression jours fantômes:`, deleteError)
    } else {
      console.log(`[sync] Supprimé ${datesToDelete.length} jour(s) fantôme(s) pour employé ${employeId} chantier ${chantierId}`)
    }
  }

  // Mettre à jour le total (trigger DB recalculera après les suppressions)
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
    // ✅ CORRECTIF CRITIQUE: Ajouter entreprise_id dans l'upsert finisseurs
    for (const jour of joursPlanning) {
      await supabase
        .from('affectations_finisseurs_jours')
        .upsert({
          finisseur_id: employeId,
          conducteur_id: chantier.conducteur_id,
          chantier_id: chantierId,
          date: jour,
          semaine: currentWeek,
          entreprise_id: entrepriseId
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
