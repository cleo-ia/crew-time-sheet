import { buildRHConsolidation, RHFilters, EmployeeDetail } from "./rhShared";
import { startOfWeek, format, parseISO } from "date-fns";

export interface RHExportEmployee {
  // Données contractuelles
  matricule: string;
  nom: string;
  prenom: string;
  libelle_emploi: string;
  echelon: string;
  niveau: string;
  degre: string;
  statut: string;
  type_contrat: string;
  horaire: string;
  heures_supp_mensualisees: number;
  forfait_jours: boolean;
  salaire: number;
  commentaires: string;
  
  // Données MDE (existantes)
  metier: string;
  agence_interim: string | null;
  heuresNormales: number;
  heuresSupp25: number; // Heures supp à 25% (36e-43e heure)
  heuresSupp50: number; // Heures supp à 50% (au-delà 43e heure)
  absences: number;
  indemnitesRepas: number;
  indemnitesTrajet: number;
  indemnitesTrajetPerso: number;
  primeAnciennete: number;
  intemperies: number;
  
  // Trajets détaillés par code
  trajetTPerso: number;
  trajetT1: number;
  trajetT2: number;
  trajetT3: number;
  trajetT4: number;
  trajetT5: number;
  trajetT6: number;
  trajetT7: number;
  trajetT8: number;
  trajetT9: number;
  trajetT10: number;
  trajetT11: number;
  trajetT12: number;
  trajetT13: number;
  trajetT14: number;
  trajetT15: number;
  trajetT16: number;
  trajetT17: number;
  trajetT31: number;
  trajetT35: number;
  trajetGD: number;
  totalHeures: number;
  statut_fiche: string;
  detailJours?: Array<{
    date: string;
    chantierCode: string;
    chantierVille: string;
    heures: number;
    intemperie: number;
    panier: boolean;
    trajet: string | null;
    trajetPerso: boolean;
    typeAbsence?: string;
    isAbsent: boolean; // true si heures=0 ET intemperie=0
    regularisationM1?: string;
    autresElements?: string;
  }>;
}

/**
 * Calcule les heures supplémentaires BTP par semaine pour un mois donné
 * Logique : Contrat 39h → 4h structurelles incluses (36e-39e)
 * - Heures à 25% : 36e à 43e heure (max 8h/semaine)
 * - Heures à 50% : au-delà de 43e heure
 * - Semaine = Lundi-Vendredi uniquement
 * - Attribution au mois où tombe le lundi (Option A)
 * 
 * @param detailJours - Tous les jours travaillés (peut inclure plusieurs mois)
 * @param moisCible - Mois au format "YYYY-MM" pour lequel on calcule
 * @returns { heuresSupp25: number, heuresSupp50: number }
 */
const calculateHeuresSuppBTP = (
  detailJours: EmployeeDetail[],
  moisCible: string
): { heuresSupp25: number; heuresSupp50: number } => {
  const [annee, mois] = moisCible.split("-").map(Number);
  
  // Grouper les jours par semaine civile (lundi = début de semaine ISO)
  const joursParSemaine = new Map<string, EmployeeDetail[]>();
  
  detailJours.forEach(jour => {
    const dateObj = parseISO(jour.date);
    // Obtenir le lundi de la semaine (ISO 8601)
    const lundi = startOfWeek(dateObj, { weekStartsOn: 1 }); // 1 = Lundi
    const weekKey = format(lundi, 'yyyy-MM-dd');
    
    if (!joursParSemaine.has(weekKey)) {
      joursParSemaine.set(weekKey, []);
    }
    joursParSemaine.get(weekKey)!.push(jour);
  });
  
  let totalHeuresSupp25 = 0;
  let totalHeuresSupp50 = 0;
  
  // Calculer pour chaque semaine DONT LE LUNDI APPARTIENT AU MOIS CIBLE
  joursParSemaine.forEach((joursDeUneSemaine, weekKey) => {
    const lundi = parseISO(weekKey);
    const lundiAnnee = lundi.getFullYear();
    const lundiMois = lundi.getMonth() + 1; // getMonth() retourne 0-11
    
    // ⚠️ OPTION A : On ne traite que les semaines dont le lundi est dans le mois cible
    if (lundiAnnee !== annee || lundiMois !== mois) {
      return; // Ignorer cette semaine (son lundi n'est pas dans le mois demandé)
    }
    
    // Total heures TRAVAILLÉES dans la semaine (lundi-vendredi uniquement)
    // ❌ Exclure : absences (isAbsent=true) et intempéries
    const totalHeuresSemaine = joursDeUneSemaine.reduce((sum, jour) => {
      // Ne compter QUE les heures réellement travaillées
      const heuresTravaillees = jour.isAbsent ? 0 : (jour.heures || 0);
      return sum + heuresTravaillees;
    }, 0);
    
    // 🧮 CALCUL DES HEURES SUPP BTP (législation + contrat 39h)
    // Heures à 25% : de la 36e à la 43e heure (plafonné à 8h/semaine)
    const heuresSupp25Semaine = Math.min(8, Math.max(0, totalHeuresSemaine - 35));
    
    // Heures à 50% : au-delà de la 43e heure (pas de plafond)
    const heuresSupp50Semaine = Math.max(0, totalHeuresSemaine - 43);
    
    totalHeuresSupp25 += heuresSupp25Semaine;
    totalHeuresSupp50 += heuresSupp50Semaine;
    
    console.log(`[Heures Supp BTP] Semaine ${weekKey}: ${totalHeuresSemaine}h → 25%: ${heuresSupp25Semaine}h, 50%: ${heuresSupp50Semaine}h`);
  });
  
  return {
    heuresSupp25: totalHeuresSupp25,
    heuresSupp50: totalHeuresSupp50,
  };
};

