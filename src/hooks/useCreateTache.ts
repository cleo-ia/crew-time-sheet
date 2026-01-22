import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateTacheInput {
  chantier_id: string;
  nom: string;
  description?: string;
  date_debut: string;
  date_fin: string;
  heures_estimees?: number;
  montant_vendu?: number;
  statut?: "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD";
  couleur?: string;
}

export const useCreateTache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // entreprise_id auto-filled by trigger set_entreprise_from_chantier
    mutationFn: async (input: CreateTacheInput) => {
      const { data, error } = await supabase
        .from("taches_chantier")
        .insert({
          chantier_id: input.chantier_id,
          nom: input.nom,
          description: input.description || null,
          date_debut: input.date_debut,
          date_fin: input.date_fin,
          heures_estimees: input.heures_estimees || null,
          montant_vendu: input.montant_vendu || 0,
          statut: input.statut || "A_FAIRE",
          couleur: input.couleur || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["taches-chantier", variables.chantier_id] });
      toast.success("Tâche créée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la création de la tâche:", error);
      toast.error("Erreur lors de la création de la tâche");
    },
  });
};
