import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: "super_admin" | "admin" | "chef" | "macon" | "finisseur" | "interimaire" | "conducteur" | "rh" | "grutier";
  size?: "sm" | "md";
}

export const RoleBadge = ({ role, size = "md" }: RoleBadgeProps) => {
  const sizeClass = size === "sm" ? "text-xs py-0" : "";
  
  if (role === "super_admin") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(280 70% 45%)', 
          color: 'white' 
        }}
      >
        Super Admin
      </Badge>
    );
  }
  
  if (role === "admin") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(0 72% 51%)', 
          color: 'white' 
        }}
      >
        Admin
      </Badge>
    );
  }
  
  if (role === "rh") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(var(--theme-consultation-rh-active))', 
          color: 'white' 
        }}
      >
        RH
      </Badge>
    );
  }
  
  if (role === "conducteur") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(var(--theme-validation-conducteur-active))', 
          color: 'white' 
        }}
      >
        Conducteur
      </Badge>
    );
  }
  
  if (role === "chef") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(var(--theme-saisie-chef-active))', 
          color: 'white' 
        }}
      >
        Chef de chantier
      </Badge>
    );
  }
  
  if (role === "interimaire") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(180 70% 50%)', 
          color: 'white' 
        }}
      >
        Intérimaire
      </Badge>
    );
  }
  
  if (role === "finisseur") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(270 70% 65%)', 
          color: 'white' 
        }}
      >
        Finisseur
      </Badge>
    );
  }
  
  if (role === "macon") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(45 90% 60%)', 
          color: 'hsl(215 25% 15%)' 
        }}
      >
        Maçon
      </Badge>
    );
  }
  
  if (role === "grutier") {
    return (
      <Badge 
        variant="default" 
        className={sizeClass}
        style={{ 
          backgroundColor: 'hsl(217 91% 60%)', 
          color: 'white' 
        }}
      >
        Grutier
      </Badge>
    );
  }
  
  return null;
};
