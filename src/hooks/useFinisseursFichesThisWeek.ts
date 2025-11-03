import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook pour récupérer les IDs des finisseurs qui ont une fiche 
 * pour une semaine donnée (avec chantier_id = null)
 * Utile pour afficher les finisseurs transmis de S-1 même sans affectations
 */
export const useFinisseursFichesThisWeek = (
  conducteurId: string | null,
  semaine: string | null
) => {
  return useQuery({
    queryKey: ["finisseurs-fiches-week", conducteurId, semaine],
    queryFn: async () => {
      if (!conducteurId || !semaine) return [];

      const { data, error } = await supabase
        .from("fiches")
        .select("salarie_id")
        .eq("semaine", semaine)
        .eq("user_id", conducteurId)
        .is("chantier_id", null);

      if (error) throw error;

      // Retourner la liste unique des salarie_id
      return [...new Set((data || []).map(f => f.salarie_id).filter(Boolean))];
    },
    enabled: !!conducteurId && !!semaine,
  });
};
