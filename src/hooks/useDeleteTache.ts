import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteTacheInput {
  id: string;
  chantier_id: string;
}

export const useDeleteTache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteTacheInput) => {
      const { error } = await supabase
        .from("taches_chantier")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["taches-chantier", variables.chantier_id] });
      toast.success("Tâche supprimée");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression de la tâche:", error);
      toast.error("Erreur lors de la suppression de la tâche");
    },
  });
};
