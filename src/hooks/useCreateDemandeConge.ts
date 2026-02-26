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
  site?: string;
  // Si créé par un conducteur, la demande bypass l'étape de validation conducteur
  createdByConducteur?: boolean;
  conducteurId?: string;
};

export const useCreateDemandeConge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateDemandeCongeInput) => {
      // Si créé par un conducteur, la demande est directement au statut VALIDEE_CONDUCTEUR
      // pour être transmise au RH sans passer par l'étape de validation conducteur
      const statut = input.createdByConducteur ? "VALIDEE_CONDUCTEUR" : "EN_ATTENTE";
      
      const insertData = {
        demandeur_id: input.demandeur_id,
        entreprise_id: input.entreprise_id,
        type_conge: input.type_conge,
        date_debut: input.date_debut,
        date_fin: input.date_fin,
        motif: input.motif || null,
        signature_data: input.signature_data || null,
        site: input.site || 'Senozan',
        statut,
        // Auto-validation si créé par conducteur
        ...(input.createdByConducteur && input.conducteurId && {
          validee_par_conducteur_id: input.conducteurId,
          validee_par_conducteur_at: new Date().toISOString(),
        }),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-conges"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-conges-conducteur"] });
      queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
      toast({
        title: "✅ Demande envoyée",
        description: variables.createdByConducteur
          ? "La demande a été transmise au RH pour validation."
          : "Votre demande de congé a été transmise pour validation.",
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
