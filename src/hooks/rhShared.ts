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
  includeCloture?: boolean;
  agenceInterim?: string; // Filtre par agence d'intérim spécifique
}

export interface EmployeeDetail {
  date: string;
  chantierCode: string;
  chantierVille: string;
  heures: number;
  intemperie: number;
  panier: boolean;
  repasType?: "PANIER" | "RESTO" | null;
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
  base_horaire?: string | null;
  horaire?: string | null;
  heures_supp_mensualisees?: number | null;
  forfait_jours?: boolean | null;
  salaire?: number | null;
  
  // 🆕 Nouveaux champs pour pré-export
  ficheId?: string | null;
  absences_export_override?: Record<string, number> | null;
  trajets_export_override?: Record<string, number> | null;
  absences_baseline?: Record<string, number> | null;
  trajets_baseline?: Record<string, number> | null;
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
  moisCible: string,
  heuresSuppMensualisees: number = 0 // Heures supp déjà incluses dans le salaire
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
    
    // Filtrer les jours lundi-vendredi non absents
    const joursTravailles = joursDeUneSemaine.filter(j => {
      const d = parseISO(j.date);
      const dayOfWeek = d.getDay(); // 0=Dimanche, 1=Lundi, ..., 5=Vendredi, 6=Samedi
      const isLundiVendredi = dayOfWeek >= 1 && dayOfWeek <= 5;
      return isLundiVendredi && !j.isAbsent;
    });

    // Total heures TRAVAILLÉES dans la semaine (lundi-vendredi uniquement)
    const heuresSemaine = joursTravailles.reduce((sum, j) => sum + j.heures, 0);
    
    // Logique BTP : seuil dynamique basé sur les heures supp mensualisées
    const seuilHebdoBase = 35 + (heuresSuppMensualisees * 12 / 52);
    
    // Prorata du seuil en fonction des jours effectivement travaillés
    // Ex: 3 jours travaillés sur 5 → seuil = 35h * 3/5 = 21h
    const nbJoursTravailles = joursTravailles.length;
    const seuilHebdo = nbJoursTravailles < 5 && nbJoursTravailles > 0
      ? seuilHebdoBase * (nbJoursTravailles / 5)
      : seuilHebdoBase;
    
