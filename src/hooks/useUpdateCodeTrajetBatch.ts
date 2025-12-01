import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CodeTrajet } from "@/types/transport";

interface BatchUpdateParams {
  ficheJourIds: string[];
  codeTrajet: CodeTrajet | null;
}

export const useUpdateCodeTrajetBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ficheJourIds, codeTrajet }: BatchUpdateParams) => {
      if (ficheJourIds.length === 0) {
        throw new Error("Aucun jour à mettre à jour");
      }

      const { error } = await supabase
        .from("fiches_jours")
        .update({
          code_trajet: codeTrajet,
          updated_at: new Date().toISOString(),
        })
        .in("id", ficheJourIds);

      if (error) throw error;

      return { count: ficheJourIds.length, codeTrajet };
    },
    onSuccess: (data) => {
      // Invalider toutes les queries RH pour rafraîchir les données
      queryClient.invalidateQueries({ 
        queryKey: ["rh-fiche-detail"],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["rh-summary"] });
      queryClient.invalidateQueries({ queryKey: ["rh-details"] });
      queryClient.invalidateQueries({ queryKey: ["rh-employee-detail"] });

      const trajetLabel = data.codeTrajet || "Aucun";
      toast.success(`✓ ${trajetLabel} appliqué à ${data.count} jour${data.count > 1 ? 's' : ''}`);
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la mise à jour batch:", error);
      toast.error(`Erreur: ${error.message}`);
    },
  });
};
