import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWeek, getNextWeek } from "@/lib/weekUtils";

/**
 * Hook qui détermine intelligemment quelle semaine afficher au chargement de la page
 * - Priorité 1 : Paramètre URL
 * - Priorité 2 : Vérifier si la semaine courante est déjà transmise
 *   - Si transmise → passer à la semaine suivante
 *   - Si non transmise ou pas de fiche → rester sur la semaine courante
 */
export const useInitialWeek = (
  urlParamWeek: string | null,
  chefId: string | null,
  chantierId: string | null
) => {
  return useQuery({
    queryKey: ["initial-week", urlParamWeek, chefId, chantierId],
    queryFn: async () => {
      // Priorité 1 : Si paramètre URL existe, le respecter
      if (urlParamWeek) {
        return urlParamWeek;
      }

      const currentWeek = getCurrentWeek();

      // Si pas de chef ou chantier, retourner semaine courante
      if (!chefId || !chantierId) {
        return currentWeek;
      }

      // Vérifier le statut de la fiche de la semaine courante
      const { data: fiche, error } = await supabase
        .from("fiches")
        .select("statut")
        .eq("semaine", currentWeek)
        .eq("user_id", chefId)
        .eq("chantier_id", chantierId)
        .maybeSingle();

      // En cas d'erreur, fallback vers semaine courante
      if (error) {
        console.error("Erreur lors de la vérification de la fiche:", error);
        return currentWeek;
      }

      // Si pas de fiche ou fiche en brouillon → semaine courante
      if (!fiche || fiche.statut === "BROUILLON") {
        return currentWeek;
      }

      // Si fiche transmise → passer à la semaine suivante
      return getNextWeek(currentWeek);
    },
    // Toujours exécuter la requête, même si certains params sont null
    enabled: true,
    staleTime: 0, // Toujours vérifier au chargement
    gcTime: 0, // Ne pas garder en cache
  });
};
