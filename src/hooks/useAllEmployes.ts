import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Employe {
  id: string;
  prenom: string | null;
  nom: string | null;
  role_metier: string | null;
  libelle_emploi: string | null;
  agence_interim: string | null;
  adresse_domicile: string | null;
  entreprise_id: string;
}

export type EmployeType = "all" | "macon" | "grutier" | "interim" | "finisseur" | "chef";

export const useAllEmployes = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["all-employes", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      // 1. Récupérer les auth_user_id des admin/rh à exclure
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("entreprise_id", entrepriseId)
        .in("role", ["admin", "rh"]);
      
      const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));

      // 2. Récupérer tous les employés sauf conducteurs
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, prenom, nom, role_metier, libelle_emploi, agence_interim, adresse_domicile, entreprise_id, auth_user_id")
        .eq("entreprise_id", entrepriseId)
        .neq("role_metier", "conducteur")
        .order("nom")
        .order("prenom");

      if (error) throw error;

      // 3. Filtrer côté JS les admin/rh
      const filtered = (data || []).filter(emp => 
        !emp.auth_user_id || !adminUserIds.has(emp.auth_user_id)
      );

      return filtered as Employe[];
    },
    enabled: !!entrepriseId,
  });
};

// Filtrer les employés par type
export const filterEmployesByType = (employes: Employe[], type: EmployeType): Employe[] => {
  if (type === "all") return employes;

  return employes.filter(emp => {
    const empType = getEmployeType(emp);
    return empType === type;
  });
};

// Déterminer le type d'employé pour les badges
export const getEmployeType = (employe: Employe): "macon" | "grutier" | "interim" | "finisseur" | "chef" => {
  if (employe.role_metier === "chef") return "chef";
  if (employe.role_metier === "finisseur") return "finisseur";
  if (employe.agence_interim) return "interim";
  if (employe.role_metier === "grutier" || employe.libelle_emploi?.toLowerCase().includes("grutier")) {
    return "grutier";
  }
  return "macon";
};

// Couleurs des badges par type (cohérentes avec role-badge.tsx)
export const EMPLOYE_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  // Maçon - Jaune/Or hsl(45 90% 60%)
  macon: { 
    bg: "bg-amber-400 dark:bg-amber-500", 
    text: "text-amber-900 dark:text-amber-100", 
    label: "Maçon" 
  },
  // Grutier - Bleu hsl(217 91% 60%)
  grutier: { 
    bg: "bg-blue-500 dark:bg-blue-600", 
    text: "text-white", 
    label: "Grutier" 
  },
  // Intérimaire - Cyan hsl(180 70% 50%)
  interim: { 
    bg: "bg-cyan-500 dark:bg-cyan-600", 
    text: "text-white", 
    label: "Intérim" 
  },
  // Finisseur - Violet hsl(270 70% 65%)
  finisseur: { 
    bg: "bg-purple-400 dark:bg-purple-500", 
    text: "text-white", 
    label: "Finisseur" 
  },
  // Chef - Orange
  chef: { 
    bg: "bg-orange-500 dark:bg-orange-600", 
    text: "text-white", 
    label: "Chef" 
  },
};

// Couleur du texte selon le type d'employé (style Excel)
export const getEmployeeTextColor = (employe: Employe): string => {
  if (employe.agence_interim) return "text-green-600 dark:text-green-400"; // Intérimaire = vert
  if (employe.role_metier === "chef") return "text-red-600 dark:text-red-400"; // Chef = rouge
  if (employe.role_metier === "finisseur") return "text-violet-600 dark:text-violet-400"; // Finisseur = violet
  return "text-foreground"; // LR interne = noir/blanc
};

// Formater l'adresse en format court (ex: "71 macon")
export const formatAdresseCourte = (adresse: string | null): string => {
  if (!adresse) return "-";
  // Chercher un code postal et extraire les 2 premiers chiffres + ville
  const match = adresse.match(/(\d{2})\d{3}\s*(.+)/);
  if (match) {
    const dept = match[1];
    const ville = match[2].split(/[,\s]/)[0].toLowerCase();
    return `${dept} ${ville}`;
  }
  // Sinon retourner les 15 premiers caractères
  return adresse.substring(0, 15).toLowerCase();
};

// Jours de la semaine en français
export const JOURS_SEMAINE_FR = ["L", "M", "M", "J", "V"];
