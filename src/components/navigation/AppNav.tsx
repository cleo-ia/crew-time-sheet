import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, FileCheck, FileSpreadsheet, Settings, LogOut } from "lucide-react";
import logo from "@/assets/logo-limoge-revillon.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

export const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole, isLoading } = useCurrentUserRole();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
      return;
    }
    toast.success("Déconnecté avec succès");
    navigate("/auth");
  };

  const getButtonClasses = (path: string, themeColor: string) => {
    const isActive = location.pathname === path;
    return cn(
      "gap-2 border-0",
      isActive ? "font-semibold shadow-md hover:opacity-90" : "hover:opacity-80"
    );
  };

  const getButtonStyle = (path: string, themeColor: string) => {
    const isActive = location.pathname === path;
    const bgVar = isActive ? `--theme-${themeColor}-active` : `--theme-${themeColor}`;
    const fgVar = isActive
      ? `--theme-${themeColor}-foreground-active`
      : `--theme-${themeColor}-foreground`;
    return {
      backgroundColor: `hsl(var(${bgVar}))`,
      color: `hsl(var(${fgVar}))`,
    } as React.CSSProperties;
  };

  // Define which roles can see which nav items
  const canSeeSaisieChef = userRole && ["admin", "chef"].includes(userRole);
  const canSeeConducteur = userRole && ["admin", "conducteur"].includes(userRole);
  const canSeeValidation = userRole && ["admin", "rh", "conducteur"].includes(userRole);
  const canSeeRH = userRole && ["admin", "rh"].includes(userRole);
  const canSeeAdmin = userRole === "admin";

  if (isLoading) return null;

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          <Link to="/" className="flex-shrink-0">
            <img 
              src={logo} 
              alt="Limoge Revillon - Groupe EN'GO" 
              className="h-10 w-auto"
            />
          </Link>
          
          <div className="flex gap-2">
            {canSeeSaisieChef && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={getButtonClasses("/", "saisie-chef")}
                style={getButtonStyle("/", "saisie-chef")}
              >
                <Link to="/">
                  <FileText className="h-4 w-4" />
                  Saisie chef
                </Link>
              </Button>
            )}
            
            {canSeeConducteur && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={getButtonClasses("/validation-conducteur", "validation-conducteur")}
                style={getButtonStyle("/validation-conducteur", "validation-conducteur")}
              >
                <Link to="/validation-conducteur">
                  <FileCheck className="h-4 w-4" />
                  Espace conducteur
                </Link>
              </Button>
            )}
            
            {canSeeRH && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={getButtonClasses("/consultation-rh", "consultation-rh")}
                style={getButtonStyle("/consultation-rh", "consultation-rh")}
              >
                <Link to="/consultation-rh">
                  <FileSpreadsheet className="h-4 w-4" />
                  Consultation RH
                </Link>
              </Button>
            )}
            
            {canSeeAdmin && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={getButtonClasses("/admin", "admin")}
                style={getButtonStyle("/admin", "admin")}
              >
                <Link to="/admin">
                  <Settings className="h-4 w-4" />
                  Administration
                </Link>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 border-0 hover:opacity-80"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
