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

// CORRECTION: Accepte un tableau d'IDs pour supporter auth_user_id ET utilisateurs.id
export const useUserDetailAnalytics = (userIds: string[], entrepriseId: string | null) => {
  const sessionsQuery = useQuery({
    queryKey: ['user-sessions-detail-v2', userIds, entrepriseId],
    queryFn: async () => {
      if (!userIds.length || !entrepriseId) return [];

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .in('user_id', userIds)
        .eq('entreprise_id', entrepriseId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Dédupliquer par ID de session
      const seen = new Set<string>();
      return (data as SessionDetail[]).filter(session => {
        if (seen.has(session.id)) return false;
        seen.add(session.id);
        return true;
      });
    },
    enabled: userIds.length > 0 && !!entrepriseId,
  });

  const activityQuery = useQuery({
    queryKey: ['user-activity-detail-v2', userIds, entrepriseId],
    queryFn: async () => {
      if (!userIds.length || !entrepriseId) return [];

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .in('user_id', userIds)
        .eq('entreprise_id', entrepriseId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Dédupliquer par ID
      const seen = new Set<string>();
      return (data as ActivityLog[]).filter(log => {
        if (seen.has(log.id)) return false;
        seen.add(log.id);
        return true;
      });
    },
    enabled: userIds.length > 0 && !!entrepriseId,
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
