import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type RefuseDemandeInput = {
  demandeId: string;
  refuseurId: string;
  motifRefus: string;
};

export const useRefuseDemandeConge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ demandeId, refuseurId, motifRefus }: RefuseDemandeInput) => {
      const { data, error } = await supabase
        .from("demandes_conges")
        .update({
          statut: "REFUSEE",
          refusee_par_id: refuseurId,
          refusee_par_at: new Date().toISOString(),
          motif_refus: motifRefus,
        })
        .eq("id", demandeId)
        .select()
        .single();

      if (error) {
        console.error("Erreur refus demande:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes-conges"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-conges-en-attente"] });
      toast({
        title: "Demande refusée",
        description: "La demande de congé a été refusée.",
      });
    },
    onError: (error) => {
      console.error("Erreur mutation:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de refuser la demande.",
      });
    },
  });
};
