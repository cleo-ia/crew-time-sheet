import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";
import { toast } from "sonner";

export const usePlanningValidation = (semaine: string) => {
  const queryClient = useQueryClient();
  const { data: entrepriseId } = useCurrentEntrepriseId();

  // Vérifie si le planning est validé
  const { data: isValidated, isLoading } = useQuery({
    queryKey: ["planning-validation", entrepriseId, semaine],
    queryFn: async () => {
      if (!entrepriseId) return false;

      const { data, error } = await supabase
        .from("planning_validations")
        .select("id, validated_at, validated_by")
        .eq("entreprise_id", entrepriseId)
        .eq("semaine", semaine)
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    },
    enabled: !!entrepriseId && !!semaine,
  });

  // Mutation pour valider le planning
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!entrepriseId) throw new Error("Entreprise non trouvée");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { error } = await supabase
        .from("planning_validations")
        .insert({
          entreprise_id: entrepriseId,
          semaine,
          validated_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-validation", entrepriseId, semaine] });
      toast.success("Planning validé", {
        description: `Le planning ${semaine} sera synchronisé lundi à 5h.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la validation", {
        description: error.message,
      });
    },
  });

  // Mutation pour invalider le planning (si modification nécessaire)
  const invalidateMutation = useMutation({
    mutationFn: async () => {
      if (!entrepriseId) throw new Error("Entreprise non trouvée");

      const { error } = await supabase
        .from("planning_validations")
        .delete()
        .eq("entreprise_id", entrepriseId)
        .eq("semaine", semaine);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-validation", entrepriseId, semaine] });
      toast.success("Validation annulée", {
        description: "Vous pouvez maintenant modifier le planning.",
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'annulation", {
        description: error.message,
      });
    },
  });

  return {
    isValidated: isValidated ?? false,
    isLoading,
    validatePlanning: validateMutation.mutate,
    invalidatePlanning: invalidateMutation.mutate,
    isValidating: validateMutation.isPending,
    isInvalidating: invalidateMutation.isPending,
  };
};
