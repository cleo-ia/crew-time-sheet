import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWeek, parseISOWeek } from "@/lib/weekUtils";
import { startOfMonth, endOfMonth, format, subWeeks } from "date-fns";

export interface FicheEnRetard {
  id: string;
  semaine: string;
  chantier_nom: string;
  chef_nom: string;
  salarie_nom: string;
}

export interface ChantierOrphelin {
  id: string;
  nom: string;
  code_chantier: string | null;
}

export interface ConducteurEnAttente {
  conducteur_id: string;
  conducteur_nom: string;
  conducteur_prenom: string;
  nb_fiches: number;
  semaines: string[];
}

export interface DashboardStats {
  chantiersActifs: number;
  chantiersInactifs: number;
  fichesBrouillon: number;
  fichesValideChef: number;
  fichesEnvoyeRH: number;
  fichesCloture: number;
  semaineCourante: string;
  progressionTransmission: {
    total: number;
    transmis: number;
    pourcentage: number;
  };
  heuresSaisiesSemaine: number;
  heuresMoisEnCours: number;
  fichesEnRetard: FicheEnRetard[];
  chantiersOrphelins: ChantierOrphelin[];
  conducteursEnAttente: ConducteurEnAttente[];
  trajetsACompleter: number;
}

export const useDashboardStats = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  const semaineCourante = getCurrentWeek();

  return useQuery({
    queryKey: ["dashboard-stats", entrepriseId, semaineCourante],
    queryFn: async (): Promise<DashboardStats> => {
      if (!entrepriseId) throw new Error("No entreprise selected");

      // Fetch all data in parallel
      const [
        chantiersResult,
        fichesResult,
        fichesEnAttenteResult,
        fichesSemaineResult,
        fichesMoisResult,
        fichesEnRetardResult,
        trajetsResult,
      ] = await Promise.all([
        // Chantiers actifs/inactifs
        supabase
          .from("chantiers")
          .select("id, nom, code_chantier, actif, chef_id")
          .eq("entreprise_id", entrepriseId),

        // Toutes les fiches pour stats globales
        supabase
          .from("fiches")
          .select("id, statut, chantier_id, semaine")
          .not("chantier_id", "is", null),

        // Fiches en attente validation (VALIDE_CHEF)
        supabase
          .from("fiches")
          .select(`
            id,
            semaine,
            chantier_id,
            chantiers!inner(conducteur_id, entreprise_id, nom)
          `)
          .eq("statut", "VALIDE_CHEF")
          .not("chantier_id", "is", null),

        // Heures semaine courante (uniquement fiches transmises)
        supabase
          .from("fiches")
          .select("total_heures, chantier_id")
          .eq("semaine", semaineCourante)
          .eq("entreprise_id", entrepriseId)
          .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"])
          .not("chantier_id", "is", null),

        // Heures mois en cours (uniquement fiches transmises)
        (() => {
          const now = new Date();
          const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
          const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
          return supabase
            .from("fiches")
            .select("total_heures, chantier_id, created_at")
            .gte("created_at", monthStart)
            .lte("created_at", monthEnd)
            .eq("entreprise_id", entrepriseId)
            .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"])
            .not("chantier_id", "is", null);
        })(),

        // Fiches en retard (BROUILLON de semaines passées)
        (() => {
          const semainePassee = format(subWeeks(parseISOWeek(semaineCourante), 1), "yyyy-'S'II");
          return supabase
            .from("fiches")
            .select(`
              id,
              semaine,
              chantier_id,
              salarie_id,
              chantiers!inner(nom, chef_id, entreprise_id),
              utilisateurs!fiches_salarie_id_fkey(nom, prenom)
            `)
            .eq("statut", "BROUILLON")
            .lt("semaine", semainePassee)
            .not("chantier_id", "is", null);
        })(),

        // Trajets à compléter
        supabase
          .from("fiches_jours")
          .select(`
            id,
            code_trajet,
            fiche_id,
            fiches!inner(statut, chantier_id)
          `)
          .eq("code_trajet", "A_COMPLETER")
          .in("fiches.statut", ["ENVOYE_RH", "AUTO_VALIDE"]),
      ]);

      // Process chantiers
      const chantiers = chantiersResult.data || [];
      const chantiersEntreprise = chantiers.filter(c => c);
      const chantiersActifs = chantiersEntreprise.filter(c => c.actif).length;
      const chantiersInactifs = chantiersEntreprise.filter(c => !c.actif).length;
      
      // Chantiers orphelins (actifs sans chef ET sans chef secondaire dans le planning)
      // On récupère les chantiers ayant un chef dans affectations_jours_chef pour exclure ceux avec un chef secondaire
      const { data: chantiersAvecChefAffecte } = await supabase
        .from("affectations_jours_chef")
        .select("chantier_id")
        .eq("entreprise_id", entrepriseId)
        .eq("semaine", semaineCourante);
      
      const chantiersAvecChefSet = new Set((chantiersAvecChefAffecte || []).map(a => a.chantier_id));
      
      const chantiersOrphelins: ChantierOrphelin[] = chantiersEntreprise
        .filter(c => c.actif && !chantiersAvecChefSet.has(c.id))
        .map(c => ({
          id: c.id,
          nom: c.nom,
          code_chantier: c.code_chantier,
        }));

      // Get chantier IDs for this entreprise
      const chantierIds = chantiersEntreprise.map(c => c.id);

      // Process fiches (filter by entreprise chantiers)
      const fiches = (fichesResult.data || []).filter(f => 
        f.chantier_id && chantierIds.includes(f.chantier_id)
      );
      
      const fichesBrouillon = fiches.filter(f => f.statut === "BROUILLON").length;
      const fichesValideChef = fiches.filter(f => f.statut === "VALIDE_CHEF").length;
      const fichesEnvoyeRH = fiches.filter(f => 
        f.statut === "ENVOYE_RH" || f.statut === "AUTO_VALIDE" || f.statut === "VALIDE_CONDUCTEUR"
      ).length;
      const fichesCloture = fiches.filter(f => f.statut === "CLOTURE").length;

      // Progression transmission semaine courante
      // Source de vérité : chantiers ayant au moins un employé planifié cette semaine
      const chantiersActifsAvecEquipe = chantiersEntreprise.filter(c => c.actif && chantiersAvecChefSet.has(c.id));
      const totalEquipes = chantiersActifsAvecEquipe.length;
      const fichesTransmises = fiches.filter(f => 
        f.semaine === semaineCourante && f.statut !== "BROUILLON"
      );
      const chantiersTransmis = new Set(fichesTransmises.map(f => f.chantier_id)).size;
      const pourcentage = totalEquipes > 0 ? Math.round((chantiersTransmis / totalEquipes) * 100) : 0;

      // Heures
      const fichesSemaine = (fichesSemaineResult.data || []).filter(f => 
        f.chantier_id && chantierIds.includes(f.chantier_id)
      );
      const heuresSaisiesSemaine = fichesSemaine.reduce((sum, f) => sum + (f.total_heures || 0), 0);

      const fichesMois = (fichesMoisResult.data || []).filter(f => 
        f.chantier_id && chantierIds.includes(f.chantier_id)
      );
      const heuresMoisEnCours = fichesMois.reduce((sum, f) => sum + (f.total_heures || 0), 0);

      // Fiches en retard
      const fichesEnRetardData = (fichesEnRetardResult.data || []).filter(f => {
        const chantier = f.chantiers as any;
        return chantier?.entreprise_id === entrepriseId;
      });
      
      const fichesEnRetard: FicheEnRetard[] = fichesEnRetardData.map(f => {
        const chantier = f.chantiers as any;
        const salarie = f.utilisateurs as any;
        return {
          id: f.id,
          semaine: f.semaine || "",
          chantier_nom: chantier?.nom || "N/A",
          chef_nom: "",
          salarie_nom: salarie ? `${salarie.prenom || ""} ${salarie.nom || ""}`.trim() : "N/A",
        };
      });

      // Conducteurs en attente
      const fichesEnAttente = (fichesEnAttenteResult.data || []).filter(f => {
        const chantier = f.chantiers as any;
        return chantier?.entreprise_id === entrepriseId;
      });

      // Fetch conducteur names
      const conducteurIds = [...new Set(fichesEnAttente.map(f => (f.chantiers as any)?.conducteur_id).filter(Boolean))];
      
      let conducteursMap: Record<string, { nom: string; prenom: string }> = {};
      if (conducteurIds.length > 0) {
        const { data: conducteurs } = await supabase
          .from("utilisateurs")
          .select("id, nom, prenom")
          .in("id", conducteurIds);
        
        conducteurs?.forEach(c => {
          conducteursMap[c.id] = { nom: c.nom || "", prenom: c.prenom || "" };
        });
      }

      // Group by conducteur
      const conducteurGroups: Record<string, { fiches: Set<string>; semaines: Set<string> }> = {};
      fichesEnAttente.forEach(f => {
        const conducteurId = (f.chantiers as any)?.conducteur_id;
        if (!conducteurId) return;
        
        if (!conducteurGroups[conducteurId]) {
          conducteurGroups[conducteurId] = { fiches: new Set(), semaines: new Set() };
        }
        conducteurGroups[conducteurId].fiches.add(f.id);
        if (f.semaine) conducteurGroups[conducteurId].semaines.add(f.semaine);
      });

      const conducteursEnAttente: ConducteurEnAttente[] = Object.entries(conducteurGroups)
        .map(([id, data]) => ({
          conducteur_id: id,
          conducteur_nom: conducteursMap[id]?.nom || "",
          conducteur_prenom: conducteursMap[id]?.prenom || "",
          nb_fiches: data.fiches.size,
          semaines: Array.from(data.semaines).sort(),
        }))
        .sort((a, b) => b.nb_fiches - a.nb_fiches);

      // Trajets à compléter
      const trajetsACompleter = trajetsResult.data?.length || 0;

      return {
        chantiersActifs,
        chantiersInactifs,
        fichesBrouillon,
        fichesValideChef,
        fichesEnvoyeRH,
        fichesCloture,
        semaineCourante,
        progressionTransmission: {
          total: totalEquipes,
          transmis: chantiersTransmis,
          pourcentage,
        },
        heuresSaisiesSemaine,
        heuresMoisEnCours,
        fichesEnRetard,
        chantiersOrphelins,
        conducteursEnAttente,
        trajetsACompleter,
      };
    },
    enabled: !!entrepriseId,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
};
