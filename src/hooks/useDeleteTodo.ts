import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteTodoInput {
  id: string;
  chantier_id: string;
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteTodoInput) => {
      const { error } = await supabase
        .from("todos_chantier")
        .delete()
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["todos-chantier", variables.chantier_id] });
      toast.success("Todo supprimé");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression du todo:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
};
