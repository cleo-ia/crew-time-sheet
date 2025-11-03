import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteEmployeeFromFicheParams {
  ficheId: string;
}

export const useDeleteEmployeeFromFiche = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ficheId }: DeleteEmployeeFromFicheParams) => {
      // 1. Supprimer tous les fiches_jours liés à cette fiche
      const { error: joursError } = await supabase
        .from("fiches_jours")
        .delete()
        .eq("fiche_id", ficheId);

      if (joursError) throw joursError;

      // 2. Supprimer la fiche elle-même
      const { error: ficheError } = await supabase
        .from("fiches")
        .delete()
        .eq("id", ficheId);

      if (ficheError) throw ficheError;

      return { ficheId };
    },
    onSuccess: () => {
      // Invalider les queries pour recharger les données
      queryClient.invalidateQueries({ queryKey: ["fiche-detail-edit"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-detail"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });

      toast({
        title: "Employé supprimé",
        description: "L'employé a été retiré de la fiche avec succès.",
      });
    },
    onError: (error: any) => {
      console.error("Erreur lors de la suppression de l'employé:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'employé.",
        variant: "destructive",
      });
    },
  });
};
