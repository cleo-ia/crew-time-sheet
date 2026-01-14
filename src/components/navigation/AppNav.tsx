import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, FileCheck, FileSpreadsheet, Settings, LogOut, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoSder from "@/assets/logo-engo-bourgogne.png";
import logoEngoBourgogne from "@/assets/logo-sder.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

// Map des logos par slug d'entreprise
const LOGOS: Record<string, string> = {
  "limoge-revillon": logoLimogeRevillon,
  "sder": logoSder,
  "engo-bourgogne": logoEngoBourgogne,
};

const ENTREPRISE_NAMES: Record<string, string> = {
  "limoge-revillon": "Limoge Revillon - Groupe EN'GO",
  "sder": "SDER - Groupe EN'GO",
  "engo-bourgogne": "Engo Bourgogne - Groupe EN'GO",
};

export const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole, isLoading } = useCurrentUserRole();

  // Récupérer le logo dynamiquement selon l'entreprise sélectionnée
  const entrepriseSlug = localStorage.getItem("entreprise_slug") || "limoge-revillon";
  const logo = LOGOS[entrepriseSlug] || logoLimogeRevillon;
  const entrepriseName = ENTREPRISE_NAMES[entrepriseSlug] || "Groupe EN'GO";

  const handleLogout = async () => {
    // Nettoyer les données d'entreprise du localStorage
    localStorage.removeItem("entreprise_slug");
    localStorage.removeItem("current_entreprise_id");
    
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
  // super_admin voit tout, admin ne voit que Administration
  const canSeeSaisieChef = userRole && ["super_admin", "chef"].includes(userRole);
  const canSeeConducteur = userRole && ["super_admin", "conducteur"].includes(userRole);
  const canSeeValidation = userRole && ["super_admin", "rh", "conducteur"].includes(userRole);
  const canSeeRH = userRole && ["super_admin", "rh"].includes(userRole);
  const canSeeAdmin = userRole && ["super_admin", "admin"].includes(userRole);

  if (isLoading) return null;

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          <Link to="/" className="flex-shrink-0">
            <img 
              src={logo} 
              alt={entrepriseName}
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
              asChild
              variant="ghost"
              size="sm"
              className="gap-2 border-0 hover:opacity-80"
            >
              <Link to="/documentation">
                <BookOpen className="h-4 w-4" />
                <span className="hidden md:inline">Aide</span>
              </Link>
            </Button>
            
            <ThemeToggle />
            
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
