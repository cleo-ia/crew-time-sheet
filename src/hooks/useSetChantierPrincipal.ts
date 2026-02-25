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
      chantierId: string | null;
    }) => {
      // 1. Mettre à jour le chantier principal de l'utilisateur
      const { error: userError } = await supabase
        .from("utilisateurs")
        .update({ chantier_principal_id: chantierId })
        .eq("id", employeId);

      if (userError) throw userError;

      // 2. Si on définit un chantier principal et qu'il n'a pas de chef, associer ce chef
      if (chantierId) {
        const { data: chantier } = await supabase
          .from("chantiers")
          .select("chef_id")
          .eq("id", chantierId)
          .single();

        if (!chantier?.chef_id) {
          await supabase
            .from("chantiers")
            .update({ chef_id: employeId })
            .eq("id", chantierId);
        }
      }
    },
    onSuccess: (_, variables) => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["planning-affectations"] });
      queryClient.invalidateQueries({ queryKey: ["all-employes"] });
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });
      queryClient.invalidateQueries({ queryKey: ["chantiers"] });
      
      if (variables.chantierId) {
        toast.success("Chantier principal mis à jour", {
          description: "Les heures du chef seront comptées sur ce chantier.",
        });
      } else {
        toast.success("Chantier principal retiré", {
          description: "Le chef n'a plus de distinction principal/secondaire.",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour", {
        description: error.message,
      });
    },
  });
};
