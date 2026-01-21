import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSyncPlanningToTeams = () => {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (semaine?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("sync-planning-to-teams", {
        body: {
          execution_mode: 'manual',
          triggered_by: user?.id,
          force: true,
          semaine: semaine || undefined
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["affectations-jours-chef"] });
      queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs-jours"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      queryClient.invalidateQueries({ queryKey: ["finisseurs-conducteur"] });
      
      const stats = data?.stats || {};
      toast.success("Synchronisation terminée", {
        description: `${stats.copied || 0} copiés, ${stats.created || 0} créés, ${stats.deleted || 0} supprimés, ${stats.protected || 0} protégés`,
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la synchronisation", {
        description: error.message,
      });
    },
  });

  return {
    syncPlanningToTeams: syncMutation.mutate,
    syncPlanningToTeamsAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
};
