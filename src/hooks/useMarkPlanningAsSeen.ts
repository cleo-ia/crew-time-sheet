import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMarkPlanningAsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chantierId, entrepriseId }: { chantierId: string; entrepriseId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("planning_last_seen" as any)
        .upsert(
          {
            user_id: user.id,
            chantier_id: chantierId,
            entreprise_id: entrepriseId,
            last_seen_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id,chantier_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-planning-items-count"] });
    },
  });
};
