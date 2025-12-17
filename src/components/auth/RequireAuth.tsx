import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearCacheAndReload } from "@/hooks/useClearCache";
import { useUserActivityTracking } from "@/hooks/useUserActivityTracking";

// Timeout en millisecondes avant d'afficher le message d'erreur (10 secondes)
const LOADING_TIMEOUT_MS = 10000;

export default function RequireAuth() {
  const { status, isOnline } = useAuth();
  const location = useLocation();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // Tracking d'activité utilisateur - 100% isolé, non-bloquant
  // Activé uniquement quand l'utilisateur est connecté
  // Si le tracking échoue, l'app continue de fonctionner normalement
  const isSignedIn = status !== "unknown" && status !== "signed_out";
  useUserActivityTracking({ enabled: isSignedIn });

  // Timer pour détecter un blocage sur status "unknown"
  useEffect(() => {
    if (status === "unknown") {
      const timer = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, LOADING_TIMEOUT_MS);

      return () => clearTimeout(timer);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [status]);

  // Si status inconnu et pas encore en timeout, afficher un spinner
  if (status === "unknown") {
    if (showTimeoutMessage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center space-y-4">
            <h1 className="text-lg font-semibold text-foreground">
              Problème de chargement de session
            </h1>
            <p className="text-sm text-muted-foreground">
              La session met plus de temps que prévu à charger. Cela peut être dû à un cache obsolète ou à un problème de connexion.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button
                variant="outline"
                onClick={clearCacheAndReload}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Vider le cache et réessayer
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Spinner de chargement pendant les 10 premières secondes
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  // Si explicitement déconnecté, rediriger vers /auth
  if (status === "signed_out") {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Si authentifié (même hors ligne), laisser passer
  return (
    <>
      <OfflineBanner />
      <Outlet />
    </>
  );
}
