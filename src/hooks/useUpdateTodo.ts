import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdateTodoInput {
  id: string;
  chantier_id: string;
  nom?: string;
  description?: string | null;
  statut?: "A_FAIRE" | "EN_COURS" | "TERMINE";
  priorite?: "BASSE" | "NORMALE" | "HAUTE" | null;
  date_echeance?: string | null;
}

export const useUpdateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTodoInput) => {
      const { id, chantier_id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("todos_chantier")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["todos-chantier", variables.chantier_id] });
      toast.success("Todo mis à jour");
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour du todo:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
};
