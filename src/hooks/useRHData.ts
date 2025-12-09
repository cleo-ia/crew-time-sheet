import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { buildRHConsolidation } from "./rhShared";
import { parseISOWeek } from "@/lib/weekUtils";

export interface RHSummary {
  heuresNormales: number;
  heuresSupp: number;
  absences: number;
  chantiers: number;
  salaries: number;
  trajetsACompleter: number;
}

export interface RHEmployee {
  id: string;
  nom: string;
  agence_interim?: string | null;
  isChef?: boolean;
  role?: string;
  heuresNormales: number;
  heuresSupp: number;
  absences: number;
  paniers: number;
  trajets: number;
  trajetsPerso: number;
  nbGD: number;
  nbTrajetsACompleter: number;
  statut: string;
  anomalies: number;
  chantier_codes: string[];
  hasUnqualifiedAbsences: boolean;
}

export interface RHDetail {
  id: string;
  chantier: string;
  semaine: string;
  chef: string;
  macons: number;
  totalHeures: number;
  anomalies: number;
}

export interface RHPeriodeCloturee {
  id: string;
  periode: string;
  dateCloture: string;
  salaries: number;
  fiches: number;
  totalHeures: number;
  totalHeuresNormales: number;
  totalHeuresSupp: number;
  totalHeuresSupp25: number;
  totalHeuresSupp50: number;
  totalAbsences: number;
  totalIntemperies: number;
  totalPaniers: number;
  totalTrajets: number;
  nbChantiers: number;
  trajetsParCode: Record<string, number>;
  fichierExcel: string | null;
  motif: string | null;
  clotureeParNom: string | null;
}

export const useRHSummary = (filters: any) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["rh-summary", filters, entrepriseId],
    queryFn: async () => {
      // ✅ Utiliser la même source de vérité que le tableau "Consolidé par salarié"
      const employees = await buildRHConsolidation(filters);

      // Calculer les stats à partir des employés consolidés
      const heuresNormales = employees.reduce((sum, emp) => sum + emp.heuresNormales, 0);
      const heuresSupp = employees.reduce((sum, emp) => sum + emp.heuresSupp, 0);
      const absences = employees.reduce((sum, emp) => sum + emp.absences, 0);
      
      // Récupérer tous les codes chantier uniques
      const uniqueChantiers = new Set<string>();
      employees.forEach(emp => {
        emp.chantier_codes.forEach(code => uniqueChantiers.add(code));
      });

      // Calculer le nombre de trajets à compléter
      const trajetsACompleter = employees.reduce((total, emp) => {
        return total + emp.detailJours.filter(j => j.trajet === "A_COMPLETER").length;
      }, 0);

      const summary: RHSummary = {
        heuresNormales: Math.round(heuresNormales * 100) / 100,
        heuresSupp: Math.round(heuresSupp * 100) / 100,
        absences,
        chantiers: uniqueChantiers.size,
        salaries: employees.length,
        trajetsACompleter,
      };

      console.log(`[RH Summary] Calculé depuis buildRHConsolidation: ${employees.length} salariés, ${heuresNormales}h normales, ${heuresSupp}h supp, ${trajetsACompleter} trajets à compléter`);
      
      return summary;
    },
  });
};

