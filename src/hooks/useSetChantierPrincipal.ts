import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook pour définir le chantier principal d'un chef multi-chantiers.
 * Les heures personnelles du chef ne seront comptées que sur ce chantier.
 */
export const useSetChantierPrincipal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      employeId, 
      chantierId 
    }: { 
      employeId: string; 
      chantierId: string;
    }) => {
      const { error } = await supabase
        .from("utilisateurs")
        .update({ chantier_principal_id: chantierId })
        .eq("id", employeId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["planning-affectations"] });
      queryClient.invalidateQueries({ queryKey: ["all-employes"] });
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });
      
      toast.success("Chantier principal mis à jour", {
        description: "Les heures du chef seront comptées sur ce chantier.",
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour", {
        description: error.message,
      });
    },
  });
};
