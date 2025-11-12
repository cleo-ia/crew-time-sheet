import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FicheJour {
  id: string;
  date: string;
  heures: number;
  fiche_id: string;
}

export const useFichesJoursByEmployee = (
  employeeId: string | undefined,
  semaine: string | undefined
) => {
  return useQuery({
    queryKey: ["fiches-jours-employee", employeeId, semaine],
    queryFn: async () => {
      if (!employeeId || !semaine) return [];

      // Récupérer toutes les fiches de cet employé pour cette semaine
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select("id")
        .eq("salarie_id", employeeId)
        .eq("semaine", semaine);

      if (fichesError) throw fichesError;
      if (!fiches || fiches.length === 0) return [];

      const ficheIds = fiches.map(f => f.id);

      // Récupérer tous les fiches_jours pour ces fiches
      const { data: fichesJours, error: fjError } = await supabase
        .from("fiches_jours")
        .select("id, date, heures, fiche_id")
        .in("fiche_id", ficheIds);

      if (fjError) throw fjError;

      return (fichesJours || []) as FicheJour[];
    },
    enabled: !!employeeId && !!semaine,
  });
};
