import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAgencesInterim = () => {
  return useQuery({
    queryKey: ["agences-interim"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("agence_interim")
        .not("agence_interim", "is", null)
        .neq("agence_interim", "");

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
  });
};
