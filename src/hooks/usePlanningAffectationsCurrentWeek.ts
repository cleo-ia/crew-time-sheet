import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWeek } from "@/lib/weekUtils";

/**
 * Hook pour récupérer les affectations planning de la semaine courante.
 * Remplace les anciennes affectations legacy pour l'affichage admin.
 * Retourne pour chaque employé son chantier planifié cette semaine.
 */
export const usePlanningAffectationsCurrentWeek = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  const currentWeek = getCurrentWeek();

  return useQuery({
    queryKey: ["planning-affectations-current-week", entrepriseId, currentWeek],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("planning_affectations")
        .select(`
          employe_id,
          chantier_id,
          is_chef_responsable,
          chantiers!inner(nom)
        `)
        .eq("entreprise_id", entrepriseId)
        .eq("semaine", currentWeek);

      if (error) throw error;

      // Group by employe_id, return the most common chantier (or first)
      const byEmployee: Record<string, { chantier_id: string; chantier_nom: string; count: number; is_chef: boolean }[]> = {};
      
      for (const row of data || []) {
        const chantierNom = (row.chantiers as any)?.nom || "N/A";
        if (!byEmployee[row.employe_id]) {
          byEmployee[row.employe_id] = [];
        }
        const existing = byEmployee[row.employe_id].find(c => c.chantier_id === row.chantier_id);
        if (existing) {
          existing.count++;
        } else {
          byEmployee[row.employe_id].push({
            chantier_id: row.chantier_id,
            chantier_nom: chantierNom,
            count: 1,
            is_chef: row.is_chef_responsable,
          });
        }
      }

      // For each employee, pick the chantier with the most days
      const result: Record<string, { chantier_id: string; chantier_nom: string; nb_jours: number; is_chef: boolean }> = {};
      for (const [employeId, chantiers] of Object.entries(byEmployee)) {
        const sorted = chantiers.sort((a, b) => b.count - a.count);
        result[employeId] = {
          chantier_id: sorted[0].chantier_id,
          chantier_nom: sorted[0].chantier_nom,
          nb_jours: sorted.reduce((sum, c) => sum + c.count, 0),
          is_chef: sorted[0].is_chef,
        };
      }

      return result;
    },
    enabled: !!entrepriseId,
    staleTime: 30000,
  });
};
