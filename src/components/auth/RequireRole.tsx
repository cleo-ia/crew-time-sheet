import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { Skeleton } from "@/components/ui/skeleton";

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: Array<"super_admin" | "admin" | "gestionnaire" | "rh" | "conducteur" | "chef">;
  redirectTo?: string;
}

export const RequireRole = ({ 
  children, 
  allowedRoles, 
  redirectTo = "/" 
}: RequireRoleProps) => {
  const { data: userRole, isLoading } = useCurrentUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-32 w-96" />
      </div>
    );
  }

  if (!userRole || !allowedRoles.includes(userRole as any)) {
    // Redirection intelligente selon le rôle
    let fallbackRoute = redirectTo;
    
    if (userRole === "super_admin") {
      fallbackRoute = "/admin";
    } else if (userRole === "conducteur") {
      fallbackRoute = "/validation-conducteur";
    } else if (userRole === "chef") {
      fallbackRoute = "/";
    } else if (userRole === "rh") {
      fallbackRoute = "/consultation-rh";
    } else if (userRole === "gestionnaire") {
      fallbackRoute = "/rapprochement-interim";
    } else if (userRole === "admin") {
      fallbackRoute = "/admin";
    }
    
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
};