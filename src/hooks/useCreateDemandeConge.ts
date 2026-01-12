import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { TypeConge } from "@/components/conges/DemandeCongeForm";

type CreateDemandeCongeInput = {
  demandeur_id: string;
  entreprise_id: string;
  type_conge: TypeConge;
  date_debut: string;
  date_fin: string;
  motif?: string;
  signature_data?: string;
};

export const useCreateDemandeConge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateDemandeCongeInput) => {
      // Cast needed because signature_data was added via migration and types may not be regenerated yet
      const insertData = {
        demandeur_id: input.demandeur_id,
        entreprise_id: input.entreprise_id,
        type_conge: input.type_conge,
        date_debut: input.date_debut,
        date_fin: input.date_fin,
        motif: input.motif || null,
        signature_data: input.signature_data || null,
        statut: "EN_ATTENTE" as const,
      };
      
      const { data, error } = await supabase
        .from("demandes_conges")
        .insert(insertData as any)
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
