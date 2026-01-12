import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DemandeConge } from "./useDemandesConges";

// Hook pour récupérer toutes les demandes de congés de l'entreprise (pour RH)
export const useDemandesCongesRH = (entrepriseId?: string | null) => {
  return useQuery({
    queryKey: ["demandes-conges-rh", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("demandes_conges")
        .select(`
          *,
          demandeur:utilisateurs!demandes_conges_demandeur_id_fkey(id, nom, prenom)
        `)
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement demandes congés RH:", error);
        throw error;
      }

      return (data || []) as DemandeConge[];
    },
    enabled: !!entrepriseId,
  });
};

// Hook pour compter les demandes en attente de validation RH (statut VALIDEE_CONDUCTEUR)
export const useDemandesEnAttenteRH = (entrepriseId?: string | null) => {
  return useQuery({
    queryKey: ["demandes-conges-en-attente-rh", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return 0;

      const { count, error } = await supabase
        .from("demandes_conges")
        .select("*", { count: "exact", head: true })
        .eq("entreprise_id", entrepriseId)
        .eq("statut", "VALIDEE_CONDUCTEUR");

      if (error) {
        console.error("Erreur comptage demandes en attente RH:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!entrepriseId,
  });
};
