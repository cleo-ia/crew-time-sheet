import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
  trajet: number;
  trajetPerso: boolean;
  typeAbsence?: string;
  isAbsent: boolean; // true si heures=0 ET intemperie=0 (employé pas présent)
}

export interface EmployeeWithDetails {
  salarieId: string;
  id: string; // Alias pour compatibilité UI
  nom: string;
  prenom: string;
  metier: string;
  role: string; // chef/macon/interimaire/finisseur (pour UI)
  isChef: boolean; // Flag pour affichage badge chef
  agence_interim: string | null;
  chantier_codes: string[]; // Codes des chantiers (pour colonne Chantier)
  heuresNormales: number;
  intemperies: number;
  absences: number;
  paniers: number;
  trajets: number;
  trajetsPerso: number;
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
}

/**
 * Source de vérité unique pour la consolidation RH
 * Utilisée par l'écran ET l'export Excel pour garantir la cohérence
 */
export const buildRHConsolidation = async (filters: RHFilters): Promise<EmployeeWithDetails[]> => {
  const mois = filters.periode || format(new Date(), "yyyy-MM");
  const [year, month] = mois.split("-").map(Number);
  const dateDebut = startOfMonth(new Date(year, month - 1));
  const dateFin = endOfMonth(new Date(year, month - 1));

  console.log(`[RH Consolidation] Période: ${mois}, Filtres:`, filters);

  // Récupérer toutes les fiches validées
  let fichesQuery = supabase
    .from("fiches")
    .select(`
      id,
      semaine,
      statut,
      salarie_id,
      chantier_id,
      chantiers!inner(
        code_chantier,
        ville,
        conducteur_id,
        chef_id
      )
    `)
    .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"]);

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
      salarie_id
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

  // Récupérer les salariés
  const salarieIds = [...new Set(fichesDuMois.map(f => f.salarie_id).filter(Boolean))];
  
  const { data: salarieData, error: salarieError } = await supabase
    .from("utilisateurs")
    .select("id, nom, prenom, agence_interim, role_metier, matricule, echelon, niveau, degre, statut, type_contrat, horaire, heures_supp_mensualisees, forfait_jours, salaire")
    .in("id", salarieIds);

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
    .select("fiche_id, date, HNORM, HI, PA, T, trajet_perso, heures, code_chantier_du_jour, ville_du_jour, type_absence")
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
    const isInterimaire = !!salarie.agence_interim && !isChef && !isFinisseur;
    const isMacon = !isChef && !isFinisseur && !isInterimaire;

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
    const metier = isChef 
      ? "Chef" 
      : isFinisseur
        ? "Finisseur"
        : isInterimaire
          ? "Intérimaire"
          : "Maçon";

    let heuresNormales = 0;
    let intemperies = 0;
    let absences = 0;
    let paniers = 0;
    let trajets = 0;
    let trajetsPerso = 0;
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

        // Pour les finisseurs, vérifier qu'ils sont affectés ce jour-là
        if (isFinisseur) {
          const datesAffectees = affectationsMap.get(salarieId);
          if (!datesAffectees || !datesAffectees.has(jour.date)) {
            continue; // Ignorer ce jour si non affecté
          }
        }

        // Calcul des heures: priorité à heures, sinon HNORM
        const heuresDuJour = Number(jour.heures) || Number(jour.HNORM) || 0;
        const intemperie = Number(jour.HI) || 0;
        const panier = jour.PA === true;
        const trajet = Number(jour.T) || 0;
        const isTrajetPerso = jour.trajet_perso === true;

        heuresNormales += heuresDuJour;
        intemperies += intemperie;
        totalHeures += heuresDuJour;
        
        if (heuresDuJour === 0 && intemperie === 0) {
          absences++;
        }
        
        if (panier) {
          paniers++;
        }
        
        trajets += trajet;
        
        if (isTrajetPerso) {
          trajetsPerso += 1; // Compte 1 trajet perso par jour où la case est cochée
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
          trajet,
          trajetPerso: jour.trajet_perso === true,
          typeAbsence: (jour as any).type_absence || null,
          isAbsent,
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
      const role = isChef ? "chef" : isFinisseur ? "finisseur" : isInterimaire ? "interimaire" : "macon";

      // Détecter les absences non qualifiées
      const hasUnqualifiedAbsences = detailJours.some(
        jour => jour.isAbsent && (!jour.typeAbsence || jour.typeAbsence === "A_QUALIFIER")
      );

      employeeMap.set(salarieId, {
        salarieId,
        id: salarieId, // Alias pour UI
        nom: salarie.nom || "",
        prenom: salarie.prenom || "",
        metier,
        role,
        isChef,
        agence_interim: salarie.agence_interim || null,
        chantier_codes: chantierCodes,
        heuresNormales: Math.round(heuresNormales * 100) / 100,
        intemperies: Math.round(intemperies * 100) / 100,
        absences,
        paniers,
        trajets: Math.round(trajets * 100) / 100,
        trajetsPerso: Math.round(trajetsPerso * 100) / 100,
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
      });
    }
  }

  const result = Array.from(employeeMap.values()).sort((a, b) => {
    // Tri par métier puis par nom
    const metierOrder = { Chef: 0, Maçon: 1, Intérimaire: 2, Finisseur: 3 };
    const aOrder = metierOrder[a.metier as keyof typeof metierOrder] ?? 4;
    const bOrder = metierOrder[b.metier as keyof typeof metierOrder] ?? 4;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.nom.localeCompare(b.nom);
  });

  console.log(`[RH Consolidation] ${result.length} salariés trouvés`);
  return result;
};