/**
 * Récupère les données RH pour export Excel (cumul mensuel)
 * Utilise buildRHConsolidation pour garantir cohérence avec l'écran
 */
export const fetchRHExportData = async (mois: string, filters: RHFilters = {}): Promise<RHExportEmployee[]> => {
  console.log(`[RH Export] Export Excel pour ${mois} avec filtres:`, filters);

  // Utiliser la source de vérité unique
  const consolidatedData = await buildRHConsolidation({
    ...filters,
    periode: mois,
  });

  // Convertir vers le format RHExportEmployee
  const result: RHExportEmployee[] = consolidatedData.map(emp => {
    // 🆕 CALCUL AUTOMATIQUE DES HEURES SUPP BTP
    const { heuresSupp25, heuresSupp50 } = calculateHeuresSuppBTP(emp.detailJours, mois);
    
    return {
      // Données contractuelles
      matricule: emp.matricule || "",
      nom: emp.nom,
      prenom: emp.prenom,
      libelle_emploi: emp.metier,
      echelon: emp.echelon || "",
      niveau: emp.niveau || "",
      degre: emp.degre || "",
      statut: emp.statut_employe || "",
      type_contrat: emp.type_contrat || "",
      horaire: emp.horaire || "",
      heures_supp_mensualisees: emp.heures_supp_mensualisees || 0,
      forfait_jours: emp.forfait_jours || false,
      salaire: emp.salaire || 0,
      commentaires: emp.detailJours.map(j => j.commentaire).filter(Boolean).join(" | "),
      
      // Données MDE
      metier: emp.metier,
      agence_interim: emp.agence_interim,
      heuresNormales: emp.heuresNormales,
      heuresSupp25, // 🆕 Calculé automatiquement
      heuresSupp50, // 🆕 Calculé automatiquement
      absences: emp.absences,
    indemnitesRepas: emp.paniers,
    indemnitesTrajet: emp.totalJoursTrajets - (emp.trajetsParCode.T_PERSO || 0),
    indemnitesTrajetPerso: emp.trajetsParCode.T_PERSO || 0,
    
    // Trajets détaillés
    trajetTPerso: emp.trajetsParCode.T_PERSO || 0,
    trajetT1: emp.trajetsParCode.T1 || 0,
    trajetT2: emp.trajetsParCode.T2 || 0,
    trajetT3: emp.trajetsParCode.T3 || 0,
    trajetT4: emp.trajetsParCode.T4 || 0,
    trajetT5: emp.trajetsParCode.T5 || 0,
    trajetT6: emp.trajetsParCode.T6 || 0,
    trajetT7: emp.trajetsParCode.T7 || 0,
    trajetT8: emp.trajetsParCode.T8 || 0,
    trajetT9: emp.trajetsParCode.T9 || 0,
    trajetT10: emp.trajetsParCode.T10 || 0,
    trajetT11: emp.trajetsParCode.T11 || 0,
    trajetT12: emp.trajetsParCode.T12 || 0,
    trajetT13: emp.trajetsParCode.T13 || 0,
    trajetT14: emp.trajetsParCode.T14 || 0,
    trajetT15: emp.trajetsParCode.T15 || 0,
    trajetT16: emp.trajetsParCode.T16 || 0,
    trajetT17: emp.trajetsParCode.T17 || 0,
    trajetT31: emp.trajetsParCode.T31 || 0,
    trajetT35: emp.trajetsParCode.T35 || 0,
    trajetGD: emp.trajetsParCode.GD || 0,
      primeAnciennete: 0,
      intemperies: emp.intemperies,
      totalHeures: emp.totalHeures,
      statut_fiche: emp.statut,
      detailJours: emp.detailJours.map(jour => ({
        date: jour.date,
        chantierCode: jour.chantierCode,
        chantierVille: jour.chantierVille,
        heures: jour.heures,
        intemperie: jour.intemperie,
        panier: jour.panier,
        trajet: jour.trajet,
        trajetPerso: jour.trajetPerso,
        typeAbsence: jour.typeAbsence,
        isAbsent: jour.isAbsent,
        regularisationM1: jour.regularisationM1,
        autresElements: jour.autresElements,
      })),
    };
  });

  console.log(`[RH Export] ${result.length} salariés exportés (identique à l'écran)`);
  return result;
};
