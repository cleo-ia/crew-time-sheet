import { buildRHConsolidation, RHFilters, EmployeeDetail, calculateHeuresSuppBTP } from "./rhShared";
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
  
  // 🆕 Nouveaux champs pour pré-export
  ficheId?: string; // ID de la fiche pour les updates
  acomptes?: string;
  prets?: string;
  commentaire_rh?: string;
  notes_paie?: string;
  totalSaisie?: string;
  saisieDuMois?: string;
  commentaireSaisie?: string;
  regularisationM1?: string;
  autresElements?: string;
  
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
    
    // 🆕 Récupérer les overrides si présents (pas encore implémenté dans buildRHConsolidation)
    const absencesOverride = (emp as any).absences_export_override;
    const trajetsOverride = (emp as any).trajets_export_override;
    
    return {
      // Données contractuelles
      matricule: emp.matricule || "",
      nom: emp.nom,
      prenom: emp.prenom,
      libelle_emploi: emp.libelle_emploi || emp.metier,
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
      
      // Trajets détaillés (avec override si présent)
      trajetTPerso: trajetsOverride?.T_PERSO ?? (emp.trajetsParCode.T_PERSO || 0),
      trajetT1: trajetsOverride?.T1 ?? (emp.trajetsParCode.T1 || 0),
      trajetT2: trajetsOverride?.T2 ?? (emp.trajetsParCode.T2 || 0),
      trajetT3: trajetsOverride?.T3 ?? (emp.trajetsParCode.T3 || 0),
      trajetT4: trajetsOverride?.T4 ?? (emp.trajetsParCode.T4 || 0),
      trajetT5: trajetsOverride?.T5 ?? (emp.trajetsParCode.T5 || 0),
      trajetT6: trajetsOverride?.T6 ?? (emp.trajetsParCode.T6 || 0),
      trajetT7: trajetsOverride?.T7 ?? (emp.trajetsParCode.T7 || 0),
      trajetT8: trajetsOverride?.T8 ?? (emp.trajetsParCode.T8 || 0),
      trajetT9: trajetsOverride?.T9 ?? (emp.trajetsParCode.T9 || 0),
      trajetT10: trajetsOverride?.T10 ?? (emp.trajetsParCode.T10 || 0),
      trajetT11: trajetsOverride?.T11 ?? (emp.trajetsParCode.T11 || 0),
      trajetT12: trajetsOverride?.T12 ?? (emp.trajetsParCode.T12 || 0),
      trajetT13: trajetsOverride?.T13 ?? (emp.trajetsParCode.T13 || 0),
      trajetT14: trajetsOverride?.T14 ?? (emp.trajetsParCode.T14 || 0),
      trajetT15: trajetsOverride?.T15 ?? (emp.trajetsParCode.T15 || 0),
      trajetT16: trajetsOverride?.T16 ?? (emp.trajetsParCode.T16 || 0),
      trajetT17: trajetsOverride?.T17 ?? (emp.trajetsParCode.T17 || 0),
      trajetT31: trajetsOverride?.T31 ?? (emp.trajetsParCode.T31 || 0),
      trajetT35: trajetsOverride?.T35 ?? (emp.trajetsParCode.T35 || 0),
      trajetGD: trajetsOverride?.GD ?? (emp.trajetsParCode.GD || 0),
      primeAnciennete: 0,
      intemperies: emp.intemperies,
      totalHeures: emp.totalHeures,
      statut_fiche: emp.statut,
      
      // 🆕 Nouveaux champs administratifs
      ficheId: (emp as any).ficheId,
      acomptes: (emp as any).acomptes || "",
      prets: (emp as any).prets || "",
      commentaire_rh: (emp as any).commentaire_rh || "",
      notes_paie: (emp as any).notes_paie || "",
      totalSaisie: (emp as any).total_saisie || "",
      saisieDuMois: (emp as any).saisie_du_mois || "",
      commentaireSaisie: (emp as any).commentaire_saisie || "",
      regularisationM1: (emp as any).regularisation_m1_export || "",
      autresElements: (emp as any).autres_elements_export || "",
      
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
