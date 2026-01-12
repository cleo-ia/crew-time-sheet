import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook pour marquer les demandes de congés traitées comme "lues" par le demandeur.
 * À appeler quand le chef/conducteur ouvre le panneau des congés.
 */
export const useMarkDemandesAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ demandeurIds }: { demandeurIds: string[] }) => {
      if (demandeurIds.length === 0) return;
      
      const { error } = await supabase
        .from("demandes_conges")
        .update({ lu_par_demandeur: true })
        .in("demandeur_id", demandeurIds)
        .in("statut", ["VALIDEE_RH", "REFUSEE"])
        .eq("lu_par_demandeur", false);
      
      if (error) {
        console.error("Erreur mise à jour lu_par_demandeur:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes-traitees-non-lues"] });
    },
  });
};
