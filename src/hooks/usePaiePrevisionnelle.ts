import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, getDay, eachDayOfInterval, subMonths, addDays, subDays } from "date-fns";
import { batchQueryIn } from "@/lib/supabaseBatch";
import { EmployeeDetail, EmployeeWithDetails } from "./rhShared";

/**
 * Paie Prévisionnelle — Génération des jours estimés et régularisation M-1
 * 
 * Logique :
 * 1. Planning direct — affectation dans planning_affectations pour cette date
 * 2. Clone planning S-1 — même jour de la semaine, semaine précédente
 * 3. Semaine Socle — dernière semaine saisie du mois
 * 4. Fallback optimiste — 39h standard, panier, T1
 */

export interface EstimatedDay extends EmployeeDetail {
  is_estimated: true;
}

export interface PlanningChantierInfo {
  chantierId: string;
  chantierCode: string;
  chantierVille: string;
}

/**
 * Charge les données du planning pour estimer les jours manquants.
 * Retourne Map<"salarieId_yyyy-MM-dd", PlanningChantierInfo>
 * 
 * Stratégie :
 * 1. Requête directe sur les dates manquantes
 * 2. Pour les dates non couvertes, clone S-1 (même jour de semaine, 7 jours avant)
 * 3. Résout les chantier_id en code_chantier + ville
 */
export async function fetchPlanningForEstimation(
  salarieIds: string[],
  datesManquantes: string[], // format yyyy-MM-dd
  entrepriseId: string
): Promise<Map<string, PlanningChantierInfo>> {
  const result = new Map<string, PlanningChantierInfo>();
  if (salarieIds.length === 0 || datesManquantes.length === 0) return result;

  // 1. Requête directe : planning_affectations pour les dates manquantes
  const planningDirect = await batchQueryIn<{
    employe_id: string;
    chantier_id: string;
    jour: string;
  }>(
    "planning_affectations",
    "employe_id, chantier_id, jour",
    "employe_id",
    salarieIds,
    {
      extraFilters: (q: any) => q
        .eq("entreprise_id", entrepriseId)
        .in("jour", datesManquantes),
    }
  );

  // Collecter les chantier_id trouvés et les dates couvertes
  const chantierIds = new Set<string>();
  const coveredKeys = new Set<string>();

  for (const row of planningDirect) {
    const key = `${row.employe_id}_${row.jour}`;
    coveredKeys.add(key);
    chantierIds.add(row.chantier_id);
    // Stocker temporairement avec chantierId seulement (on résoudra après)
    result.set(key, { chantierId: row.chantier_id, chantierCode: "", chantierVille: "" });
  }

  // 2. Pour les dates non couvertes, calculer S-1 (même jour, 7 jours avant)
  const uncoveredDates: { salarieId: string; originalDate: string; s1Date: string }[] = [];
  
  for (const salarieId of salarieIds) {
    for (const dateStr of datesManquantes) {
      const key = `${salarieId}_${dateStr}`;
      if (!coveredKeys.has(key)) {
        const s1Date = format(subDays(parseISO(dateStr), 7), "yyyy-MM-dd");
        uncoveredDates.push({ salarieId, originalDate: dateStr, s1Date });
      }
    }
  }

  if (uncoveredDates.length > 0) {
    // Requête S-1
    const s1Dates = [...new Set(uncoveredDates.map(u => u.s1Date))];
    const s1SalarieIds = [...new Set(uncoveredDates.map(u => u.salarieId))];

    const planningS1 = await batchQueryIn<{
      employe_id: string;
      chantier_id: string;
      jour: string;
    }>(
      "planning_affectations",
      "employe_id, chantier_id, jour",
      "employe_id",
      s1SalarieIds,
      {
        extraFilters: (q: any) => q
          .eq("entreprise_id", entrepriseId)
          .in("jour", s1Dates),
      }
    );

    // Indexer S-1 par employe_id + jour
    const s1Map = new Map<string, string>();
    for (const row of planningS1) {
      s1Map.set(`${row.employe_id}_${row.jour}`, row.chantier_id);
    }

    // Appliquer le clone S-1
    for (const { salarieId, originalDate, s1Date } of uncoveredDates) {
      const chantierId = s1Map.get(`${salarieId}_${s1Date}`);
      if (chantierId) {
        chantierIds.add(chantierId);
        result.set(`${salarieId}_${originalDate}`, { chantierId, chantierCode: "", chantierVille: "" });
      }
    }
  }

  // 3. Résoudre les chantier_id en code_chantier + ville
  if (chantierIds.size > 0) {
    const { data: chantiers } = await supabase
      .from("chantiers")
      .select("id, code_chantier, ville")
      .in("id", [...chantierIds]);

    const chantierMap = new Map<string, { code: string; ville: string }>();
    (chantiers || []).forEach(c => {
      chantierMap.set(c.id, { code: c.code_chantier || "", ville: c.ville || "" });
    });

    // Enrichir le résultat
    for (const [key, info] of result.entries()) {
      const ch = chantierMap.get(info.chantierId);
      if (ch) {
        result.set(key, { ...info, chantierCode: ch.code, chantierVille: ch.ville });
      }
    }
  }

  console.log(`[Planning Estimation] ${result.size} jours résolus via planning pour ${salarieIds.length} salariés`);
  return result;
}

