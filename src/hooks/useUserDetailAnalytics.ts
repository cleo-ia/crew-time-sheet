import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SessionDetail {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  pages_visited: number | null;
  device_type: string | null;
  browser: string | null;
  is_active: boolean | null;
}

export interface ActivityLog {
  id: string;
  created_at: string;
  event_type: string;
  page_path: string | null;
  page_name: string | null;
}

export interface UserDetailStats {
  totalSessions: number;
  totalDuration: number;
  totalPagesVisited: number;
  mostVisitedPages: { page: string; count: number }[];
  activeDays: number;
  averageSessionDuration: number;
}

export const useUserDetailAnalytics = (userId: string | null, entrepriseId: string | null) => {
  const sessionsQuery = useQuery({
    queryKey: ['user-sessions-detail', userId, entrepriseId],
    queryFn: async () => {
      if (!userId || !entrepriseId) return [];

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('entreprise_id', entrepriseId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SessionDetail[];
    },
    enabled: !!userId && !!entrepriseId,
  });

  const activityQuery = useQuery({
    queryKey: ['user-activity-detail', userId, entrepriseId],
    queryFn: async () => {
      if (!userId || !entrepriseId) return [];

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('entreprise_id', entrepriseId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!userId && !!entrepriseId,
  });

  const stats: UserDetailStats | null = sessionsQuery.data && activityQuery.data ? (() => {
    const sessions = sessionsQuery.data;
    const activities = activityQuery.data;

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
    const totalPagesVisited = sessions.reduce((acc, s) => acc + (s.pages_visited || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Pages les plus visitées
    const pageVisits = activities
      .filter(a => a.event_type === 'page_view' && a.page_name)
      .reduce((acc, a) => {
        const page = a.page_name!;
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostVisitedPages = Object.entries(pageVisits)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Jours actifs uniques
    const uniqueDays = new Set(
      sessions.map(s => new Date(s.started_at).toDateString())
    );
    const activeDays = uniqueDays.size;

    return {
      totalSessions,
      totalDuration,
      totalPagesVisited,
      mostVisitedPages,
      activeDays,
      averageSessionDuration,
    };
  })() : null;

  return {
    sessions: sessionsQuery.data || [],
    activities: activityQuery.data || [],
    stats,
    isLoading: sessionsQuery.isLoading || activityQuery.isLoading,
    error: sessionsQuery.error || activityQuery.error,
  };
};
