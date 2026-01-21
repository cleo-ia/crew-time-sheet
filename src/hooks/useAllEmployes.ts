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

export type EmployeType = "all" | "lr" | "interim" | "finisseur" | "chef";

export const useAllEmployes = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["all-employes", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, prenom, nom, role_metier, libelle_emploi, agence_interim, adresse_domicile, entreprise_id")
        .eq("entreprise_id", entrepriseId)
        // Exclure les rôles administratifs (non affectables à un chantier)
        .not("role_metier", "in", '("admin","super_admin","rh","conducteur")')
        .order("nom")
        .order("prenom");

      if (error) throw error;
      return data as Employe[];
    },
    enabled: !!entrepriseId,
  });
};

// Filtrer les employés par type
export const filterEmployesByType = (employes: Employe[], type: EmployeType): Employe[] => {
  if (type === "all") return employes;

  return employes.filter(emp => {
    const isInterim = !!emp.agence_interim;
    const isFinisseur = emp.role_metier === "finisseur";
    const isChef = emp.role_metier === "chef";

    switch (type) {
      case "lr":
        return !isInterim; // LR = tous les internes (chefs, maçons, grutiers, finisseurs)
      case "interim":
        return isInterim;
      case "finisseur":
        return isFinisseur;
      case "chef":
        return isChef;
      default:
        return true;
    }
  });
};

// Déterminer le type d'employé pour les badges
export const getEmployeType = (employe: Employe): "lr" | "interim" | "finisseur" | "chef" => {
  if (employe.role_metier === "chef") return "chef";
  if (employe.role_metier === "finisseur") return "finisseur";
  if (employe.agence_interim) return "interim";
  return "lr";
};

// Couleurs des badges par type
export const EMPLOYE_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  lr: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "LR" },
  interim: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Intérim" },
  finisseur: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300", label: "Finisseur" },
  chef: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", label: "Chef" },
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