export const useRHConsolidated = (filters: any) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery<RHEmployee[]>({
    queryKey: ["rh-consolidated", filters, entrepriseId],
    queryFn: async (): Promise<RHEmployee[]> => {
      // Assurer un mois par défaut pour le cumul
      const filtersWithPeriode = {
        ...filters,
        periode: filters.periode || format(new Date(), "yyyy-MM"),
      };

      console.log(`[RH Consolidated] Utilisation de buildRHConsolidation avec filtres:`, filtersWithPeriode);

      // Utiliser la source de vérité unique
      const consolidatedData = await buildRHConsolidation(filtersWithPeriode);

      // Mapper vers le format RHEmployee attendu par l'UI
      const result: RHEmployee[] = consolidatedData.map(emp => ({
        id: emp.id,
        nom: `${emp.prenom} ${emp.nom}`.trim(),
        agence_interim: emp.agence_interim,
        isChef: emp.isChef,
        role: emp.role,
        heuresNormales: emp.heuresNormales,
        heuresSupp: emp.heuresSupp,
        absences: emp.absences,
        paniers: emp.paniers,
        trajets: emp.totalJoursTrajets,
        trajetsPerso: emp.trajetsParCode?.T_PERSO || 0,
        nbGD: emp.trajetsParCode?.GD || 0,
        nbTrajetsACompleter: emp.trajetsParCode?.A_COMPLETER || 0,
        statut: emp.statut,
        anomalies: emp.anomalies?.length || 0,
        chantier_codes: emp.chantier_codes,
        hasUnqualifiedAbsences: emp.hasUnqualifiedAbsences,
      }));

      console.log(`[RH Consolidated] ${result.length} salariés consolidés (source unique)`);

      return result;
    },
  });
};

export const useRHDetails = (filters: any) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["rh-details", filters, entrepriseId],
    queryFn: async () => {
      // 1. Calculer les bornes du mois si période définie
      let dateDebut: Date | null = null;
      let dateFin: Date | null = null;
      
      if (filters.periode) {
        const [year, month] = filters.periode.split("-").map(Number);
        dateDebut = startOfMonth(new Date(year, month - 1));
        dateFin = endOfMonth(new Date(year, month - 1));
      }

      let query = supabase
        .from("fiches")
        .select(`
          id,
          semaine,
          total_heures,
          salarie_id,
          chantier:chantiers!inner(
            id,
            nom,
            conducteur_id,
            entreprise_id,
            chef:utilisateurs!chantiers_chef_id_fkey(nom, prenom)
          )
        `)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"]);
      
      // Filtre par entreprise
      if (entrepriseId) {
        query = query.eq("chantier.entreprise_id", entrepriseId);
      }

      if (filters.semaine && filters.semaine !== "all") {
        query = query.eq("semaine", filters.semaine);
      }
      if (filters.conducteur && filters.conducteur !== "all") {
        query = query.eq("chantier.conducteur_id", filters.conducteur);
      }
      if (filters.chantier && filters.chantier !== "all") {
        query = query.eq("chantier_id", filters.chantier);
      }
      if (filters.salarie && filters.salarie !== "all") {
        query = query.eq("salarie_id", filters.salarie);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 2. Filtrer côté client par période si pas de semaine spécifique
      let fichesFiltered = data || [];
      if (filters.periode && (!filters.semaine || filters.semaine === "all")) {
        fichesFiltered = fichesFiltered.filter(fiche => {
          if (!fiche.semaine) return false;
          try {
            const lundi = parseISOWeek(fiche.semaine);
            const dimanche = addDays(lundi, 6);
            // Inclure si la semaine chevauche le mois
            return lundi <= dateFin! && dimanche >= dateDebut!;
          } catch {
            return false;
          }
        });
      }

      // 3. Récupérer tous les fiches_jours pour calculer les heures totales
      const ficheIds = fichesFiltered.map(f => f.id) || [];
      const { data: allFichesJours, error: joursError } = await supabase
        .from("fiches_jours")
        .select("fiche_id, HNORM, HI, heures")
        .in("fiche_id", ficheIds);

      if (joursError) throw joursError;

      // Créer un map fiche_id → total heures (normales uniquement, sans intempéries)
      const heuresMap = new Map<string, number>();
      allFichesJours?.forEach(fj => {
        const current = heuresMap.get(fj.fiche_id) || 0;
        const normales = Number((fj as any).heures) || Number(fj.HNORM) || 0;
        heuresMap.set(fj.fiche_id, current + normales);
      });

      const groupMap = new Map<string, RHDetail>();

      fichesFiltered.forEach(fiche => {
        const key = `${fiche.chantier.id}___${fiche.semaine}`;
        
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: key,
            chantier: fiche.chantier.nom,
            semaine: fiche.semaine || '',
            chef: `${fiche.chantier.chef?.prenom || ''} ${fiche.chantier.chef?.nom || ''}`.trim(),
            macons: 0,
            totalHeures: 0,
            anomalies: 0,
          });
        }

        const detail = groupMap.get(key)!;
        detail.macons++;
        detail.totalHeures += heuresMap.get(fiche.id) || 0;
      });

      return Array.from(groupMap.values()).map(detail => ({
        ...detail,
        totalHeures: Math.round(detail.totalHeures * 100) / 100,
      }));
    },
  });
};

