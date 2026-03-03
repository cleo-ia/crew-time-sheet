import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useNewPlanningItemsCount = (chantierId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["new-planning-items-count", chantierId, userId],
    enabled: !!chantierId && !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!chantierId || !userId) return 0;

      // Get last_seen_at for this user/chantier
      const { data: lastSeenRow } = await (supabase as any)
        .from("planning_last_seen")
        .select("last_seen_at")
        .eq("user_id", userId)
        .eq("chantier_id", chantierId)
        .maybeSingle();

      const lastSeenAt = lastSeenRow?.last_seen_at as string | null;

      // Count new taches
      let tachesQuery = (supabase as any)
        .from("taches_chantier")
        .select("id", { count: "exact", head: true })
        .eq("chantier_id", chantierId)
        .neq("created_by", userId)
        .not("created_by", "is", null);

      if (lastSeenAt) {
        tachesQuery = tachesQuery.gt("created_at", lastSeenAt);
      }

      const { count: tachesCount } = await tachesQuery;

      // Count new todos
      let todosQuery = (supabase as any)
        .from("todos_chantier")
        .select("id", { count: "exact", head: true })
        .eq("chantier_id", chantierId)
        .neq("created_by", userId)
        .not("created_by", "is", null);

      if (lastSeenAt) {
        todosQuery = todosQuery.gt("created_at", lastSeenAt);
      }

      const { count: todosCount } = await todosQuery;

      return (tachesCount || 0) + (todosCount || 0);
    },
  });
};
