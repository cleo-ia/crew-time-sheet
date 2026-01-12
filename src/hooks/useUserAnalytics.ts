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
  authUserId: string | null;
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
    queryKey: ['user-analytics-users-v2', entrepriseId, period],
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

      // Get users info avec last_sign_in_at depuis auth.users via fonction sécurisée
      const { data: utilisateurs, error: utilisateursError } = await supabase
        .rpc('get_users_with_last_signin', { p_entreprise_id: entrepriseId });
      if (utilisateursError) throw utilisateursError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('entreprise_id', entrepriseId);
      if (rolesError) throw rolesError;

      // Create a map of user sessions (keyed by utilisateurs.id)
      const userSessionsMap = new Map<string, typeof sessions>();
      sessions?.forEach(session => {
        const existing = userSessionsMap.get(session.user_id) || [];
        existing.push(session);
        userSessionsMap.set(session.user_id, existing);
      });

      // Build user stats
      const userStats: UserActivityStats[] = (utilisateurs || []).map(utilisateur => {
        // CORRECTION: Fusionner les sessions de auth_user_id ET id pour couvrir tous les cas
        // - Sessions récentes: enregistrées avec auth_user_id
        // - Sessions historiques: peuvent être enregistrées avec utilisateurs.id
        const sessionsFromAuthId = utilisateur.auth_user_id 
          ? userSessionsMap.get(utilisateur.auth_user_id) || []
          : [];
        const sessionsFromId = userSessionsMap.get(utilisateur.id) || [];
        
        // Dédupliquer par ID de session (au cas où les deux clés pointent vers les mêmes sessions)
        const sessionIds = new Set<string>();
        const userSessions = [...sessionsFromAuthId, ...sessionsFromId].filter(session => {
          if (sessionIds.has(session.id)) return false;
          sessionIds.add(session.id);
          return true;
        });

        // Roles are keyed by auth_user_id
        const userRole = utilisateur.auth_user_id 
          ? userRoles?.find(r => r.user_id === utilisateur.auth_user_id)
          : null;

        // Last connection (sessions prioritaires, sinon fallback sur auth.last_sign_in_at)
        const sortedSessions = [...userSessions].sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        const lastConnection = sortedSessions[0]?.started_at 
          || utilisateur.last_sign_in_at 
          || null;

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
          userId: utilisateur.id,
          authUserId: utilisateur.auth_user_id,
          email: utilisateur.email || '',
          firstName: utilisateur.prenom,
          lastName: utilisateur.nom,
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

  // Données pour le heatmap (jour de semaine × plage horaire)
  const heatmapQuery = useQuery({
    queryKey: ['user-analytics-heatmap', entrepriseId, period],
    queryFn: async () => {
      if (!entrepriseId) throw new Error('No entreprise selected');

      const dateFilter = getDateFilter(period);

      let sessionsQuery = supabase
        .from('user_sessions')
        .select('started_at')
        .eq('entreprise_id', entrepriseId);

      if (dateFilter) {
        sessionsQuery = sessionsQuery.gte('started_at', dateFilter.toISOString());
      }

      const { data: sessions, error } = await sessionsQuery;
      if (error) throw error;

      // Créer une grille 7 jours × 4 plages horaires (matin, midi, après-midi, soir)
      const heatmapData: number[][] = Array(7).fill(null).map(() => Array(4).fill(0));
      
      sessions?.forEach(session => {
        const date = new Date(session.started_at);
        const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi
        const hour = date.getHours();
        
        // Convertir en index (lundi = 0, dimanche = 6)
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        // Plages horaires: 6-12 = matin, 12-14 = midi, 14-18 = après-midi, 18-22 = soir
        let timeSlot = 0;
        if (hour >= 6 && hour < 12) timeSlot = 0; // Matin
        else if (hour >= 12 && hour < 14) timeSlot = 1; // Midi
        else if (hour >= 14 && hour < 18) timeSlot = 2; // Après-midi
        else timeSlot = 3; // Soir/Nuit
        
        heatmapData[dayIndex][timeSlot]++;
      });

      return {
        data: heatmapData,
        days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        timeSlots: ['Matin', 'Midi', 'Après-midi', 'Soir'],
        maxValue: Math.max(...heatmapData.flat()),
      };
    },
    enabled: !!entrepriseId,
  });

  // Tendances de durée moyenne par jour (pour sparklines)
  const durationTrendQuery = useQuery({
    queryKey: ['user-analytics-duration-trend', entrepriseId, period],
    queryFn: async () => {
      if (!entrepriseId) throw new Error('No entreprise selected');

      const days = period === 'today' ? 1 : period === '7days' ? 7 : 30;
      const dateFilter = subDays(new Date(), days);

      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('started_at, duration_seconds')
        .eq('entreprise_id', entrepriseId)
        .not('duration_seconds', 'is', null)
        .gte('started_at', dateFilter.toISOString());

      if (error) throw error;

      // Grouper par jour et calculer la moyenne
      const dailyMap = new Map<string, number[]>();
      sessions?.forEach(session => {
        const day = format(new Date(session.started_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(day) || [];
        if (session.duration_seconds) {
          existing.push(session.duration_seconds);
        }
        dailyMap.set(day, existing);
      });

      // Générer les données pour tous les jours
      const result: Array<{ date: string; avgDuration: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const durations = dailyMap.get(date) || [];
        const avg = durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length 
          : 0;
        
        result.push({
          date: format(subDays(new Date(), i), 'dd/MM'),
          avgDuration: Math.round(avg),
        });
      }

      // Calculer la tendance (comparer première et dernière moitié)
      const halfLength = Math.floor(result.length / 2);
      const firstHalf = result.slice(0, halfLength);
      const secondHalf = result.slice(halfLength);
      
      const firstAvg = firstHalf.reduce((a, b) => a + b.avgDuration, 0) / (firstHalf.length || 1);
      const secondAvg = secondHalf.reduce((a, b) => a + b.avgDuration, 0) / (secondHalf.length || 1);
      
      const trendPercentage = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      return {
        data: result,
        trend: trendPercentage,
        isIncreasing: trendPercentage > 0,
      };
    },
    enabled: !!entrepriseId && period !== 'all',
  });

  return {
    globalStats: globalStatsQuery.data,
    userStats: userStatsQuery.data,
    dailyStats: dailyStatsQuery.data,
    heatmapData: heatmapQuery.data,
    durationTrend: durationTrendQuery.data,
    isLoading: globalStatsQuery.isLoading || userStatsQuery.isLoading,
    error: globalStatsQuery.error || userStatsQuery.error,
  };
};
