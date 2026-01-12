/**
 * Hook de tracking d'activité utilisateur
 * 
 * GARANTIES DE NON-RÉGRESSION:
 * - 100% isolé : aucun impact sur le flux d'authentification
 * - 100% asynchrone : n'attend jamais de réponse
 * - 100% non-bloquant : tout est dans des try-catch
 * - Fire-and-forget : si ça échoue, ça échoue silencieusement
 * - Retry avec fallback sur user_roles si localStorage vide
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

  /**
   * Récupérer l'entreprise_id avec fallback sur user_roles
   * Si localStorage est vide, on interroge user_roles et on restaure localStorage
   */
  const getEntrepriseIdWithFallback = useCallback(async (userId: string): Promise<string | null> => {
    try {
      // 1. Priorité au localStorage
      const storedId = localStorage.getItem('current_entreprise_id');
      if (storedId) return storedId;

      // 2. Fallback: récupérer depuis user_roles
      const { data, error } = await supabase
        .from('user_roles')
        .select('entreprise_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.entreprise_id) return null;

      // 3. Restaurer dans localStorage pour les prochains appels
      localStorage.setItem('current_entreprise_id', data.entreprise_id);
      console.log('[activity-tracking] entreprise_id restauré depuis user_roles:', data.entreprise_id);

      return data.entreprise_id;
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

      const entrepriseId = await getEntrepriseIdWithFallback(user.id);
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
  }, [enabled, getEntrepriseIdWithFallback]);

  // Créer une nouvelle session avec retry (fire-and-forget)
  const startSession = useCallback(async () => {
    try {
      if (!enabled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Retry jusqu'à 3 fois avec délai exponentiel pour récupérer entreprise_id
      let entrepriseId: string | null = null;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        entrepriseId = await getEntrepriseIdWithFallback(user.id);
        if (entrepriseId) break;
        
        // Attendre avant le prochain essai (500ms, 1s, 2s)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
          console.log(`[activity-tracking] Retry ${attempt + 1}/${maxRetries} pour entreprise_id...`);
        }
      }

      if (!entrepriseId) {
        console.warn('[activity-tracking] Impossible de récupérer entreprise_id après 3 tentatives');
        return;
      }

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
      const { data, error: insertError } = await supabase
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

      if (insertError) {
        console.error('[activity-tracking] Erreur création session:', insertError.message, {
          userId: user.id,
          entrepriseId,
          code: insertError.code,
        });
        return;
      }

      if (data?.id) {
        sessionIdRef.current = data.id;
        pagesVisitedRef.current = 0;
        console.log('[activity-tracking] Session créée:', data.id, 'pour user:', user.id);
      } else {
        console.warn('[activity-tracking] Session créée mais pas d\'ID retourné');
      }

      // Log l'événement de login
      logActivity('login', location.pathname, PAGE_NAMES[location.pathname] || location.pathname);
    } catch {
      // Échec silencieux
    }
  }, [enabled, getEntrepriseIdWithFallback, logActivity, location.pathname]);

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

    // Délai de 500ms pour laisser l'auth se stabiliser côté RLS avant de créer la session
    // Cela garantit que auth.uid() est disponible lors de l'INSERT dans user_sessions
    const initTimeout = setTimeout(() => {
      startSession();
    }, 500);

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
      clearTimeout(initTimeout);
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
