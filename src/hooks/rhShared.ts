import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";

export interface RHFilters {
  periode?: string;
  semaine?: string;
  conducteur?: string;
  chantier?: string;
  chef?: string;
  salarie?: string;
  typeSalarie?: string;
}

export interface EmployeeDetail {
  date: string;
  chantierCode: string;
  chantierVille: string;
  heures: number;
  intemperie: number;
  panier: boolean;
  trajet: string | null;
  trajetPerso: boolean;
  typeAbsence?: string;
  isAbsent: boolean; // true si heures=0 ET intemperie=0 (employé pas présent)
  regularisationM1?: string;
  autresElements?: string;
  commentaire?: string;
}

export interface EmployeeWithDetails {
  salarieId: string;
  id: string; // Alias pour compatibilité UI
  nom: string;
  prenom: string;
  metier: string;
  libelle_emploi: string | null;
  role: string; // chef/macon/interimaire/finisseur (pour UI)
  isChef: boolean; // Flag pour affichage badge chef
  agence_interim: string | null;
  chantier_codes: string[]; // Codes des chantiers (pour colonne Chantier)
  heuresNormales: number;
  heuresSupp25: number; // Heures supp à 25% (36e-43e heure)
  heuresSupp50: number; // Heures supp à 50% (au-delà 43e heure)
  heuresSupp: number;    // Total heures supp (25% + 50%)
  intemperies: number;
  absences: number;
  paniers: number;
  trajetsParCode: Record<string, number>;
  totalJoursTrajets: number;
  totalHeures: number;
  statut: string;
  anomalies?: string[];
  detailJours: EmployeeDetail[];
  hasUnqualifiedAbsences: boolean; // True si au moins 1 absence sans type_absence
  
  // Champs contractuels
  matricule?: string | null;
  echelon?: string | null;
  niveau?: string | null;
  degre?: string | null;
  statut_employe?: string | null;
  type_contrat?: string | null;
  horaire?: string | null;
  heures_supp_mensualisees?: number | null;
  forfait_jours?: boolean | null;
  salaire?: number | null;
  
  // 🆕 Nouveaux champs pour pré-export
  ficheId?: string | null;
  absences_export_override?: Record<string, number> | null;
  trajets_export_override?: Record<string, number> | null;
  acomptes?: string | null;
  prets?: string | null;
  commentaire_rh?: string | null;
  notes_paie?: string | null;
  total_saisie?: string | null;
  saisie_du_mois?: string | null;
  commentaire_saisie?: string | null;
  regularisation_m1_export?: string | null;
  autres_elements_export?: string | null;
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
export const calculateHeuresSuppBTP = (
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
    const heuresSemaine = joursDeUneSemaine
      .filter(j => {
        const d = parseISO(j.date);
        const dayOfWeek = d.getDay(); // 0=Dimanche, 1=Lundi, ..., 5=Vendredi, 6=Samedi
        const isLundiVendredi = dayOfWeek >= 1 && dayOfWeek <= 5;
        const estTravail = !j.isAbsent; // On exclut les absences
        return isLundiVendredi && estTravail;
      })
      .reduce((sum, j) => sum + j.heures, 0);
    
    // Logique BTP : base 39h, 4h structurelles (36-39)
    // - Heures 36-43 (inclus) → 25% (max 8h)
    // - Heures > 43 → 50%
    if (heuresSemaine > 35) {
      const heuresAuDelaDe35 = heuresSemaine - 35;
      
      if (heuresAuDelaDe35 <= 8) {
        // Toutes les heures au-delà de 35h vont en 25%
        totalHeuresSupp25 += heuresAuDelaDe35;
      } else {
        // 8 premières heures (36-43) en 25%, le reste en 50%
        totalHeuresSupp25 += 8;
        totalHeuresSupp50 += heuresAuDelaDe35 - 8;
      }
    }
  });
  
  return {
    heuresSupp25: Math.round(totalHeuresSupp25 * 100) / 100,
    heuresSupp50: Math.round(totalHeuresSupp50 * 100) / 100,
  };
};

