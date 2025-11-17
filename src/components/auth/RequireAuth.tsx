import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import OfflineBanner from "@/components/ui/OfflineBanner";

// RequireAuth ensures a valid Supabase session exists before rendering children
export default function RequireAuth() {
  const { status, isOnline } = useAuth();
  const location = useLocation();

  // Attendre que le statut soit déterminé
  if (status === 'unknown') {
    return null;
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
