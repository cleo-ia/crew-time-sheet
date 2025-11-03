import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDeleteConducteurSignatures = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ficheId, conducteurId }: { ficheId: string; conducteurId: string }) => {
      console.log("🧹 Début suppression signatures conducteur", { ficheId, conducteurId });

      const isComposite = ficheId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{4}-(W|S)\d{2}$/i);
      let ficheIds: string[] = [];

      if (isComposite) {
        const lastHyphenIndex = ficheId.lastIndexOf("-");
        const secondLastHyphenIndex = ficheId.lastIndexOf("-", lastHyphenIndex - 1);
        const chantierId = ficheId.substring(0, secondLastHyphenIndex);
        const semaine = ficheId.substring(secondLastHyphenIndex + 1);

        const { data: fiches, error: fichesError } = await supabase
          .from("fiches")
          .select("id")
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine);

        if (fichesError) throw fichesError;
        ficheIds = fiches?.map(f => f.id) ?? [];
      } else {
        ficheIds = [ficheId];
      }

      console.log("🧾 Fiches ciblées pour suppression:", ficheIds);

      const { data, error } = await supabase
        .from("signatures")
        .delete()
        .in("fiche_id", ficheIds)
        .eq("signed_by", conducteurId)
        .eq("role", "conducteur")
        .select();

      if (error) throw error;
      console.log("✅ Signatures supprimées:", data?.length ?? 0);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conducteur-signature"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      toast({ 
        title: "Signature supprimée", 
        description: "La signature du conducteur a été retirée." 
      });
    },
    onError: (error: any) => {
      console.error("❌ Erreur suppression signatures:", error);
      toast({ 
        title: "Erreur", 
        description: error?.message || "Impossible de supprimer la signature.", 
        variant: "destructive" 
      });
    },
  });
};
