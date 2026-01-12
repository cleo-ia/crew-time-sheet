import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook pour compter les demandes de congés traitées par le RH (validées ou refusées)
 * mais non encore lues par le demandeur.
 */
export const useDemandesTraiteesNonLues = (demandeurIds: string[]) => {
  return useQuery({
    queryKey: ["demandes-traitees-non-lues", demandeurIds],
    queryFn: async () => {
      if (demandeurIds.length === 0) return 0;
      
      const { count, error } = await supabase
        .from("demandes_conges")
        .select("*", { count: "exact", head: true })
        .in("demandeur_id", demandeurIds)
        .in("statut", ["VALIDEE_RH", "REFUSEE"])
        .eq("lu_par_demandeur", false);
      
      if (error) {
        console.error("Erreur comptage demandes non lues:", error);
        throw error;
      }
      return count || 0;
    },
    enabled: demandeurIds.length > 0,
  });
};
