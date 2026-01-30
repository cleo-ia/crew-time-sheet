import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAgencesInterim = () => {
  // Récupérer l'entreprise courante depuis localStorage
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["agences-interim", entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("utilisateurs")
        .select("agence_interim")
        .not("agence_interim", "is", null)
        .neq("agence_interim", "");

      // Filtrer par entreprise
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extraire les valeurs uniques et les trier
      const uniqueAgences = [
        ...new Set(
          data.map((u) => u.agence_interim?.trim()).filter(Boolean)
        ),
      ].sort();

      return uniqueAgences as string[];
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    enabled: !!entrepriseId,
  });
};
