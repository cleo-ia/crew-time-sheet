import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, getDay, eachDayOfInterval, subMonths, addDays } from "date-fns";
import { batchQueryIn } from "@/lib/supabaseBatch";
import { EmployeeDetail, EmployeeWithDetails } from "./rhShared";

/**
 * Paie Prévisionnelle — Génération des jours estimés et régularisation M-1
 * 
 * Logique :
 * 1. Identifier la "Semaine Socle" = dernière semaine complètement saisie du mois
 * 2. Cloner les données de la Semaine Socle pour les jours manquants
 * 3. Fallback optimiste si la semaine socle est en absence
 * 4. Gestion apprentis (is_ecole) : 7h/jour, pas de panier/trajet
 */

export interface EstimatedDay extends EmployeeDetail {
  is_estimated: true;
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
  // Grouper les jours réels par semaine ISO (dayOfWeek: 1=lundi ... 5=vendredi)
  const joursDuMois = detailJours.filter(j => {
    const d = parseISO(j.date);
    return d >= moisDebut && d <= moisFin;
  });

  // Grouper par numéro de semaine ISO (utiliser le lundi comme clé)
  const weeksMap = new Map<string, Map<number, EmployeeDetail>>();
  
  joursDuMois.forEach(jour => {
    const d = parseISO(jour.date);
    const dayOfWeek = getDay(d); // 0=dim, 1=lun, ..., 5=ven
    if (dayOfWeek < 1 || dayOfWeek > 5) return; // ignorer weekends
    
    // Calculer le lundi de cette semaine
    const monday = addDays(d, 1 - dayOfWeek);
    const weekKey = format(monday, 'yyyy-MM-dd');
    
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, new Map());
    }
    weeksMap.get(weekKey)!.set(dayOfWeek, jour);
  });

  // Trier les semaines par date décroissante pour trouver la dernière
  const sortedWeeks = [...weeksMap.entries()].sort(([a], [b]) => b.localeCompare(a));

  for (const [, joursSemaine] of sortedWeeks) {
    // Vérifier qu'au moins 1 jour a des heures > 0
    const hasWorkedDay = [...joursSemaine.values()].some(j => j.heures > 0);
    // Vérifier que tous les jours ouvrables (lun-ven) qui sont dans le mois sont saisis
    const nbJoursSaisis = joursSemaine.size;
    
    if (hasWorkedDay && nbJoursSaisis >= 3) {
      // Semaine socle trouvée (au moins 3 jours saisis avec du travail)
      return joursSemaine;
    }
  }

  return null;
}

/**
 * Génère les jours estimés pour un salarié pour les dates manquantes du mois
 */
export function generateEstimatedDays(
  detailJours: EmployeeDetail[],
  mois: string,
  options: {
    isEcole?: boolean;
    defaultTrajetCode?: string | null;
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

  // Dates manquantes
  const datesManquantes = tousJoursOuvrables.filter(
    d => !datesReelles.has(format(d, 'yyyy-MM-dd'))
  );

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

  // Trouver la semaine socle
  const semaineSocle = findSemaineSocle(detailJours, moisDebut, moisFin);

  if (semaineSocle) {
    // Vérifier si la semaine socle contient des jours travaillés (heures > 0)
    const hasTravaile = [...semaineSocle.values()].some(j => j.heures > 0 && !j.isAbsent);

    if (hasTravaile) {
      // === CAS NORMAL : cloner la semaine socle ===
      return datesManquantes.map(d => {
        const dow = getDay(d); // 1=lun ... 5=ven
        // Chercher le jour correspondant dans la semaine socle
        const jourRef = semaineSocle.get(dow);
        
        if (jourRef && jourRef.heures > 0) {
          return {
            date: format(d, 'yyyy-MM-dd'),
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
          };
        }
        
        // Jour non trouvé dans la semaine socle → fallback optimiste
        return createOptimisticDay(d, options.defaultTrajetCode);
      });
    }
  }

  // === FALLBACK OPTIMISTE (absence en semaine socle ou pas de semaine socle) ===
  return datesManquantes.map(d => createOptimisticDay(d, options.defaultTrajetCode));
}

/**
 * Crée un jour "optimiste" par défaut : 8h (lun-jeu) / 7h (ven), panier, T1 ou trajet principal
 */
function createOptimisticDay(date: Date, defaultTrajetCode?: string | null): EstimatedDay {
  const dow = getDay(date);
  const heures = dow === 5 ? 7 : 8; // 7h vendredi, 8h lun-jeu
  
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

  // 1. Charger le snapshot du mois M-1 (1 requête)
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

  // Filtrer uniquement les salariés présents dans le snapshot
  const salariesAvecEstimations = salarieIds.filter(id => snapshot[id] && snapshot[id].length > 0);
  if (salariesAvecEstimations.length === 0) return result;

  // Collecter toutes les dates estimées et tous les salarié IDs concernés
  const allEstimatedDates = new Set<string>();
  salariesAvecEstimations.forEach(id => {
    snapshot[id].forEach((d: any) => allEstimatedDates.add(d.date));
  });

  // 2. Charger en batch toutes les fiches + fiches_jours concernées (2 requêtes)
  const fichesData = await batchQueryIn<{ id: string; salarie_id: string }>("fiches", "id, salarie_id", "salarie_id", salariesAvecEstimations, {
    extraFilters: (q: any) => q.eq("entreprise_id", entrepriseId).in("statut", ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]),
  });

  if (fichesData.length === 0) return result;

  const ficheIds = fichesData.map(f => f.id);
  // Map fiche_id -> salarie_id
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

  // Indexer les jours réels par salarié + date
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

  // 3. Calculer les deltas pour chaque salarié (en mémoire, 0 requête)
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
      // Aggregate travel changes by pair (old→new)
      const pairCounts = new Map<string, number>();
      deltaTrajetsCodes.forEach(change => {
        // Extract the transition part (after the date)
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
