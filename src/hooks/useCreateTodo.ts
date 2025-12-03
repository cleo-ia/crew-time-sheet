import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateTodoInput {
  chantier_id: string;
  nom: string;
  description?: string;
  priorite?: "BASSE" | "NORMALE" | "HAUTE";
  date_echeance?: string;
  afficher_planning?: boolean;
}

export const useCreateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTodoInput) => {
      const { data, error } = await supabase
        .from("todos_chantier")
        .insert({
          chantier_id: input.chantier_id,
          nom: input.nom,
          description: input.description || null,
          priorite: input.priorite || "NORMALE",
          date_echeance: input.date_echeance || null,
          afficher_planning: input.afficher_planning ?? false,
          statut: "A_FAIRE",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["todos-chantier", variables.chantier_id] });
      toast.success("Todo créé avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la création du todo:", error);
      toast.error("Erreur lors de la création du todo");
    },
  });
};