export const useRHHistorique = (filters: any) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["rh-historique", filters, entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("periodes_cloturees")
        .select(`
          *,
          cloturee_par_user:utilisateurs!periodes_cloturees_cloturee_par_fkey(nom, prenom)
        `)
        .order("date_cloture", { ascending: false });
      
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(p => ({
        id: p.id,
        periode: p.periode,
        dateCloture: p.date_cloture,
        salaries: p.nb_salaries || 0,
        fiches: p.nb_fiches || 0,
        totalHeures: p.total_heures || 0,
        totalHeuresNormales: p.total_heures_normales || 0,
        totalHeuresSupp: p.total_heures_supp || 0,
        totalHeuresSupp25: p.total_heures_supp_25 || 0,
        totalHeuresSupp50: p.total_heures_supp_50 || 0,
        totalAbsences: p.total_absences || 0,
        totalIntemperies: p.total_intemperies || 0,
        totalPaniers: p.total_paniers || 0,
        totalTrajets: p.total_trajets || 0,
        nbChantiers: p.nb_chantiers || 0,
        trajetsParCode: (p.trajets_par_code as Record<string, number>) || {},
        fichierExcel: p.fichier_excel || null,
        motif: p.motif || null,
        clotureeParNom: p.cloturee_par_user 
          ? `${(p.cloturee_par_user as any).prenom || ''} ${(p.cloturee_par_user as any).nom || ''}`.trim() 
          : null,
      })) || [];
    },
  });
};

export interface RHFicheDetailData {
  chantier: string;
  semaine: string;
  chef: string;
  totalMacons: number;
  totalHeures: number;
  totalPaniers: number;
  totalTrajets: number;
  totalIntemperics: number;
  detailJours: Array<{
    ficheJourId: string;
    salarieId: string;
    date: string;
    dateISO: string;
    salarie: string;
    isChef?: boolean;
    role?: string;
    heuresNormales: number;
    heuresIntemperics: number;
    panier: boolean;
    codeTrajet: string | null;
    trajetPerso: boolean;
    typeAbsence?: string;
    commentaire?: string;
  }>;
  recapSalaries: Array<{
    id: string;
    nom: string;
    isChef?: boolean;
    role?: string;
    totalHeures: number;
    totalIntemperics: number;
    paniers: number;
    trajets: number;
    trajetsPerso: number;
  }>;
}

