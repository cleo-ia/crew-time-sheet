import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransfererEquipeParams {
  sourceChantierId: string;
  destinationChantierId: string;
  semaine: string;
  chefId: string;
}

export const useTransfererEquipe = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sourceChantierId, 
      destinationChantierId, 
      semaine, 
      chefId 
    }: TransfererEquipeParams) => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Récupérer toutes les affectations actives pour le chantier source
      const { data: sourceAffectations, error: sourceError } = await supabase
        .from("affectations")
        .select("id, macon_id")
        .eq("chantier_id", sourceChantierId)
        .is("date_fin", null);

      if (sourceError) throw sourceError;
      if (!sourceAffectations || sourceAffectations.length === 0) {
        return { transferred: 0 };
      }

      // Filtrer pour exclure le chef lui-même
      const affectationsToTransfer = sourceAffectations.filter(aff => aff.macon_id !== chefId);

      if (affectationsToTransfer.length === 0) {
        return { transferred: 0 };
      }

      // 2. Vérifier les affectations existantes sur le chantier destination
      const { data: destAffectations, error: destError } = await supabase
        .from("affectations")
        .select("macon_id")
        .eq("chantier_id", destinationChantierId)
        .is("date_fin", null);

      if (destError) throw destError;

      const alreadyOnDest = new Set((destAffectations || []).map(a => a.macon_id));

      let totalFichesDeleted = 0;
      let transferred = 0;
      let skipped = 0;

      // 3. Pour chaque membre, transférer vers le nouveau chantier
      for (const affectation of affectationsToTransfer) {
        // Si déjà affecté sur la destination, on skip
        if (alreadyOnDest.has(affectation.macon_id)) {
          skipped++;
          continue;
        }

        // Supprimer les fiches non finalisées du chantier source
        const { data: fiches, error: fetchError } = await supabase
          .from("fiches")
          .select("id")
          .eq("salarie_id", affectation.macon_id)
          .eq("chantier_id", sourceChantierId)
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

        // Fermer l'affectation source
        const { error: closeError } = await supabase
          .from("affectations")
          .update({ date_fin: today })
          .eq("id", affectation.id);

        if (closeError) throw closeError;

        // Créer nouvelle affectation sur le chantier destination
        const { error: createError } = await supabase
          .from("affectations")
          .insert({
            macon_id: affectation.macon_id,
            chantier_id: destinationChantierId,
            date_debut: today,
            date_fin: null,
          } as any);

        if (createError) throw createError;

        transferred++;
      }

      return { 
        transferred,
        skipped,
        fichesDeleted: totalFichesDeleted
      };
    },
    onSuccess: (data) => {
      // Invalider tous les caches concernés
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiches-by-status"] });

      if (data.transferred > 0) {
        let message = `${data.transferred} membre(s) transféré(s)`;
        if (data.fichesDeleted) {
          message += `, ${data.fichesDeleted} fiche(s) supprimée(s)`;
        }
        if (data.skipped) {
          message += ` (${data.skipped} déjà sur place)`;
        }
        toast({
          title: "Équipe transférée",
          description: message + ".",
        });
      } else if (data.skipped > 0) {
        toast({
          title: "Aucun transfert",
          description: `Tous les membres (${data.skipped}) sont déjà affectés au chantier de destination.`,
        });
      }
    },
    onError: (error) => {
      console.error("Error transferring team:", error);
      toast({
        title: "Erreur",
        description: "Impossible de transférer l'équipe.",
        variant: "destructive",
      });
    },
  });
};
