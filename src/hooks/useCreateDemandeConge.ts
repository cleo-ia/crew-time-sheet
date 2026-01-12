import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CreateDemandeCongeInput = {
  demandeur_id: string;
  entreprise_id: string;
  type_conge: "CP" | "RTT" | "MALADIE" | "AUTRE";
  date_debut: string;
  date_fin: string;
  motif?: string;
};

export const useCreateDemandeConge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateDemandeCongeInput) => {
      const { data, error } = await supabase
        .from("demandes_conges")
        .insert({
          demandeur_id: input.demandeur_id,
          entreprise_id: input.entreprise_id,
          type_conge: input.type_conge,
          date_debut: input.date_debut,
          date_fin: input.date_fin,
          motif: input.motif || null,
          statut: "EN_ATTENTE",
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création demande congé:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes-conges"] });
      toast({
        title: "✅ Demande envoyée",
        description: "Votre demande de congé a été transmise pour validation.",
      });
    },
    onError: (error) => {
      console.error("Erreur mutation:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la demande de congé.",
      });
    },
  });
};
