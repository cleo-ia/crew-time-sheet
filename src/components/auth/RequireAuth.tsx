import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { Skeleton } from "@/components/ui/skeleton";

// RequireAuth ensures a valid Supabase session exists before rendering children
export default function RequireAuth() {
  const { status, isOnline } = useAuth();
  const location = useLocation();

  // Attendre que le statut soit déterminé - afficher un loader au lieu d'une page blanche
  if (status === 'unknown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-24 w-64" />
      </div>
    );
  }

  // Si explicitement déconnecté, rediriger vers /auth
  if (status === 'signed_out') {
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
