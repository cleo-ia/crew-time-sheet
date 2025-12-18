import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthStatus = 'unknown' | 'authenticated' | 'signed_out';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Helper pour détecter les erreurs de token invalide
const isInvalidTokenError = (error: AuthError | null): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = (error as any).code?.toLowerCase() || '';
  
  return (
    message.includes('refresh token') ||
    message.includes('invalid token') ||
    message.includes('jwt expired') ||
    message.includes('session not found') ||
    message.includes('token is expired') ||
    code.includes('refresh_token_not_found') ||
    error.status === 401
  );
};

function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Fonction centralisée pour nettoyer la session et forcer la déconnexion
  // IMPORTANT: Ne touche PAS aux données métier (fiches, heures, etc.) - uniquement les données de session
  const clearStorageAndSetSignedOut = useCallback(() => {
    console.log('[Auth] Clearing session data and forcing sign out');
    
    // Nettoyer uniquement les données de session/préférences temporaires
    // Ces données sont des préférences d'affichage, pas des données métier
    localStorage.removeItem('current_entreprise_id');
    localStorage.removeItem('entreprise_slug');
    
    // Nettoyer sessionStorage (préférences de navigation temporaires)
    sessionStorage.clear();
    
    // Mettre à jour l'état React
    setSession(null);
    setUser(null);
    setStatus('signed_out');
  }, []);

  useEffect(() => {
    // Gérer les événements online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] Event:', event);
      
      // Événements qui signifient "session invalide" → forcer déconnexion immédiate
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !newSession) {
        clearStorageAndSetSignedOut();
        return;
      }
      
      // Cas spécial: TOKEN_REFRESH_FAILED (pas encore dans les types officiels mais peut arriver)
      if ((event as string) === 'TOKEN_REFRESH_FAILED') {
        console.warn('[Auth] Token refresh failed, forcing sign out');
        clearStorageAndSetSignedOut();
        return;
      }
      
      // Session valide
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setStatus('authenticated');
      } else if (event !== 'INITIAL_SESSION') {
        // Pas de session et pas un événement initial → déconnecté
        clearStorageAndSetSignedOut();
      }
    });

    // Récupérer la session existante avec retry et backoff exponentiel
    const getSessionWithRetry = async () => {
      const delays = [250, 500, 1000, 1500, 2000];
      
      for (let i = 0; i < delays.length; i++) {
        try {
          const { data: { session: existingSession }, error } = await supabase.auth.getSession();
          
          // Pas d'erreur → succès
          if (!error) {
            setSession(existingSession);
            setUser(existingSession?.user ?? null);
            setStatus(existingSession ? 'authenticated' : 'signed_out');
            return;
          }
          
          // Erreur de token invalide → déconnexion immédiate (pas de retry)
          if (isInvalidTokenError(error)) {
            console.warn('[Auth] Invalid token detected:', error.message);
            clearStorageAndSetSignedOut();
            return;
          }
          
          console.log(`[Auth] getSession attempt ${i + 1} failed:`, error.message);
          
          // Autre erreur → retry si ce n'est pas la dernière tentative
          if (i < delays.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
          }
        } catch (err) {
          console.log(`[Auth] getSession attempt ${i + 1} threw:`, err);
          
          // En cas d'erreur, retry sauf si c'est la dernière tentative
          if (i < delays.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
          }
        }
      }
      
      // Après toutes les tentatives échouées → forcer signed_out (pas 'unknown')
      // Cela évite l'état "zombie" où l'UI reste bloquée
      console.warn('[Auth] All getSession attempts failed, forcing signed_out');
      clearStorageAndSetSignedOut();
    };

    getSessionWithRetry();

    // Listener global pour les erreurs d'authentification API
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      if (detail?.status === 401 || detail?.code === 'PGRST301') {
        console.warn('[Auth] API auth error detected:', detail);
        clearStorageAndSetSignedOut();
      }
    };
    
    window.addEventListener('supabase-auth-error', handleAuthError);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('supabase-auth-error', handleAuthError);
    };
  }, [clearStorageAndSetSignedOut]);

  return (
    <AuthContext.Provider value={{ session, user, status, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
