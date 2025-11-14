import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { useAuth } from "@/contexts/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: Array<"admin" | "rh" | "conducteur" | "chef">;
  redirectTo?: string;
}

export const RequireRole = ({ 
  children, 
  allowedRoles, 
  redirectTo = "/" 
}: RequireRoleProps) => {
  const { status } = useAuth();
  const { data: userRole, isLoading } = useCurrentUserRole();

  // Afficher un loader pendant la vérification du statut auth ou du rôle
  if (status === 'unknown' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <div className="animate-pulse rounded-md bg-muted h-12 w-full" />
          <div className="animate-pulse rounded-md bg-muted h-64 w-full" />
          <div className="animate-pulse rounded-md bg-muted h-12 w-full" />
        </div>
      </div>
    );
  }

  // Si déconnecté, rediriger vers /auth
  if (status === 'signed_out') {
    return <Navigate to="/auth" replace />;
  }

  // Si pas de rôle ou rôle non autorisé, redirection intelligente
  if (!userRole || !allowedRoles.includes(userRole as any)) {
    let fallbackRoute = redirectTo;
    
    if (userRole === "conducteur") {
      fallbackRoute = "/validation-conducteur";
    } else if (userRole === "chef") {
      fallbackRoute = "/";
    } else if (userRole === "rh") {
      fallbackRoute = "/consultation-rh";
    } else if (userRole === "admin") {
      fallbackRoute = "/admin";
    }
    
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
};