/**
 * Charge les codes trajet par défaut en batch pour résolution planning.
 * Retourne Map<"chantierId_salarieId", codeTrajet>
 */
export async function fetchCodesTrajetDefautBatch(
  entrepriseId: string,
  salarieIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!entrepriseId || salarieIds.length === 0) return map;

  const rows = await batchQueryIn<{
    chantier_id: string;
    salarie_id: string;
    code_trajet: string;
  }>(
    "codes_trajet_defaut",
    "chantier_id, salarie_id, code_trajet",
    "salarie_id",
    salarieIds,
    {
      extraFilters: (q: any) => q.eq("entreprise_id", entrepriseId),
    }
  );

  for (const row of rows) {
    map.set(`${row.chantier_id}_${row.salarie_id}`, row.code_trajet);
  }

  return map;
}

/**
 * Trouve la "Semaine Socle" : la dernière semaine ISO du mois 
 * où le salarié a au moins 1 jour avec heures > 0 
 * et dont tous les jours ouvrables ont des données saisies
 */
function findSemaineSocle(
  detailJours: EmployeeDetail[],
  moisDebut: Date,
  moisFin: Date
): Map<number, EmployeeDetail> | null {
  const joursDuMois = detailJours.filter(j => {
    const d = parseISO(j.date);
    return d >= moisDebut && d <= moisFin;
  });

  const weeksMap = new Map<string, Map<number, EmployeeDetail>>();
  
  joursDuMois.forEach(jour => {
    const d = parseISO(jour.date);
    const dayOfWeek = getDay(d);
    if (dayOfWeek < 1 || dayOfWeek > 5) return;
    
    const monday = addDays(d, 1 - dayOfWeek);
    const weekKey = format(monday, 'yyyy-MM-dd');
    
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, new Map());
    }
    weeksMap.get(weekKey)!.set(dayOfWeek, jour);
  });

  const sortedWeeks = [...weeksMap.entries()].sort(([a], [b]) => b.localeCompare(a));

  for (const [, joursSemaine] of sortedWeeks) {
    const hasWorkedDay = [...joursSemaine.values()].some(j => j.heures > 0);
    const nbJoursSaisis = joursSemaine.size;
    
    if (hasWorkedDay && nbJoursSaisis >= 3) {
      return joursSemaine;
    }
  }

  return null;
}

/**
 * Génère les jours estimés pour un salarié pour les dates manquantes du mois.
 * 
 * Ordre de priorité :
 * 1. Planning direct / clone S-1 (via planningMap)
 * 2. Semaine Socle (clonage dernière semaine saisie)
 * 3. Fallback optimiste (8h/7h, panier, T1)
 */
