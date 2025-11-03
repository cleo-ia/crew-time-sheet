import { buildRHConsolidation, RHFilters } from "./rhShared";

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
  
  // Données MDE (existantes)
  metier: string;
  agence_interim: string | null;
  heuresNormales: number;
  heuresSupp: number;
  absences: number;
  indemnitesRepas: number;
  indemnitesTrajet: number;
  indemnitesTrajetPerso: number;
  primeAnciennete: number;
  intemperies: number;
  totalHeures: number;
  statut_fiche: string;
  detailJours?: Array<{
    date: string;
    chantierCode: string;
    chantierVille: string;
    heures: number;
    intemperie: number;
    panier: boolean;
    trajet: number;
    trajetPerso: boolean;
    typeAbsence?: string;
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
  const result: RHExportEmployee[] = consolidatedData.map(emp => ({
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
    
    // Données MDE
    metier: emp.metier,
    agence_interim: emp.agence_interim,
    heuresNormales: emp.heuresNormales,
    heuresSupp: emp.intemperies, // HI = intempéries
    absences: emp.absences,
    indemnitesRepas: emp.paniers,
    indemnitesTrajet: emp.trajets,
    indemnitesTrajetPerso: emp.trajetsPerso,
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
    })),
  }));

  console.log(`[RH Export] ${result.length} salariés exportés (identique à l'écran)`);
  return result;
};