    if (heuresSemaine > seuilHebdo) {
      const heuresAuDelaDuSeuil = heuresSemaine - seuilHebdo;
      
      if (heuresAuDelaDuSeuil <= 8) {
        // Toutes les heures au-delà du seuil vont en 25%
        totalHeuresSupp25 += heuresAuDelaDuSeuil;
      } else {
        // 8 premières heures en 25%, le reste en 50%
        totalHeuresSupp25 += 8;
        totalHeuresSupp50 += heuresAuDelaDuSeuil - 8;
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
  const mois = filters.periode;
  const isAllPeriodes = !mois || mois === "all";
  
  // Calculer les bornes de date si une période spécifique est sélectionnée
  let dateDebut: Date | null = null;
  let dateFin: Date | null = null;
  
  if (!isAllPeriodes) {
    const [year, month] = mois.split("-").map(Number);
    dateDebut = startOfMonth(new Date(year, month - 1));
    dateFin = endOfMonth(new Date(year, month - 1));
  }
  
  // Récupérer l'entreprise_id depuis localStorage
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  console.log(`[RH Consolidation] Période: ${mois}, Entreprise: ${entrepriseId}, Filtres:`, filters);

  // ✅ CORRECTION : Une seule requête - toutes les fiches de l'entreprise avec le bon statut
  // Règle métier : chaque fiche a obligatoirement un chantier_id (plus de filtre chantier_id IS NULL)
  let fichesQuery = supabase
    .from("fiches")
    .select(`
      id,
      semaine,
      statut,
      salarie_id,
      chantier_id,
      entreprise_id,
      absences_export_override,
      trajets_export_override,
      absences_baseline,
      trajets_baseline,
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
    .in("statut", filters.includeCloture 
      ? ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]
      : ["ENVOYE_RH", "AUTO_VALIDE"]);
  
  // Filtre par entreprise (obligatoire pour isolation multi-tenant)
  if (entrepriseId) {
    fichesQuery = fichesQuery.eq("entreprise_id", entrepriseId);
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

  // ✅ Plus de fichesFinisseurs - toutes les fiches ont un chantier_id
  const toutesLesFiches = fichesAvecChantier || [];
  const fichesDuMois = toutesLesFiches.filter(fiche => {
    if (!fiche.semaine) return false;
    try {
      const mondayOfWeek = parseISOWeek(fiche.semaine);
      
      // Filtre par semaine spécifique si demandé
      if (filters.semaine && filters.semaine !== "all") {
        return fiche.semaine === filters.semaine;
      }
      
      // Si "Toutes" les périodes, inclure toutes les fiches
      if (isAllPeriodes) {
        return true;
      }
      
      // Sinon filtre par mois: inclure les semaines qui chevauchent le mois
      const fridayOfWeek = new Date(mondayOfWeek);
      fridayOfWeek.setDate(fridayOfWeek.getDate() + 4);
      return mondayOfWeek <= dateFin! && fridayOfWeek >= dateDebut!;
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
    .select("id, nom, prenom, agence_interim, role_metier, libelle_emploi, matricule, echelon, niveau, degre, statut, type_contrat, base_horaire, horaire, heures_supp_mensualisees, forfait_jours, salaire")
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
    .select("finisseur_id, conducteur_id, date");
  
  // Appliquer les filtres de date seulement si on a une période spécifique
  if (!isAllPeriodes && dateDebut && dateFin) {
    affectationsQuery = affectationsQuery
      .gte("date", format(dateDebut, "yyyy-MM-dd"))
      .lte("date", format(dateFin, "yyyy-MM-dd"));
  }

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
    .select("fiche_id, date, HNORM, HI, PA, repas_type, code_trajet, trajet_perso, heures, code_chantier_du_jour, ville_du_jour, type_absence, regularisation_m1, autres_elements, commentaire")
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

    // Filtre par agence d'intérim spécifique
    if (filters.agenceInterim && filters.agenceInterim !== "all") {
      if (salarie.agence_interim !== filters.agenceInterim) continue;
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
    const trajetsParCode: Record<string, number> = {};
    let totalJoursTrajets = 0;
    let totalHeures = 0;
    const detailJours: EmployeeDetail[] = [];

    // 🔥 FIX DOUBLON : Dédupliquer les jours par date
    // Pour les chefs multi-chantier : SOMMER les heures par date au lieu de dédupliquer
    // Pour les autres : garder le jour de la fiche avec le meilleur statut
    const statutPriorite: Record<string, number> = {
      "ENVOYE_RH": 4,
      "AUTO_VALIDE": 3,
      "CLOTURE": 2,
      "VALIDE_CONDUCTEUR": 1,
      "BROUILLON": 0,
    };

    // Collecter tous les jours avec leur statut de fiche
    // Pour les chefs : on collecte TOUS les jours par date (pour sommer ensuite)
    const joursParDate = new Map<string, { jour: typeof joursData[0]; ficheStatut: string; ficheId: string }[]>();

    for (const fiche of fiches) {
      const joursFiche = joursData?.filter(j => j.fiche_id === fiche.id) || [];
      const ficheStatut = (fiche as any).statut || "BROUILLON";

      for (const jour of joursFiche) {
        // Filtre par date quand on consolide par mois (sauf si "Toutes" périodes)
        if (!isAllPeriodes && filters.periode && (!filters.semaine || filters.semaine === "all")) {
          const jourDate = new Date(jour.date);
          if (dateDebut && dateFin && (jourDate < dateDebut || jourDate > dateFin)) {
            continue; // Ce jour n'est pas dans le mois, on l'ignore
          }
        }

        // ✅ CORRECTION : Pour les finisseurs, vérifier l'affectation par leurs dates planifiées
        if (isFinisseur) {
          const datesAffectees = affectationsMap.get(salarieId);
          if (datesAffectees && datesAffectees.size > 0) {
            if (!datesAffectees.has(jour.date)) {
              continue; // Ignorer ce jour si non affecté
            }
          }
        }

        if (!joursParDate.has(jour.date)) {
          joursParDate.set(jour.date, []);
        }
        joursParDate.get(jour.date)!.push({ jour, ficheStatut, ficheId: fiche.id });
      }
    }

    // Maintenant traiter les jours : sommer pour les chefs, dédupliquer pour les autres
    for (const [date, entries] of joursParDate.entries()) {
      let heuresDuJour: number;
      let intemperie: number;
      let panier: boolean;
      let jourRef: typeof joursData[0]; // Référence pour les champs non-numériques

      if (isChef && entries.length > 1) {
        // 🆕 CHEF MULTI-CHANTIER : sommer les heures de toutes les fiches pour cette date
        heuresDuJour = entries.reduce((sum, e) => sum + (Number(e.jour.heures) || Number(e.jour.HNORM) || 0), 0);
        intemperie = entries.reduce((sum, e) => sum + (Number(e.jour.HI) || 0), 0);
        panier = entries.some(e => e.jour.PA === true);
        // Utiliser la fiche avec le meilleur statut comme référence pour les champs texte
        const bestEntry = entries.reduce((best, e) => {
          const bestPrio = statutPriorite[best.ficheStatut] ?? 0;
          const curPrio = statutPriorite[e.ficheStatut] ?? 0;
          return curPrio > bestPrio ? e : best;
        });
        jourRef = bestEntry.jour;
      } else {
        // NON-CHEF ou une seule fiche : dédupliquer (garder le meilleur statut)
        const bestEntry = entries.reduce((best, e) => {
          const bestPrio = statutPriorite[best.ficheStatut] ?? 0;
          const curPrio = statutPriorite[e.ficheStatut] ?? 0;
          return curPrio > bestPrio ? e : best;
        });
        jourRef = bestEntry.jour;
        heuresDuJour = Number(jourRef.heures) || Number(jourRef.HNORM) || 0;
        intemperie = Number(jourRef.HI) || 0;
        panier = jourRef.PA === true;
      }

      heuresNormales += heuresDuJour;
      intemperies += intemperie;
      totalHeures += heuresDuJour;
      
      const isAbsent = heuresDuJour === 0 && intemperie === 0;

      if (isAbsent) {
        absences++;
      }
      
      // Ne compter panier et trajet QUE si le jour n'est pas une absence
      if (!isAbsent && panier) paniers++;
      
      // Compteur par code trajet
      if (!isAbsent && (jourRef as any).code_trajet) {
        trajetsParCode[(jourRef as any).code_trajet] = (trajetsParCode[(jourRef as any).code_trajet] || 0) + 1;
        totalJoursTrajets++;
      }

      // Pour les chefs multi-chantier, combiner les codes chantier
      const chantierCode = isChef && entries.length > 1
        ? [...new Set(entries.map(e => e.jour.code_chantier_du_jour).filter(Boolean))].join(" + ")
        : jourRef.code_chantier_du_jour || "";

      detailJours.push({
        date: jourRef.date || "",
        chantierCode,
        chantierVille: jourRef.ville_du_jour || "",
        heures: heuresDuJour,
        intemperie,
        panier,
        repasType: (jourRef as any).repas_type || null,
        trajet: (jourRef as any).code_trajet || null,
        trajetPerso: (jourRef as any).code_trajet === "T_PERSO",
        typeAbsence: (jourRef as any).type_absence || null,
        isAbsent,
        regularisationM1: (jourRef as any).regularisation_m1 || "",
        autresElements: (jourRef as any).autres_elements || "",
        commentaire: (jourRef as any).commentaire || "",
      });
    }

    // Ne créer l'entrée que si le salarié a des données
    if (totalHeures > 0 || absences > 0 || paniers > 0) {
      // Collecter les codes chantier uniques depuis les jours UNIQUEMENT (format complet ex: CI893OLYMPIA)
      const chantierCodes = [...new Set(
        detailJours
          .map(j => j.chantierCode)
          .filter(Boolean)
      )];

      // Déterminer le role sans accent pour la UI
      const role = isChef ? "chef" : isFinisseur ? "finisseur" : isGrutier ? "grutier" : isInterimaire ? "interimaire" : "macon";

      // Détecter les absences non qualifiées
      const hasUnqualifiedAbsences = detailJours.some(
        jour => jour.isAbsent && (!jour.typeAbsence || jour.typeAbsence === "A_QUALIFIER")
      );

      // Calculer les heures supplémentaires BTP (avec seuil dynamique si heures mensualisées)
      const { heuresSupp25, heuresSupp50 } = calculateHeuresSuppBTP(
        detailJours, 
        mois,
        salarie.heures_supp_mensualisees || 0
      );
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
        base_horaire: salarie.base_horaire || null,
        horaire: salarie.horaire || null,
        heures_supp_mensualisees: salarie.heures_supp_mensualisees || null,
        forfait_jours: salarie.forfait_jours || null,
        salaire: salarie.salaire || null,
        
        // 🆕 Nouveaux champs pour pré-export (depuis la première fiche du mois)
        ficheId: fiches[0]?.id || null,
        absences_export_override: (fiches[0] as any)?.absences_export_override || null,
        trajets_export_override: (fiches[0] as any)?.trajets_export_override || null,
        absences_baseline: (fiches[0] as any)?.absences_baseline || null,
        trajets_baseline: (fiches[0] as any)?.trajets_baseline || null,
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
    const metierOrder = { Chef: 0, Maçon: 1, Grutier: 2, Finisseur: 3, Intérimaire: 4 };
    const aOrder = metierOrder[a.metier as keyof typeof metierOrder] ?? 4;
    const bOrder = metierOrder[b.metier as keyof typeof metierOrder] ?? 4;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.nom.localeCompare(b.nom);
  });

  console.log(`[RH Consolidation] ${result.length} salariés trouvés`);
  return result;
};
