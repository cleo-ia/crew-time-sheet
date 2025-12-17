/**
 * Hook de tracking d'activité utilisateur
 * 
 * GARANTIES DE NON-RÉGRESSION:
 * - 100% isolé : aucun impact sur le flux d'authentification
 * - 100% asynchrone : n'attend jamais de réponse
 * - 100% non-bloquant : tout est dans des try-catch
 * - Fire-and-forget : si ça échoue, ça échoue silencieusement
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Mapping des routes vers des noms lisibles
const PAGE_NAMES: Record<string, string> = {
  '/': 'Accueil Chef',
  '/auth': 'Authentification',
  '/admin': 'Administration',
  '/validation-conducteur': 'Validation Conducteur',
  '/consultation-rh': 'Consultation RH',
  '/signature-macons': 'Signature Maçons',
  '/signature-finisseurs': 'Signature Finisseurs',
  '/install': 'Installation PWA',
  '/bootstrap': 'Bootstrap Admin',
};

// Détecter le type d'appareil
const getDeviceType = (): string => {
  try {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  } catch {
    return 'unknown';
  }
};

// Extraire le nom du navigateur
const getBrowser = (): string => {
  try {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Other';
  } catch {
    return 'unknown';
  }
};

interface UseUserActivityTrackingOptions {
  enabled?: boolean;
}

export const useUserActivityTracking = (options: UseUserActivityTrackingOptions = {}) => {
  const { enabled = true } = options;
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const pagesVisitedRef = useRef<number>(0);
  const lastPageRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Récupérer l'entreprise_id de manière sécurisée
  const getEntrepriseId = useCallback((): string | null => {
    try {
      return localStorage.getItem('current_entreprise_id');
    } catch {
      return null;
    }
  }, []);

  // Log une activité (fire-and-forget)
  const logActivity = useCallback(async (
    eventType: string,
    pagePath?: string,
    pageName?: string,
    metadata?: Record<string, unknown>
  ) => {
    // Tout est dans un try-catch global - AUCUNE exception ne peut sortir
    try {
      if (!enabled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const entrepriseId = getEntrepriseId();
      if (!entrepriseId) return;

      // Fire-and-forget - on n'attend pas le résultat, on gère les erreurs inline
      supabase
        .from('user_activity_logs')
        .insert([{
          user_id: user.id,
          entreprise_id: entrepriseId,
          event_type: eventType,
          page_path: pagePath || null,
          page_name: pageName || null,
          metadata: (metadata || {}) as Json,
          user_agent: navigator.userAgent || null,
        }])
        .then(() => {
          // Succès silencieux
        });
    } catch {
      // Échec silencieux - ne jamais bloquer l'app
    }
  }, [enabled, getEntrepriseId]);

  // Créer une nouvelle session (fire-and-forget)
  const startSession = useCallback(async () => {
    try {
      if (!enabled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const entrepriseId = getEntrepriseId();
      if (!entrepriseId) return;

      // Fermer les anciennes sessions actives de cet utilisateur (fire-and-forget)
      try {
        await supabase
          .from('user_sessions')
          .update({ 
            is_active: false,
            ended_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('is_active', true);
      } catch {
        // Échec silencieux
      }

      // Créer une nouvelle session
      const { data } = await supabase
        .from('user_sessions')
        .insert([{
          user_id: user.id,
          entreprise_id: entrepriseId,
          device_type: getDeviceType(),
          browser: getBrowser(),
          is_active: true,
          pages_visited: 0,
        }])
        .select('id')
        .single();

      if (data?.id) {
        sessionIdRef.current = data.id;
        pagesVisitedRef.current = 0;
      }

      // Log l'événement de login
      logActivity('login', location.pathname, PAGE_NAMES[location.pathname] || location.pathname);
    } catch {
      // Échec silencieux
    }
  }, [enabled, getEntrepriseId, logActivity, location.pathname]);

  // Mettre à jour la session (heartbeat)
  const updateSession = useCallback(async () => {
    try {
      if (!enabled || !sessionIdRef.current) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
          pages_visited: pagesVisitedRef.current,
        })
        .eq('id', sessionIdRef.current)
        .eq('user_id', user.id);
    } catch {
      // Échec silencieux
    }
  }, [enabled]);

  // Terminer la session
  const endSession = useCallback(async () => {
    try {
      if (!enabled || !sessionIdRef.current) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionId = sessionIdRef.current;
      
      // Calculer la durée
      let durationSeconds = 0;
      try {
        const { data: session } = await supabase
          .from('user_sessions')
          .select('started_at')
          .eq('id', sessionId)
          .single();

        if (session?.started_at) {
          durationSeconds = Math.floor(
            (Date.now() - new Date(session.started_at).getTime()) / 1000
          );
        }
      } catch {
        // Échec silencieux
      }

      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          pages_visited: pagesVisitedRef.current,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      // Log l'événement de logout
      logActivity('logout');

      sessionIdRef.current = null;
    } catch {
      // Échec silencieux
    }
  }, [enabled, logActivity]);

  // Démarrer la session au montage
  useEffect(() => {
    if (!enabled) return;

    // Démarrer la session de manière asynchrone
    startSession();

    // Heartbeat toutes les 5 minutes
    heartbeatIntervalRef.current = setInterval(() => {
      updateSession();
    }, 5 * 60 * 1000);

    // Gérer la fermeture de page
    const handleBeforeUnload = () => {
      endSession();
    };

    // Gérer la visibilité (changement d'onglet)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endSession();
    };
  }, [enabled, startSession, updateSession, endSession]);

  // Tracker les changements de page
  useEffect(() => {
    if (!enabled) return;

    const currentPath = location.pathname;
    
    // Éviter de logger la même page deux fois de suite
    if (currentPath !== lastPageRef.current) {
      lastPageRef.current = currentPath;
      pagesVisitedRef.current += 1;

      const pageName = PAGE_NAMES[currentPath] || currentPath;
      logActivity('page_view', currentPath, pageName);
    }
  }, [enabled, location.pathname, logActivity]);

  return {
    logActivity,
    endSession,
  };
};