export function generateEstimatedDays(
  detailJours: EmployeeDetail[],
  mois: string,
  options: {
    isEcole?: boolean;
    defaultTrajetCode?: string | null;
    planningMap?: Map<string, PlanningChantierInfo>;
    codesTrajetMap?: Map<string, string>;
    salarieId?: string;
    blockedDates?: Set<string>;
  } = {}
): EstimatedDay[] {
  if (!mois || mois === "all") return [];

  const [year, month] = mois.split("-").map(Number);
  const moisDebut = startOfMonth(new Date(year, month - 1));
  const moisFin = endOfMonth(new Date(year, month - 1));

  // Lister tous les jours ouvrables du mois (lundi-vendredi)
  const tousJoursOuvrables = eachDayOfInterval({ start: moisDebut, end: moisFin })
    .filter(d => {
      const dow = getDay(d);
      return dow >= 1 && dow <= 5;
    });

  // Trouver les dates déjà couvertes par des fiches_jours réels
  const datesReelles = new Set(detailJours.map(j => j.date));

  // Dates manquantes (exclure les dates bloquées par ALD ou congés validés)
  const datesManquantes = tousJoursOuvrables.filter(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    if (datesReelles.has(dateStr)) return false;
    if (options.blockedDates?.has(dateStr)) return false;
    return true;
  });

  if (datesManquantes.length === 0) return [];

  // === CAS APPRENTI (is_ecole) ===
  if (options.isEcole) {
    return datesManquantes.map(d => ({
      date: format(d, 'yyyy-MM-dd'),
      chantierCode: "ECOLE",
      chantierVille: "",
      heures: 7,
      intemperie: 0,
      panier: false,
      trajet: null,
      trajetPerso: false,
      isAbsent: false,
      isEcole: true,
      is_estimated: true as const,
    }));
  }

  // Trouver la semaine socle (fallback)
  const semaineSocle = findSemaineSocle(detailJours, moisDebut, moisFin);

  const estimatedDays: EstimatedDay[] = [];

  for (const d of datesManquantes) {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dow = getDay(d); // 1=lun ... 5=ven

    // === PRIORITÉ 1 : Planning (direct ou clone S-1) ===
    if (options.planningMap && options.salarieId) {
      const planningKey = `${options.salarieId}_${dateStr}`;
      const planningInfo = options.planningMap.get(planningKey);

      if (planningInfo) {
        const heures = dow === 5 ? 7 : 8;
        
        // Résoudre le trajet via codes_trajet_defaut
        let trajet: string | null = options.defaultTrajetCode || "T1";
        if (options.codesTrajetMap) {
          const trajetKey = `${planningInfo.chantierId}_${options.salarieId}`;
          const trajetDefaut = options.codesTrajetMap.get(trajetKey);
          if (trajetDefaut) {
            trajet = trajetDefaut === "AUCUN" ? null : trajetDefaut;
          }
        }

        estimatedDays.push({
          date: dateStr,
          chantierCode: planningInfo.chantierCode,
          chantierVille: planningInfo.chantierVille,
          heures,
          intemperie: 0,
          panier: true,
          trajet,
          trajetPerso: false,
          isAbsent: false,
          isEcole: false,
          is_estimated: true as const,
        });
        continue; // Jour couvert par le planning, passer au suivant
      }
    }

    // === PRIORITÉ 2 : Semaine Socle ===
    if (semaineSocle) {
      const jourRef = semaineSocle.get(dow);
      if (jourRef && jourRef.heures > 0 && !jourRef.isAbsent) {
        estimatedDays.push({
          date: dateStr,
          chantierCode: jourRef.chantierCode,
          chantierVille: jourRef.chantierVille,
          heures: jourRef.heures,
          intemperie: 0,
          panier: jourRef.panier,
          repasType: jourRef.repasType,
          trajet: jourRef.trajet,
          trajetPerso: jourRef.trajetPerso,
          isAbsent: false,
          isEcole: false,
          is_estimated: true as const,
        });
        continue;
      }
    }

    // === PRIORITÉ 3 : Fallback optimiste ===
    estimatedDays.push(createOptimisticDay(d, options.defaultTrajetCode));
  }

  return estimatedDays;
}

/**
 * Crée un jour "optimiste" par défaut : 8h (lun-jeu) / 7h (ven), panier, T1 ou trajet principal
 */
function createOptimisticDay(date: Date, defaultTrajetCode?: string | null): EstimatedDay {
  const dow = getDay(date);
  const heures = dow === 5 ? 7 : 8;
  
  return {
    date: format(date, 'yyyy-MM-dd'),
    chantierCode: "",
    chantierVille: "",
    heures,
    intemperie: 0,
    panier: true,
    trajet: defaultTrajetCode || "T1",
    trajetPerso: false,
    isAbsent: false,
    isEcole: false,
    is_estimated: true as const,
  };
}

/**
 * Calcule la régularisation M-1 en batch pour TOUS les salariés.
 * 2 requêtes Supabase au lieu de N*2.
 */
