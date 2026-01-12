import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ValidateDemandeInput = {
  demandeId: string;
  valideurId: string;
  role: "conducteur" | "rh";
};

export const useValidateDemandeConge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ demandeId, valideurId, role }: ValidateDemandeInput) => {
      const updateData: Record<string, unknown> = {};

      if (role === "conducteur") {
        updateData.statut = "VALIDEE_CONDUCTEUR";
        updateData.validee_par_conducteur_id = valideurId;
        updateData.validee_par_conducteur_at = new Date().toISOString();
      } else if (role === "rh") {
        updateData.statut = "VALIDEE_RH";
        updateData.validee_par_rh_id = valideurId;
        updateData.validee_par_rh_at = new Date().toISOString();
        updateData.lu_par_demandeur = false; // Notifier le demandeur
      }

      const { data, error } = await supabase
        .from("demandes_conges")
        .update(updateData)
        .eq("id", demandeId)
        .select()
        .single();

      if (error) {
        console.error("Erreur validation demande:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-conges"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-conges-en-attente"] });
      toast({
        title: "✅ Demande validée",
        description: variables.role === "conducteur" 
          ? "La demande a été validée. Elle est maintenant en attente de validation RH."
          : "La demande de congé a été définitivement validée.",
      });
    },
    onError: (error) => {
      console.error("Erreur mutation:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de valider la demande.",
      });
    },
  });
};
