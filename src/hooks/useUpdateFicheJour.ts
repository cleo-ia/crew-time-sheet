import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdateFicheJourParams {
  ficheJourId: string;
  field: "HNORM" | "HI" | "T" | "PA" | "trajet_perso" | "type_absence" | "regularisation_m1" | "autres_elements";
  value: number | boolean | string;
}

export const useUpdateFicheJour = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ficheJourId, field, value }: UpdateFicheJourParams) => {
      // Validation côté client
      if (typeof value === "number") {
        if (value < 0) {
          throw new Error("La valeur ne peut pas être négative");
        }
        if (["HNORM", "HI"].includes(field) && value > 24) {
          throw new Error("Les heures ne peuvent pas dépasser 24h");
        }
        if (field === "T" && value > 10) {
          throw new Error("Le nombre de trajets ne peut pas dépasser 10");
        }
      }

      // Construire le payload dynamiquement
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Si on modifie HNORM, synchroniser avec heures pour la cohérence visuelle
      if (field === "HNORM") {
        updatePayload.HNORM = value as number;
        updatePayload.heures = value as number;
      } else {
        updatePayload[field] = value;
      }

      const { error } = await supabase
        .from("fiches_jours")
        .update(updatePayload)
        .eq("id", ficheJourId);

      if (error) throw error;

      return { ficheJourId, field, value };
    },
    onSuccess: () => {
      // Invalider toutes les queries RH pour rafraîchir les données
      queryClient.invalidateQueries({ 
        queryKey: ["rh-fiche-detail"],
        exact: false  // Invalider toutes les queries qui commencent par ["rh-fiche-detail"]
      });
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["rh-summary"] });
      queryClient.invalidateQueries({ queryKey: ["rh-details"] });
      queryClient.invalidateQueries({ queryKey: ["rh-employee-detail"] });

      toast.success("✓ Modification enregistrée");
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error(`Erreur: ${error.message}`);
    },
  });
};
