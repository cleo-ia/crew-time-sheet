import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
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

function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Gérer les événements online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.debug('[AuthProvider] Auth event:', event, 'Session:', !!newSession);
      
      switch (event) {
        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          setStatus('signed_out');
          console.debug('[AuthProvider] Status -> signed_out');
          break;
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
        default:
          setSession(newSession ?? null);
          setUser(newSession?.user ?? null);
          const newStatus = newSession ? 'authenticated' : 'signed_out';
          setStatus(newStatus);
          console.debug('[AuthProvider] Status ->', newStatus);
          break;
      }
    });

    // Récupérer la session existante avec retry et backoff exponentiel
    const getSessionWithRetry = async () => {
      const delays = [250, 500, 1000, 1500, 2000]; // Backoff delays in ms
      
      for (let i = 0; i < delays.length; i++) {
        try {
          const { data: { session: existingSession }, error } = await supabase.auth.getSession();
          
          if (!error) {
            setSession(existingSession);
            setUser(existingSession?.user ?? null);
            const status = existingSession ? 'authenticated' : 'signed_out';
            setStatus(status);
            console.debug('[AuthProvider] Initial session loaded, status:', status);
            return;
          }
          
          console.debug('[AuthProvider] getSession error, retry', i + 1, '/', delays.length);
          
          // Si c'est une erreur réseau et qu'on n'est pas à la dernière tentative, retry
          if (i < delays.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
          }
        } catch (err) {
          console.debug('[AuthProvider] getSession exception, retry', i + 1, '/', delays.length);
          // En cas d'erreur, retry sauf si c'est la dernière tentative
          if (i < delays.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
          }
        }
      }
      
      // Après toutes les tentatives, purger la session corrompue et passer en signed_out
      console.debug('[AuthProvider] All retries failed, purging session');
      await supabase.auth.signOut().catch(() => {});
      setSession(null);
      setUser(null);
      setStatus('signed_out');
    };

    getSessionWithRetry();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Watchdog: si status reste "unknown" après 3s, le forcer en "signed_out"
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus(currentStatus => {
        if (currentStatus === 'unknown') {
          console.debug('[AuthProvider] Watchdog: forcing unknown -> signed_out');
          return 'signed_out';
        }
        return currentStatus;
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, status, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
