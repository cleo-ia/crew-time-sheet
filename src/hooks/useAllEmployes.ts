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
        return !isInterim && !isFinisseur;
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
