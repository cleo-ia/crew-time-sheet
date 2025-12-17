/**
 * Hook pour récupérer les statistiques d'activité utilisateur
 * Utilisé par le dashboard admin
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, format } from 'date-fns';

export type PeriodFilter = 'today' | '7days' | '30days' | 'all';

interface UserActivityStats {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  lastConnection: string | null;
  sessionsCount: number;
  avgDurationSeconds: number;
  totalPagesVisited: number;
  deviceType: string | null;
}

interface GlobalStats {
  activeUsersToday: number;
  activeUsers7Days: number;
  totalSessions: number;
  avgSessionDuration: number;
  deviceDistribution: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  topPages: Array<{ page: string; count: number }>;
}

const getDateFilter = (period: PeriodFilter): Date | null => {
  switch (period) {
    case 'today':
      return startOfDay(new Date());
    case '7days':
      return subDays(new Date(), 7);
    case '30days':
      return subDays(new Date(), 30);
    case 'all':
      return null;
  }
};

export const useUserAnalytics = (period: PeriodFilter = '7days') => {
  const entrepriseId = localStorage.getItem('current_entreprise_id');

  // Stats globales
  const globalStatsQuery = useQuery({
    queryKey: ['user-analytics-global', entrepriseId, period],
    queryFn: async (): Promise<GlobalStats> => {
      if (!entrepriseId) throw new Error('No entreprise selected');

      const dateFilter = getDateFilter(period);

      // Sessions query
      let sessionsQuery = supabase
        .from('user_sessions')
        .select('*')
        .eq('entreprise_id', entrepriseId);

      if (dateFilter) {
        sessionsQuery = sessionsQuery.gte('started_at', dateFilter.toISOString());
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      // Activity logs for page views
      let logsQuery = supabase
        .from('user_activity_logs')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .eq('event_type', 'page_view');

      if (dateFilter) {
        logsQuery = logsQuery.gte('created_at', dateFilter.toISOString());
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      // Calculer les stats
      const todayStart = startOfDay(new Date()).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const activeUsersToday = new Set(
        sessions?.filter(s => s.started_at >= todayStart).map(s => s.user_id)
      ).size;

      const activeUsers7Days = new Set(
        sessions?.filter(s => s.started_at >= sevenDaysAgo).map(s => s.user_id)
      ).size;

      const completedSessions = sessions?.filter(s => s.duration_seconds != null) || [];
      const avgSessionDuration = completedSessions.length > 0
        ? completedSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / completedSessions.length
        : 0;

      // Distribution des appareils
      const deviceCounts = {
        desktop: sessions?.filter(s => s.device_type === 'desktop').length || 0,
        mobile: sessions?.filter(s => s.device_type === 'mobile').length || 0,
        tablet: sessions?.filter(s => s.device_type === 'tablet').length || 0,
        unknown: sessions?.filter(s => !s.device_type || s.device_type === 'unknown').length || 0,
      };

      // Top pages
      const pageCountsMap = new Map<string, number>();
      logs?.forEach(log => {
        const page = log.page_name || log.page_path || 'Unknown';
        pageCountsMap.set(page, (pageCountsMap.get(page) || 0) + 1);
      });
      const topPages = Array.from(pageCountsMap.entries())
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        activeUsersToday,
        activeUsers7Days,
        totalSessions: sessions?.length || 0,
        avgSessionDuration: Math.round(avgSessionDuration),
        deviceDistribution: deviceCounts,
        topPages,
      };
    },
    enabled: !!entrepriseId,
  });

  // Stats par utilisateur
  const userStatsQuery = useQuery({
    queryKey: ['user-analytics-users', entrepriseId, period],
    queryFn: async (): Promise<UserActivityStats[]> => {
      if (!entrepriseId) throw new Error('No entreprise selected');

      const dateFilter = getDateFilter(period);

      // Get all sessions with filtering
      let sessionsQuery = supabase
        .from('user_sessions')
        .select('*')
        .eq('entreprise_id', entrepriseId);

      if (dateFilter) {
        sessionsQuery = sessionsQuery.gte('started_at', dateFilter.toISOString());
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      // Get users info from profiles and user_roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('entreprise_id', entrepriseId);
      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('entreprise_id', entrepriseId);
      if (rolesError) throw rolesError;

      // Create a map of user sessions
      const userSessionsMap = new Map<string, typeof sessions>();
      sessions?.forEach(session => {
        const existing = userSessionsMap.get(session.user_id) || [];
        existing.push(session);
        userSessionsMap.set(session.user_id, existing);
      });

      // Build user stats
      const userStats: UserActivityStats[] = (profiles || []).map(profile => {
        const userSessions = userSessionsMap.get(profile.id) || [];
        const userRole = userRoles?.find(r => r.user_id === profile.id);

        // Last connection
        const sortedSessions = [...userSessions].sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        const lastConnection = sortedSessions[0]?.started_at || null;

        // Average duration
        const completedSessions = userSessions.filter(s => s.duration_seconds != null);
        const avgDuration = completedSessions.length > 0
          ? completedSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / completedSessions.length
          : 0;

        // Total pages
        const totalPages = userSessions.reduce((acc, s) => acc + (s.pages_visited || 0), 0);

        // Most used device
        const deviceCounts = new Map<string, number>();
        userSessions.forEach(s => {
          const device = s.device_type || 'unknown';
          deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
        });
        let mostUsedDevice: string | null = null;
        let maxCount = 0;
        deviceCounts.forEach((count, device) => {
          if (count > maxCount) {
            maxCount = count;
            mostUsedDevice = device;
          }
        });

        return {
          userId: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: userRole?.role || null,
          lastConnection,
          sessionsCount: userSessions.length,
          avgDurationSeconds: Math.round(avgDuration),
          totalPagesVisited: totalPages,
          deviceType: mostUsedDevice,
        };
      });

      // Sort by last connection (most recent first)
      return userStats.sort((a, b) => {
        if (!a.lastConnection) return 1;
        if (!b.lastConnection) return -1;
        return new Date(b.lastConnection).getTime() - new Date(a.lastConnection).getTime();
      });
    },
    enabled: !!entrepriseId,
  });

  // Données pour le graphique (connexions par jour)
  const dailyStatsQuery = useQuery({
    queryKey: ['user-analytics-daily', entrepriseId, period],
    queryFn: async () => {
      if (!entrepriseId) throw new Error('No entreprise selected');

      const days = period === 'today' ? 1 : period === '7days' ? 7 : 30;
      const dateFilter = subDays(new Date(), days);

      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('started_at, user_id')
        .eq('entreprise_id', entrepriseId)
        .gte('started_at', dateFilter.toISOString());

      if (error) throw error;

      // Group by day
      const dailyMap = new Map<string, Set<string>>();
      sessions?.forEach(session => {
        const day = format(new Date(session.started_at), 'yyyy-MM-dd');
        const existingSet = dailyMap.get(day) || new Set();
        existingSet.add(session.user_id);
        dailyMap.set(day, existingSet);
      });

      // Generate array for all days in range
      const result: Array<{ date: string; users: number; sessions: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayLabel = format(subDays(new Date(), i), 'dd/MM');
        const usersSet = dailyMap.get(date) || new Set();
        const daySessions = sessions?.filter(s => format(new Date(s.started_at), 'yyyy-MM-dd') === date) || [];
        
        result.push({
          date: dayLabel,
          users: usersSet.size,
          sessions: daySessions.length,
        });
      }

      return result;
    },
    enabled: !!entrepriseId && period !== 'all',
  });

  return {
    globalStats: globalStatsQuery.data,
    userStats: userStatsQuery.data,
    dailyStats: dailyStatsQuery.data,
    isLoading: globalStatsQuery.isLoading || userStatsQuery.isLoading,
    error: globalStatsQuery.error || userStatsQuery.error,
  };
};
