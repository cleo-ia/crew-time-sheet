import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook pour récupérer les jours de fiche d'un finisseur
 * et déterminer quels jours sont des absences (HNORM=0 ET HI=0)
 */
export const useFichesJoursByFinisseur = (
  finisseurId: string | null,
  semaine: string | null
) => {
  return useQuery({
    queryKey: ["fiches-jours-finisseur", finisseurId, semaine],
    queryFn: async () => {
      if (!finisseurId || !semaine) return [];

      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select("id")
        .eq("salarie_id", finisseurId)
        .eq("semaine", semaine);

      if (fichesError) throw fichesError;
      if (!fiches || fiches.length === 0) return [];

      const ficheIds = fiches.map(f => f.id);

      const { data: jours, error: joursError } = await supabase
        .from("fiches_jours")
        .select("date, HNORM, HI")
        .in("fiche_id", ficheIds);

      if (joursError) throw joursError;

      return (jours || []).map(j => ({
        date: j.date,
        isAbsent: (j.HNORM || 0) === 0 && (j.HI || 0) === 0,
      }));
    },
    enabled: !!finisseurId && !!semaine,
  });
};
