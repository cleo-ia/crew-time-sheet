import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdateTacheInput {
  id: string;
  chantier_id: string;
  nom?: string;
  description?: string | null;
  date_debut?: string;
  date_fin?: string;
  heures_estimees?: number | null;
  heures_realisees?: number | null;
  montant_vendu?: number | null;
  statut?: "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD";
  ordre?: number;
  couleur?: string | null;
}

export const useUpdateTache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chantier_id, ...updates }: UpdateTacheInput) => {
      const { data, error } = await supabase
        .from("taches_chantier")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, chantier_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["taches-chantier", result.chantier_id] });
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour de la tâche:", error);
      toast.error("Erreur lors de la mise à jour de la tâche");
    },
  });
};