/**
 * Source de vérité unique pour la consolidation RH
 * Utilisée par l'écran ET l'export Excel pour garantir la cohérence
 */
export const buildRHConsolidation = async (filters: RHFilters): Promise<EmployeeWithDetails[]> => {
  const mois = filters.periode || format(new Date(), "yyyy-MM");
  const [year, month] = mois.split("-").map(Number);
  const dateDebut = startOfMonth(new Date(year, month - 1));
  const dateFin = endOfMonth(new Date(year, month - 1));
  
  // Récupérer l'entreprise_id depuis localStorage
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  console.log(`[RH Consolidation] Période: ${mois}, Entreprise: ${entrepriseId}, Filtres:`, filters);

  // Récupérer toutes les fiches validées (filtrées par entreprise via chantiers)
  let fichesQuery = supabase
    .from("fiches")
    .select(`
      id,
      semaine,
      statut,
      salarie_id,
      chantier_id,
      absences_export_override,
      trajets_export_override,
      acomptes,
      prets,
      commentaire_rh,
      notes_paie,
      total_saisie,
      saisie_du_mois,
      commentaire_saisie,
      regularisation_m1_export,
      autres_elements_export,
      chantiers!inner(
        code_chantier,
        ville,
        conducteur_id,
        chef_id,
        entreprise_id
      )
    `)
    .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"]);
  
  // Filtre par entreprise via chantiers
  if (entrepriseId) {
    fichesQuery = fichesQuery.eq("chantiers.entreprise_id", entrepriseId);
  }

  // Filtre par chantier
  if (filters.chantier && filters.chantier !== "all") {
    fichesQuery = fichesQuery.eq("chantier_id", filters.chantier);
  }

  // Filtre par conducteur (via chantier)
  if (filters.conducteur && filters.conducteur !== "all") {
    fichesQuery = fichesQuery.eq("chantiers.conducteur_id", filters.conducteur);
  }

  // Filtre par chef (via chantier)
  if (filters.chef && filters.chef !== "all") {
    fichesQuery = fichesQuery.eq("chantiers.chef_id", filters.chef);
  }

  const { data: fichesAvecChantier, error: ficheError } = await fichesQuery;
  if (ficheError) throw ficheError;

  // Récupérer les fiches des finisseurs (sans chantier)
  let finisseursQuery = supabase
    .from("fiches")
    .select(`
      id,
      semaine,
      statut,
      salarie_id,
      chantier_id,
      absences_export_override,
      trajets_export_override,
      acomptes,
      prets,
      commentaire_rh,
      notes_paie,
      total_saisie,
      saisie_du_mois,
      commentaire_saisie,
      regularisation_m1_export,
      autres_elements_export
    `)
    .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"])
    .is("chantier_id", null);

  const { data: fichesFinisseurs, error: finisseursError } = await finisseursQuery;
  if (finisseursError) throw finisseursError;

  // Combiner toutes les fiches et filtrer par mois
  const toutesLesFiches = [...(fichesAvecChantier || []), ...(fichesFinisseurs || [])];
  const fichesDuMois = toutesLesFiches.filter(fiche => {
    if (!fiche.semaine) return false;
    try {
      const mondayOfWeek = parseISOWeek(fiche.semaine);
      
      // Filtre par semaine spécifique si demandé
      if (filters.semaine && filters.semaine !== "all") {
        return fiche.semaine === filters.semaine;
      }
      
      // Sinon filtre par mois: inclure les semaines qui chevauchent le mois
      const fridayOfWeek = new Date(mondayOfWeek);
      fridayOfWeek.setDate(fridayOfWeek.getDate() + 4);
      return mondayOfWeek <= dateFin && fridayOfWeek >= dateDebut;
    } catch {
      return false;
    }
  });

  if (fichesDuMois.length === 0) {
    console.log(`[RH Consolidation] Aucune fiche trouvée`);
    return [];
  }

  const ficheIds = fichesDuMois.map(f => f.id);

  // Récupérer les salariés (filtrés par entreprise)
  const salarieIds = [...new Set(fichesDuMois.map(f => f.salarie_id).filter(Boolean))];
  
  let salarieQuery = supabase
    .from("utilisateurs")
    .select("id, nom, prenom, agence_interim, role_metier, libelle_emploi, matricule, echelon, niveau, degre, statut, type_contrat, horaire, heures_supp_mensualisees, forfait_jours, salaire")
    .in("id", salarieIds);
  
  if (entrepriseId) {
    salarieQuery = salarieQuery.eq("entreprise_id", entrepriseId);
  }
  
  const { data: salarieData, error: salarieError } = await salarieQuery;

  if (salarieError) throw salarieError;

  const salarieMap = new Map(salarieData?.map(s => [s.id, s]) || []);

  // Récupérer les rôles système (pour exclure conducteurs et RH)
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", salarieIds);

  const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

  // Récupérer les chefs (via chantiers)
  const { data: chantiersData } = await supabase
    .from("chantiers")
    .select("id, chef_id");

  const chefIds = new Set(chantiersData?.map(c => c.chef_id).filter(Boolean) || []);

  // Récupérer les affectations finisseurs pour filtrage
  let affectationsQuery = supabase
    .from("affectations_finisseurs_jours")
    .select("finisseur_id, conducteur_id, date")
    .gte("date", format(dateDebut, "yyyy-MM-dd"))
    .lte("date", format(dateFin, "yyyy-MM-dd"));

  // Filtre par conducteur pour finisseurs
  if (filters.conducteur && filters.conducteur !== "all") {
    affectationsQuery = affectationsQuery.eq("conducteur_id", filters.conducteur);
  }

  const { data: affectationsData } = await affectationsQuery;
  const affectationsMap = new Map<string, Set<string>>();
  
  affectationsData?.forEach(aff => {
    if (!affectationsMap.has(aff.finisseur_id)) {
      affectationsMap.set(aff.finisseur_id, new Set());
    }
    affectationsMap.get(aff.finisseur_id)!.add(aff.date);
  });

  // Récupérer les jours de toutes les fiches
  const { data: joursData, error: joursError } = await supabase
    .from("fiches_jours")
    .select("fiche_id, date, HNORM, HI, PA, code_trajet, trajet_perso, heures, code_chantier_du_jour, ville_du_jour, type_absence, regularisation_m1, autres_elements, commentaire")
    .in("fiche_id", ficheIds);

  if (joursError) throw joursError;

  // Construire la map des fiches par salarié
  const fichesBySalarie = new Map<string, typeof fichesDuMois>();
  fichesDuMois.forEach(fiche => {
    if (!fiche.salarie_id) return;
    if (!fichesBySalarie.has(fiche.salarie_id)) {
      fichesBySalarie.set(fiche.salarie_id, []);
    }
    fichesBySalarie.get(fiche.salarie_id)!.push(fiche);
  });

  // Agréger par salarié
  const employeeMap = new Map<string, EmployeeWithDetails>();

  for (const [salarieId, fiches] of fichesBySalarie.entries()) {
    const salarie = salarieMap.get(salarieId);
    if (!salarie) continue;

    const roleFromUser = rolesMap.get(salarieId);

    // Exclure les conducteurs et RH (forfait cadre)
    if (roleFromUser === "conducteur" || roleFromUser === "rh") {
      continue;
    }

    // Filtre par type de salarié
    const isChef = chefIds.has(salarieId);
    const isFinisseur = salarie.role_metier === "finisseur";
    const isGrutier = salarie.role_metier === "grutier";
    const isInterimaire = !!salarie.agence_interim && !isChef && !isFinisseur && !isGrutier;
    const isMacon = !isChef && !isFinisseur && !isGrutier && !isInterimaire;

    if (filters.typeSalarie && filters.typeSalarie !== "all") {
      if (filters.typeSalarie === "chef" && !isChef) continue;
      if (filters.typeSalarie === "macon" && !isMacon) continue;
      if (filters.typeSalarie === "interimaire" && !isInterimaire) continue;
      if (filters.typeSalarie === "finisseur" && !isFinisseur) continue;
    }

    // Filtre par salarié spécifique
    if (filters.salarie && filters.salarie !== "all" && salarieId !== filters.salarie) {
      continue;
    }

    // Déterminer le métier
    const metierDefault = isChef 
      ? "Chef" 
      : isFinisseur
        ? "Finisseur"
        : isGrutier
          ? "Grutier"
          : isInterimaire
            ? "Intérimaire"
            : "Maçon";
    
    const metier = metierDefault;
    const libelleEmploi = salarie.libelle_emploi;

        let heuresNormales = 0;
        let intemperies = 0;
        let absences = 0;
        let paniers = 0;
        const trajetsParCode: Record<string, number> = {}; // ✅ NOUVEAU
        let totalJoursTrajets = 0; // ✅ NOUVEAU
        let totalHeures = 0;
        const detailJours: EmployeeDetail[] = [];

    for (const fiche of fiches) {
      const joursFiche = joursData?.filter(j => j.fiche_id === fiche.id) || [];

      for (const jour of joursFiche) {
        // 🔥 NOUVEAU : Filtre par date quand on consolide par mois
        if (filters.periode && (!filters.semaine || filters.semaine === "all")) {
          const jourDate = new Date(jour.date);
          if (jourDate < dateDebut || jourDate > dateFin) {
            continue; // Ce jour n'est pas dans le mois, on l'ignore
          }
        }

        // Pour les finisseurs AUTONOMES (sans chantier_id), vérifier qu'ils sont affectés ce jour-là
        // Les finisseurs avec chantier_id sont traités comme des maçons (via affectations classiques)
        if (isFinisseur && !fiche.chantier_id) {
          const datesAffectees = affectationsMap.get(salarieId);
          // Si le finisseur a des affectations journalières, on filtre
          if (datesAffectees && datesAffectees.size > 0) {
            if (!datesAffectees.has(jour.date)) {
              continue; // Ignorer ce jour si non affecté
            }
          }
          // Sinon (pas d'affectations journalières), on traite comme un maçon
        }

        // Calcul des heures: priorité à heures, sinon HNORM
        const heuresDuJour = Number(jour.heures) || Number(jour.HNORM) || 0;
        const intemperie = Number(jour.HI) || 0;
        const panier = jour.PA === true;
        
        const isTrajetPerso = jour.trajet_perso === true;

        heuresNormales += heuresDuJour;
        intemperies += intemperie;
        totalHeures += heuresDuJour;
        
        if (heuresDuJour === 0 && intemperie === 0) {
          absences++;
        }
        
        if (jour.PA) paniers++;
        
        // ✅ NOUVEAU : Compteur par code trajet
        if ((jour as any).code_trajet) {
          trajetsParCode[(jour as any).code_trajet] = (trajetsParCode[(jour as any).code_trajet] || 0) + 1;
          totalJoursTrajets++;
        }

        // Déterminer si c'est une absence (employé pas présent)
        const isAbsent = heuresDuJour === 0 && intemperie === 0;

        detailJours.push({
          date: jour.date || "",
          chantierCode: jour.code_chantier_du_jour || "",
          chantierVille: jour.ville_du_jour || "",
          heures: heuresDuJour,
          intemperie,
          panier,
          trajet: (jour as any).code_trajet || null,  // ✅ Code trajet
          trajetPerso: (jour as any).code_trajet === "T_PERSO",
          typeAbsence: (jour as any).type_absence || null,
          isAbsent,
          regularisationM1: (jour as any).regularisation_m1 || "",
          autresElements: (jour as any).autres_elements || "",
          commentaire: (jour as any).commentaire || "",
        });
      }
    }

    // Ne créer l'entrée que si le salarié a des données
    if (totalHeures > 0 || absences > 0 || paniers > 0) {
      // Collecter les codes chantier uniques depuis les jours
      const chantierCodesFromJours = detailJours
        .map(j => j.chantierCode)
        .filter(Boolean);
      
      // Ajouter aussi les codes depuis les fiches (fallback si jours n'ont pas de code)
      const chantierCodesFromFiches = fiches
        .map(f => (f as any).chantiers?.code_chantier)
        .filter(Boolean);
      
      const chantierCodes = [...new Set([...chantierCodesFromJours, ...chantierCodesFromFiches])];

      // Déterminer le role sans accent pour la UI
      const role = isChef ? "chef" : isFinisseur ? "finisseur" : isGrutier ? "grutier" : isInterimaire ? "interimaire" : "macon";

      // Détecter les absences non qualifiées
      const hasUnqualifiedAbsences = detailJours.some(
        jour => jour.isAbsent && (!jour.typeAbsence || jour.typeAbsence === "A_QUALIFIER")
      );

      // Calculer les heures supplémentaires BTP
      const { heuresSupp25, heuresSupp50 } = calculateHeuresSuppBTP(detailJours, mois);
      const heuresSupp = heuresSupp25 + heuresSupp50;

      employeeMap.set(salarieId, {
        salarieId,
        id: salarieId, // Alias pour UI
        nom: salarie.nom || "",
        prenom: salarie.prenom || "",
        metier,
        libelle_emploi: libelleEmploi,
        role,
        isChef,
        agence_interim: salarie.agence_interim || null,
        chantier_codes: chantierCodes,
        heuresNormales: Math.round(heuresNormales * 100) / 100,
        heuresSupp25: Math.round(heuresSupp25 * 100) / 100,
        heuresSupp50: Math.round(heuresSupp50 * 100) / 100,
        heuresSupp: Math.round(heuresSupp * 100) / 100,
        intemperies: Math.round(intemperies * 100) / 100,
        absences,
        paniers,
        trajetsParCode,
        totalJoursTrajets,
        totalHeures: Math.round(totalHeures * 100) / 100,
        statut: fiches.every(f => f.statut === "AUTO_VALIDE") ? "Validé" : "Partiel",
        detailJours,
        hasUnqualifiedAbsences,
        
        // Champs contractuels
        matricule: salarie.matricule || null,
        echelon: salarie.echelon || null,
        niveau: salarie.niveau || null,
        degre: salarie.degre || null,
        statut_employe: salarie.statut || null,
        type_contrat: salarie.type_contrat || null,
        horaire: salarie.horaire || null,
        heures_supp_mensualisees: salarie.heures_supp_mensualisees || null,
        forfait_jours: salarie.forfait_jours || null,
        salaire: salarie.salaire || null,
        
        // 🆕 Nouveaux champs pour pré-export (depuis la première fiche du mois)
        ficheId: fiches[0]?.id || null,
        absences_export_override: (fiches[0] as any)?.absences_export_override || null,
        trajets_export_override: (fiches[0] as any)?.trajets_export_override || null,
        acomptes: (fiches[0] as any)?.acomptes || null,
        prets: (fiches[0] as any)?.prets || null,
        commentaire_rh: (fiches[0] as any)?.commentaire_rh || null,
        notes_paie: (fiches[0] as any)?.notes_paie || null,
        total_saisie: (fiches[0] as any)?.total_saisie || null,
        saisie_du_mois: (fiches[0] as any)?.saisie_du_mois || null,
        commentaire_saisie: (fiches[0] as any)?.commentaire_saisie || null,
        regularisation_m1_export: (fiches[0] as any)?.regularisation_m1_export || null,
        autres_elements_export: (fiches[0] as any)?.autres_elements_export || null,
      });
    }
  }

  const result = Array.from(employeeMap.values()).sort((a, b) => {
    // Tri par métier puis par nom
    const metierOrder = { Chef: 0, Maçon: 1, Grutier: 2, Intérimaire: 3, Finisseur: 4 };
    const aOrder = metierOrder[a.metier as keyof typeof metierOrder] ?? 4;
    const bOrder = metierOrder[b.metier as keyof typeof metierOrder] ?? 4;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.nom.localeCompare(b.nom);
  });

  console.log(`[RH Consolidation] ${result.length} salariés trouvés`);
  return result;
};
