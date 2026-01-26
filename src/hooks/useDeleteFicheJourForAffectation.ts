import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DeleteFicheJourParams {
  finisseurId: string;
  date: string;
  semaine: string;
  chantierId?: string; // ✅ Ajouté pour chercher par chantier
}

export const useDeleteFicheJourForAffectation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ finisseurId, date, semaine, chantierId }: DeleteFicheJourParams) => {
      console.log(`[useDeleteFicheJourForAffectation] Deleting fiche_jour for ${finisseurId} on ${date} (chantier: ${chantierId || 'unknown'})`);

      // 1. Trouver la fiche - avec chantierId si fourni
      let query = supabase
        .from("fiches")
        .select("id")
        .eq("semaine", semaine)
        .eq("salarie_id", finisseurId);
      
      if (chantierId) {
        query = query.eq("chantier_id", chantierId);
      }
      
      const { data: fiche } = await query.maybeSingle();

      if (!fiche) {
        console.log(`[useDeleteFicheJourForAffectation] No fiche found`);
        return;
      }

      // 2. Supprimer le fiche_jour pour cette date
      const { error: deleteError } = await supabase
        .from("fiches_jours")
        .delete()
        .eq("fiche_id", fiche.id)
        .eq("date", date);

      if (deleteError) throw deleteError;

      // 3. Vérifier s'il reste des jours
      const { data: remainingJours } = await supabase
        .from("fiches_jours")
        .select("id")
        .eq("fiche_id", fiche.id);

      if (!remainingJours || remainingJours.length === 0) {
        // Supprimer la fiche si elle n'a plus de jours
        await supabase
          .from("fiches")
          .delete()
          .eq("id", fiche.id);
        console.log(`[useDeleteFicheJourForAffectation] Deleted fiche (no more days)`);
        return;
      }

      console.log(`[useDeleteFicheJourForAffectation] ${remainingJours.length} day(s) remaining - heures inchangées`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiches_jours"] });
    },
    onError: (error) => {
      console.error("[useDeleteFicheJourForAffectation] Error:", error);
    },
  });
};
