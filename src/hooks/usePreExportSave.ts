import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ModifiedRow {
  ficheId: string;
  absencesOverride?: Record<string, number>;
  trajetsOverride?: Record<string, number>;
  absencesBaseline?: Record<string, number>;
  trajetsBaseline?: Record<string, number>;
  acomptes?: string;
  prets?: string;
  commentaireRH?: string;
  notesPaie?: string;
  totalSaisie?: string;
  saisieDuMois?: string;
  commentaireSaisie?: string;
  regularisationM1?: string;
  autresElements?: string;
}

export const usePreExportSave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modifiedRows: ModifiedRow[]) => {
      const updates = modifiedRows.map(async (row) => {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (row.absencesOverride) {
          updatePayload.absences_export_override = row.absencesOverride;
          if (row.absencesBaseline) updatePayload.absences_baseline = row.absencesBaseline;
        }
        if (row.trajetsOverride) {
          updatePayload.trajets_export_override = row.trajetsOverride;
          if (row.trajetsBaseline) updatePayload.trajets_baseline = row.trajetsBaseline;
        }
        if (row.acomptes !== undefined) updatePayload.acomptes = row.acomptes;
        if (row.prets !== undefined) updatePayload.prets = row.prets;
        if (row.commentaireRH !== undefined) updatePayload.commentaire_rh = row.commentaireRH;
        if (row.notesPaie !== undefined) updatePayload.notes_paie = row.notesPaie;
        if (row.totalSaisie !== undefined) updatePayload.total_saisie = row.totalSaisie;
        if (row.saisieDuMois !== undefined) updatePayload.saisie_du_mois = row.saisieDuMois;
        if (row.commentaireSaisie !== undefined) updatePayload.commentaire_saisie = row.commentaireSaisie;
        if (row.regularisationM1 !== undefined) updatePayload.regularisation_m1_export = row.regularisationM1;
        if (row.autresElements !== undefined) updatePayload.autres_elements_export = row.autresElements;

        const { error } = await supabase
          .from("fiches")
          .update(updatePayload)
          .eq("id", row.ficheId);

        if (error) throw error;
      });

      await Promise.all(updates);
      return modifiedRows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["rh-export"] });
      toast.success(`✅ ${count} modification(s) enregistrée(s) avec succès`);
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error(`❌ Erreur lors de l'enregistrement : ${error.message}`);
    },
  });
};