export async function calculateRegularisationM1Batch(
  salarieIds: string[],
  moisActuel: string,
  entrepriseId: string | null
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!moisActuel || moisActuel === "all" || !entrepriseId || salarieIds.length === 0) return result;

  const [year, month] = moisActuel.split("-").map(Number);
  const moisPrecedent = format(subMonths(new Date(year, month - 1, 1), 1), "yyyy-MM");

  const { data: periodes } = await supabase
    .from("periodes_cloturees")
    .select("snapshot_estimations")
    .eq("periode", moisPrecedent)
    .eq("entreprise_id", entrepriseId)
    .order("date_cloture", { ascending: false })
    .limit(1);

  if (!periodes || periodes.length === 0) return result;

  const snapshot = periodes[0].snapshot_estimations as Record<string, any[]> | null;
  if (!snapshot) return result;

  const salariesAvecEstimations = salarieIds.filter(id => snapshot[id] && snapshot[id].length > 0);
  if (salariesAvecEstimations.length === 0) return result;

  const allEstimatedDates = new Set<string>();
  salariesAvecEstimations.forEach(id => {
    snapshot[id].forEach((d: any) => allEstimatedDates.add(d.date));
  });

  const fichesData = await batchQueryIn<{ id: string; salarie_id: string }>("fiches", "id, salarie_id", "salarie_id", salariesAvecEstimations, {
    extraFilters: (q: any) => q.eq("entreprise_id", entrepriseId).in("statut", ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]),
  });

  if (fichesData.length === 0) return result;

  const ficheIds = fichesData.map(f => f.id);
  const ficheSalarieMap = new Map<string, string>();
  fichesData.forEach(f => { ficheSalarieMap.set(f.id, f.salarie_id); });

  const allDates = [...allEstimatedDates];
  const joursReels = await batchQueryIn<any>(
    "fiches_jours",
    "fiche_id, date, heures, PA, code_trajet, HI, type_absence",
    "fiche_id",
    ficheIds,
    {
      extraFilters: (q: any) => q.in("date", allDates),
    }
  );

  const reelBySalarie = new Map<string, Map<string, any>>();
  (joursReels || []).forEach((j: any) => {
    const salarieId = ficheSalarieMap.get(j.fiche_id);
    if (!salarieId) return;
    if (!reelBySalarie.has(salarieId)) reelBySalarie.set(salarieId, new Map());
    const dateMap = reelBySalarie.get(salarieId)!;
    const existing = dateMap.get(j.date);
    if (!existing || (Number(j.heures) || 0) > (Number(existing.heures) || 0)) {
      dateMap.set(j.date, j);
    }
  });

  for (const salarieId of salariesAvecEstimations) {
    const estimatedDays = snapshot[salarieId];
    const reelMap = reelBySalarie.get(salarieId) || new Map();

    let deltaHeures = 0;
    let deltaPaniers = 0;
    const deltaTrajetsCodes: string[] = [];

    for (const estDay of estimatedDays) {
      const reel = reelMap.get(estDay.date);
      const dateFormatted = format(parseISO(estDay.date), "dd/MM");
      const estHeures = estDay.heures || 0;
      const estPanier = estDay.panier ? 1 : 0;
      const estTrajet = estDay.code_trajet || null;

      if (reel) {
        const reelHeures = Number(reel.heures) || 0;
        const reelPanier = reel.PA ? 1 : 0;
        const reelTrajet = reel.code_trajet || null;
        deltaHeures += reelHeures - estHeures;
        deltaPaniers += reelPanier - estPanier;
        if (estTrajet !== reelTrajet) {
          deltaTrajetsCodes.push(`${dateFormatted}: ${estTrajet || '∅'}→${reelTrajet || '∅'}`);
        }
      } else {
        deltaHeures -= estHeures;
        deltaPaniers -= estPanier;
      }
    }

    if (deltaHeures === 0 && deltaPaniers === 0 && deltaTrajetsCodes.length === 0) continue;

    const parts: string[] = [];
    if (deltaHeures !== 0) {
      const sign = deltaHeures > 0 ? "+" : "";
      parts.push(`H: ${sign}${Math.round(deltaHeures * 100) / 100}h`);
    }
    if (deltaPaniers !== 0) {
      const sign = deltaPaniers > 0 ? "+" : "";
      parts.push(`PA: ${sign}${deltaPaniers}`);
    }
    if (deltaTrajetsCodes.length > 0) {
      const pairCounts = new Map<string, number>();
      deltaTrajetsCodes.forEach(change => {
        const match = change.match(/: (.+)/);
        if (match) {
          const key = match[1];
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      });
      const pairEntries = [...pairCounts.entries()];
      const MAX_PAIRS = 4;
      const displayed = pairEntries.slice(0, MAX_PAIRS).map(([pair, count]) => 
        count > 1 ? `${pair} (x${count})` : pair
      );
      const remaining = pairEntries.length - MAX_PAIRS;
      let trajetText = `T: ${displayed.join(", ")}`;
      if (remaining > 0) trajetText += ` + ${remaining} autre(s)`;
      parts.push(trajetText);
    }

    result.set(salarieId, parts.join(" | "));
  }

  return result;
}

/**
 * Construit le snapshot des estimations pour la clôture
 */
export function buildSnapshotEstimations(
  employees: EmployeeWithDetails[]
): Record<string, any[]> | null {
  const snapshot: Record<string, any[]> = {};

  employees.forEach(emp => {
    const estimatedDays = emp.detailJours.filter(
      (j: any) => j.is_estimated === true
    );
    if (estimatedDays.length > 0) {
      snapshot[emp.salarieId] = estimatedDays.map(j => ({
        date: j.date,
        heures: j.heures,
        panier: j.panier,
        code_trajet: j.trajet,
        intemperie: j.intemperie,
      }));
    }
  });

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}