export const useRHFicheDetail = (ficheId: string) => {
  return useQuery({
    queryKey: ["rh-fiche-detail", ficheId],
    queryFn: async () => {
      // Le ficheId est au format "chantier_id___semaine"
      const [chantierId, semaine] = ficheId.split("___");

      // 1. Récupérer toutes les fiches pour ce chantier/semaine
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select(`
          id,
          semaine,
          salarie_id,
          chantier:chantiers!inner(
            id,
            nom,
            chef:utilisateurs!chantiers_chef_id_fkey(nom, prenom)
          )
        `)
        .eq("chantier_id", chantierId)
        .eq("semaine", semaine)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"]);

      if (fichesError) throw fichesError;
      if (!fiches || fiches.length === 0) return null;

      // 2. Récupérer les informations des salariés
      const salarieIds = fiches.map(f => f.salarie_id).filter(Boolean);
      const { data: salaries, error: salarieError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, agence_interim, role_metier")
        .in("id", salarieIds);

      if (salarieError) throw salarieError;

      const salarieMap = new Map(salaries?.map(s => [s.id, s]) || []);

      // Récupérer les chefs de chantier pour déterminer isChef
      const { data: chantiersData } = await supabase
        .from("chantiers")
        .select("id, chef_id");

      const chefIds = new Set(chantiersData?.map(c => c.chef_id).filter(Boolean) || []);

      // Récupérer les rôles des salariés
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", salarieIds);

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

      // 3. Récupérer tous les fiches_jours (avec trajet_perso)
      const ficheIds = fiches.map(f => f.id);
      const { data: joursData, error: joursError } = await supabase
        .from("fiches_jours")
        .select("*")
        .in("fiche_id", ficheIds)
        .order("date", { ascending: true });

      if (joursError) throw joursError;

      // 4. Construire le détail jour par jour
      const detailJours = joursData?.map(jour => {
        const fiche = fiches.find(f => f.id === jour.fiche_id);
        const salarie = salarieMap.get(fiche?.salarie_id || "");
        const isChef = chefIds.has(fiche?.salarie_id || "");
        const roleFromUser = rolesMap.get(fiche?.salarie_id || "");
        const displayRole = isChef ? "chef" : (roleFromUser === "conducteur" ? "conducteur" : (salarie?.role_metier === "finisseur" ? "finisseur" : (salarie?.agence_interim ? "interimaire" : (salarie?.role_metier || roleFromUser || "macon"))));
        
        return {
          ficheJourId: jour.id,
          salarieId: fiche?.salarie_id || "",
          dateISO: jour.date, // Conserver la date ISO pour le tri
          displayDate: new Date(jour.date).toLocaleDateString("fr-FR", { 
            weekday: "long", 
            day: "2-digit", 
            month: "2-digit", 
            year: "numeric" 
          }),
          salarie: `${salarie?.prenom || ''} ${salarie?.nom || ''}`.trim(),
          isChef,
          role: displayRole,
          heuresNormales: Number(jour.heures) || Number(jour.HNORM) || 0,
          heuresIntemperics: Number(jour.HI) || 0,
          panier: jour.PA || false,
          codeTrajet: jour.code_trajet || null,
          trajetPerso: jour.trajet_perso === true,
          typeAbsence: (jour as any).type_absence || null,
          commentaire: jour.commentaire || "",
        };
      }).sort((a, b) => {
        // 1. Trier d'abord par date ISO (ordre chronologique garanti)
        if (a.dateISO !== b.dateISO) {
          return a.dateISO.localeCompare(b.dateISO);
        }
        
        // 2. Pour une même date, trier par rôle
        // Chef d'équipe en premier
        if (a.isChef && !b.isChef) return -1;
        if (!a.isChef && b.isChef) return 1;
        
        // Parmi les non-chefs : tous les autres rôles avant les intérimaires
        if (!a.isChef && !b.isChef) {
          const aIsInterim = a.role === "interimaire";
          const bIsInterim = b.role === "interimaire";
          if (!aIsInterim && bIsInterim) return -1;
          if (aIsInterim && !bIsInterim) return 1;
        }
        
        // 3. Si même catégorie, garder l'ordre existant
        return 0;
      }).map(item => ({
        // Exposer displayDate comme "date" pour respecter le type RHFicheDetailData
        ficheJourId: item.ficheJourId,
        salarieId: item.salarieId,
        date: item.displayDate,
        dateISO: item.dateISO,
        salarie: item.salarie,
        isChef: item.isChef,
        role: item.role,
        heuresNormales: item.heuresNormales,
        heuresIntemperics: item.heuresIntemperics,
        panier: item.panier,
        codeTrajet: item.codeTrajet,
        trajetPerso: item.trajetPerso,
        typeAbsence: item.typeAbsence,
        commentaire: item.commentaire,
      })) || [];

      // 5. Calculer le récapitulatif par salarié
      const salarieRecapMap = new Map<string, any>();
      
      fiches.forEach(fiche => {
        const salarieId = fiche.salarie_id;
        if (!salarieId) return;

        const joursFiche = joursData?.filter(j => j.fiche_id === fiche.id) || [];
        
        const totalHeures = joursFiche.reduce((sum, j) => sum + (Number(j.heures) || Number(j.HNORM) || 0), 0);
        const totalIntemperics = joursFiche.reduce((sum, j) => sum + (Number(j.HI) || 0), 0);
        const paniers = joursFiche.filter(j => j.PA === true).length;
        const trajets = joursFiche.filter(j => j.code_trajet).length;
        const trajetsPerso = joursFiche.filter(j => j.trajet_perso === true).length;

        const salarie = salarieMap.get(salarieId);
        const isChef = chefIds.has(salarieId);
        const roleFromUser = rolesMap.get(salarieId);
        const displayRole = isChef ? "chef" : (salarie?.role_metier === "finisseur" ? "finisseur" : (salarie?.agence_interim ? "interimaire" : (salarie?.role_metier || roleFromUser || "macon")));
        
        salarieRecapMap.set(salarieId, {
          id: salarieId,
          nom: `${salarie?.prenom || ''} ${salarie?.nom || ''}`.trim(),
          isChef,
          role: displayRole,
          totalHeures: Math.round(totalHeures * 100) / 100,
          totalIntemperics: Math.round(totalIntemperics * 100) / 100,
          paniers,
          trajets,
          trajetsPerso,
        });
      });

      // 6. Calculer les totaux globaux
      const totalHeures = Array.from(salarieRecapMap.values()).reduce(
        (sum, s) => sum + s.totalHeures, 
        0
      );
      const totalIntemperics = Array.from(salarieRecapMap.values()).reduce(
        (sum, s) => sum + s.totalIntemperics, 
        0
      );
      const totalPaniers = Array.from(salarieRecapMap.values()).reduce(
        (sum, s) => sum + s.paniers, 
        0
      );
      const totalTrajets = Array.from(salarieRecapMap.values()).reduce(
        (sum, s) => sum + s.trajets, 
        0
      );

      const result: RHFicheDetailData = {
        chantier: fiches[0].chantier.nom,
        semaine: fiches[0].semaine || "",
        chef: `${fiches[0].chantier.chef?.prenom || ''} ${fiches[0].chantier.chef?.nom || ''}`.trim(),
        totalMacons: salarieRecapMap.size,
        totalHeures: Math.round(totalHeures * 100) / 100,
        totalPaniers,
        totalTrajets,
        totalIntemperics: Math.round(totalIntemperics * 100) / 100,
        detailJours,
        recapSalaries: Array.from(salarieRecapMap.values()).sort((a, b) => {
          // 1. Chef d'équipe toujours en premier
          if (a.isChef && !b.isChef) return -1;
          if (!a.isChef && b.isChef) return 1;
          
          // 2. Parmi les non-chefs : tous les autres rôles avant les intérimaires
          if (!a.isChef && !b.isChef) {
            const aIsInterim = a.role === "interimaire";
            const bIsInterim = b.role === "interimaire";
            if (!aIsInterim && bIsInterim) return -1;
            if (aIsInterim && !bIsInterim) return 1;
          }
          
          // 3. Si même catégorie, garder l'ordre existant
          return 0;
        }),
      };

      return result;
    },
  });
};

// Hook pour récupérer les détails d'un employé
export const useRHEmployeeDetail = (salarieId: string, filters: any) => {
  return useQuery({
    queryKey: ["rh-employee-detail", salarieId, filters],
    queryFn: async () => {
      // 1. Récupérer les informations du salarié
      const { data: salarie, error: salarieError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, email, agence_interim, role_metier")
        .eq("id", salarieId)
        .single();

      if (salarieError) throw salarieError;
      if (!salarie) return null;

      // 2. Récupérer toutes les fiches pour ce salarié (LEFT JOIN pour inclure finisseurs sans chantier)
      let fichesQuery = supabase
        .from("fiches")
        .select(`
          id,
          semaine,
          chantier_id,
          chantiers (
            id,
            nom,
            code_chantier,
            conducteur_id
          )
        `)
        .eq("salarie_id", salarieId)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"]);

      // Appliquer les filtres
      if (filters.semaine && filters.semaine !== "all") {
        fichesQuery = fichesQuery.eq("semaine", filters.semaine);
      }
      if (filters.chantier && filters.chantier !== "all") {
        fichesQuery = fichesQuery.eq("chantier_id", filters.chantier);
      }

      const { data: fiches, error: fichesError } = await fichesQuery;
      if (fichesError) throw fichesError;

      // 🔥 CORRECTION: Filtre Conducteur post-requête avec vérification finisseurs
      let filteredFiches = fiches || [];
      if (filters.conducteur && filters.conducteur !== "all") {
        // Récupérer les affectations finisseurs pour ce conducteur
        const { data: affectationsFinisseurs } = await supabase
          .from("affectations_finisseurs_jours")
          .select("finisseur_id")
          .eq("conducteur_id", filters.conducteur)
          .eq("finisseur_id", salarieId);

        const finisseurAffected = (affectationsFinisseurs && affectationsFinisseurs.length > 0);

        filteredFiches = filteredFiches.filter(f => {
          // Fiches avec chantier: vérifier conducteur_id du chantier
          if (f.chantier_id && f.chantiers) {
            return f.chantiers.conducteur_id === filters.conducteur;
          }
          // Fiches sans chantier (finisseurs): vérifier si affecté à ce conducteur
          return finisseurAffected;
        });
      }

      if (!filteredFiches || filteredFiches.length === 0) return null;

      // 3. Récupérer tous les fiches_jours pour ces fiches
      const ficheIds = filteredFiches.map(f => f.id);
      const { data: fichesJoursRaw, error: joursError } = await supabase
        .from("fiches_jours")
        .select("*")
        .in("fiche_id", ficheIds)
        .order("date", { ascending: true });

      if (joursError) throw joursError;

      // 🔥 CORRECTION: Filtrer les fiches_jours des finisseurs par affectations réelles
      let fichesJours = fichesJoursRaw || [];
      
      // Vérifier si le salarié est un finisseur (au moins une fiche sans chantier)
      const isFinisseur = filteredFiches.some(f => f.chantier_id === null);
      
      if (isFinisseur && fichesJours.length > 0) {
        // Récupérer les affectations avec dates pour ce finisseur
        let affQueryDates = supabase
          .from("affectations_finisseurs_jours")
          .select("date, semaine")
          .eq("finisseur_id", salarieId);

        if (filters.semaine && filters.semaine !== "all") {
          affQueryDates = affQueryDates.eq("semaine", filters.semaine);
        }
        if (filters.conducteur && filters.conducteur !== "all") {
          affQueryDates = affQueryDates.eq("conducteur_id", filters.conducteur);
        }

        const { data: affectationsAvecDates } = await affQueryDates;

        // Créer un Set des dates affectées
        const datesAffectees = new Set(affectationsAvecDates?.map(a => a.date) || []);

        // Filtrer les fiches_jours pour ne garder que les dates affectées
        // SEULEMENT s'il existe des affectations journalières (finisseur autonome)
        if (datesAffectees.size > 0) {
          fichesJours = fichesJours.filter(jour => datesAffectees.has(jour.date));
        }
        // Sinon (pas d'affectations journalières), traiter comme un maçon (aucun filtre)

        console.debug(`[RH Employee Detail] Finisseur ${salarieId}: ${fichesJoursRaw?.length || 0} → ${fichesJours.length} jours`);
      }

      // 🔥 NOUVEAU : Filtrer les jours par mois calendaire
      let fichesJoursFiltrees = fichesJours;

      if (filters.periode && (!filters.semaine || filters.semaine === "all")) {
        const [year, month] = filters.periode.split("-").map(Number);
        const dateDebut = startOfMonth(new Date(year, month - 1));
        const dateFin = endOfMonth(new Date(year, month - 1));
        
        fichesJoursFiltrees = fichesJours.filter(jour => {
          const jourDate = new Date(jour.date);
          return jourDate >= dateDebut && jourDate <= dateFin;
        });
      }

      // 4. 🔥 CORRECTION: Construire le détail jour par jour avec chantier du jour pour finisseurs
      const dailyDetails = (fichesJoursFiltrees?.map(jour => {
        const fiche = filteredFiches.find(f => f.id === jour.fiche_id);
        
        // PRIORITÉ: code_chantier_du_jour + ville_du_jour (finisseurs) puis chantier de la fiche (autres)
        let chantierNom = "Sans chantier";
        if (jour.code_chantier_du_jour || jour.ville_du_jour) {
          const parts = [];
          if (jour.code_chantier_du_jour) parts.push(jour.code_chantier_du_jour);
          if (jour.ville_du_jour) parts.push(jour.ville_du_jour);
          chantierNom = parts.join(" - ");
        } else if (fiche?.chantiers?.nom) {
          chantierNom = fiche.chantiers.nom;
        }

        const heuresNormales = Number(jour.heures) || Number(jour.HNORM) || 0;
        const heuresIntemperies = Number(jour.HI) || 0;
        const isAbsent = heuresNormales === 0 && heuresIntemperies === 0;

        return {
          date: jour.date,
          ficheJourId: jour.id,
          chantier: chantierNom,
          heuresNormales,
          heuresIntemperies,
          panier: !!jour.PA,
          codeTrajet: (jour as any).code_trajet || null,
          trajetPerso: !!(jour as any).trajet_perso,
          typeAbsence: (jour as any).type_absence || null,
          isAbsent,
          regularisationM1: (jour as any).regularisation_m1 || "",
          autresElements: (jour as any).autres_elements || "",
          commentaire: (jour as any).commentaire || "",
        };
      }) || [])
        .sort((a, b) => {
          // Tri chronologique par date
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      // 5. Calculer les totaux (heures normales uniquement, sans intempéries)
      const summary = {
        totalHeures: dailyDetails.reduce((sum, d) => sum + d.heuresNormales, 0),
        totalIntemperies: dailyDetails.reduce((sum, d) => sum + d.heuresIntemperies, 0),
        totalPaniers: dailyDetails.filter(d => d.panier).length,
        totalTrajets: dailyDetails.filter(d => (d as any).codeTrajet).length,
      };

      // Récupérer isChef et role pour le salarié
      const { data: chantiersData } = await supabase
        .from("chantiers")
        .select("chef_id")
        .in("id", filteredFiches.map(f => f.chantier_id).filter(Boolean));

      const isChef = chantiersData?.some(c => c.chef_id === salarieId) || false;

      // Récupérer le rôle depuis user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", salarieId)
        .maybeSingle();

      const role = isChef ? "chef" : (salarie.role_metier === "finisseur" ? "finisseur" : (salarie.agence_interim ? "interimaire" : (salarie.role_metier || roleData?.role || "macon")));

      return {
        salarie: {
          id: salarie.id,
          nom: salarie.nom || "",
          prenom: salarie.prenom || "",
          email: salarie.email || "",
          agence_interim: salarie.agence_interim || null,
          isChef,
          role,
        },
        dailyDetails,
        summary,
      };
    },
    enabled: !!salarieId,
  });
};

export interface ClotureData {
  filters: any;
  motif: string;
  fichierExcel: string;
  consolidatedData: {
    salaries: number;
    fiches: number;
    totalHeures: number;
    totalHeuresNormales: number;
    totalHeuresSupp: number;
    totalHeuresSupp25: number;
    totalHeuresSupp50: number;
    totalAbsences: number;
    totalIntemperies: number;
    totalPaniers: number;
    totalTrajets: number;
    nbChantiers: number;
    trajetsParCode: Record<string, number>;
  };
}

export const useCloturePeriode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ filters, motif, fichierExcel, consolidatedData }: ClotureData) => {
      const entrepriseId = localStorage.getItem("current_entreprise_id");
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: user } = await supabase
        .from("utilisateurs")
        .select("id")
        .eq("auth_user_id", userData?.user?.id)
        .maybeSingle();

      // 1. Insérer la période clôturée avec toutes les stats
      const { data: periode, error: periodeError } = await supabase
        .from("periodes_cloturees")
        .insert({
          periode: filters.periode,
          semaine_debut: filters.periode, // Format YYYY-MM
          entreprise_id: entrepriseId,
          cloturee_par: user?.id,
          nb_salaries: consolidatedData.salaries,
          nb_fiches: consolidatedData.fiches,
          total_heures: consolidatedData.totalHeures,
          total_heures_normales: consolidatedData.totalHeuresNormales,
          total_heures_supp: consolidatedData.totalHeuresSupp,
          total_heures_supp_25: consolidatedData.totalHeuresSupp25,
          total_heures_supp_50: consolidatedData.totalHeuresSupp50,
          total_absences: consolidatedData.totalAbsences,
          total_intemperies: consolidatedData.totalIntemperies,
          total_paniers: consolidatedData.totalPaniers,
          total_trajets: consolidatedData.totalTrajets,
          nb_chantiers: consolidatedData.nbChantiers,
          trajets_par_code: consolidatedData.trajetsParCode,
          fichier_excel: fichierExcel,
          motif,
        })
        .select()
        .single();

      if (periodeError) throw periodeError;

      // 2. Récupérer les IDs des fiches à clôturer pour ce mois
      const [year, month] = filters.periode.split("-").map(Number);
      const dateDebut = startOfMonth(new Date(year, month - 1));
      const dateFin = endOfMonth(new Date(year, month - 1));

      // Récupérer toutes les fiches validées du mois (via semaine qui chevauche le mois)
      const { data: fichesToClose, error: fichesError } = await supabase
        .from("fiches")
        .select("id, semaine, chantier_id")
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"]);

      if (fichesError) throw fichesError;

      // Filtrer les fiches dont la semaine chevauche le mois
      const ficheIdsToClose = (fichesToClose || [])
        .filter(fiche => {
          if (!fiche.semaine) return false;
          try {
            const mondayOfWeek = parseISOWeek(fiche.semaine);
            const fridayOfWeek = new Date(mondayOfWeek);
            fridayOfWeek.setDate(fridayOfWeek.getDate() + 4);
            return mondayOfWeek <= dateFin && fridayOfWeek >= dateDebut;
          } catch {
            return false;
          }
        })
        .map(f => f.id);

      // 3. Passer toutes ces fiches en statut CLOTURE
      if (ficheIdsToClose.length > 0) {
        const { error: updateError } = await supabase
          .from("fiches")
          .update({ statut: "CLOTURE" })
          .in("id", ficheIdsToClose);

        if (updateError) throw updateError;
      }

      console.log(`[Clôture] ${ficheIdsToClose.length} fiches passées en CLOTURE pour ${filters.periode}`);

      return periode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rh-historique"] });
      queryClient.invalidateQueries({ queryKey: ["rh-summary"] });
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["rh-details"] });
      toast.success("Période clôturée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la clôture:", error);
      toast.error("Erreur lors de la clôture de la période");
    },
  });
};
