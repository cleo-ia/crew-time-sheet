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
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setStatus('signed_out');
      } else {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setStatus(newSession ? 'authenticated' : 'unknown');
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
            setStatus(existingSession ? 'authenticated' : 'signed_out');
            return;
          }
          
          // Si c'est une erreur réseau et qu'on n'est pas à la dernière tentative, retry
          if (i < delays.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
          }
        } catch (err) {
          // En cas d'erreur, retry sauf si c'est la dernière tentative
          if (i < delays.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
          }
        }
      }
      
      // Après toutes les tentatives, si toujours pas de session, marquer comme signed_out
      setStatus('signed_out');
    };

    getSessionWithRetry();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, status, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
