import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DissoudreEquipeParams {
  chantierId: string;
  semaine: string;
  chefId: string;
}

export const useDissoudreEquipe = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chantierId, semaine, chefId }: DissoudreEquipeParams) => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Récupérer toutes les affectations actives pour ce chantier
      const { data: affectations, error: affectationsError } = await supabase
        .from("affectations")
        .select("id, macon_id")
        .eq("chantier_id", chantierId)
        .is("date_fin", null);

      if (affectationsError) throw affectationsError;
      if (!affectations || affectations.length === 0) {
        return { dissolved: 0 };
      }

      // Filtrer pour exclure le chef lui-même
      const affectationsToDissolve = affectations.filter(aff => aff.macon_id !== chefId);

      if (affectationsToDissolve.length === 0) {
        return { dissolved: 0 };
      }

      let totalFichesDeleted = 0;

      // 2. Pour chaque membre, supprimer les fiches non finalisées et fermer l'affectation
      for (const affectation of affectationsToDissolve) {
        // Récupérer les fiches BROUILLON ou VALIDE_CHEF uniquement
        const { data: fiches, error: fetchError } = await supabase
          .from("fiches")
          .select("id")
          .eq("salarie_id", affectation.macon_id)
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine)
          .in("statut", ["BROUILLON", "VALIDE_CHEF"]);

        if (fetchError) throw fetchError;

        if (fiches && fiches.length > 0) {
          const ficheIds = fiches.map(f => f.id);

          // Supprimer signatures
          await supabase
            .from("signatures")
            .delete()
            .in("fiche_id", ficheIds);

          // Supprimer fiches_jours
          await supabase
            .from("fiches_jours")
            .delete()
            .in("fiche_id", ficheIds);

          // Supprimer fiches
          await supabase
            .from("fiches")
            .delete()
            .in("id", ficheIds);

          totalFichesDeleted += ficheIds.length;
        }

        // Fermer l'affectation
        const { error: updateError } = await supabase
          .from("affectations")
          .update({ date_fin: today })
          .eq("id", affectation.id);

        if (updateError) throw updateError;
      }

      return { 
        dissolved: affectationsToDissolve.length,
        fichesDeleted: totalFichesDeleted
      };
    },
    onSuccess: (data) => {
      // Invalider tous les caches concernés
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiches-by-status"] });

      if (data.dissolved > 0) {
        toast({
          title: "Équipe dissoute",
          description: `${data.dissolved} membre(s) libéré(s)${data.fichesDeleted ? `, ${data.fichesDeleted} fiche(s) supprimée(s)` : ""}.`,
        });
      }
    },
    onError: (error) => {
      console.error("Error dissolving team:", error);
      toast({
        title: "Erreur",
        description: "Impossible de dissoudre l'équipe.",
        variant: "destructive",
      });
    },
  });
};
