import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWeek, getNextWeek } from "@/lib/weekUtils";

/**
 * Hook qui détermine intelligemment quelle semaine afficher au chargement de la page
 * - Priorité 1 : Paramètre URL
 * - Priorité 2 : Vérifier si la semaine courante est déjà transmise
 *   - Si transmise → passer à la semaine suivante
 *   - Si non transmise ou pas de fiche → rester sur la semaine courante
 * 
 * @param urlParamWeek - Semaine spécifiée dans l'URL (priorité absolue)
 * @param userId - ID de l'utilisateur (chef ou conducteur)
 * @param chantierId - ID du chantier (optionnel, null pour les conducteurs/finisseurs)
 */
export const useInitialWeek = (
  urlParamWeek: string | null,
  userId: string | null,
  chantierId: string | null = null
) => {
  return useQuery({
    queryKey: ["initial-week", urlParamWeek, userId, chantierId],
    queryFn: async () => {
      // Priorité 1 : Si paramètre URL existe, le respecter
      if (urlParamWeek) {
        return urlParamWeek;
      }

      const currentWeek = getCurrentWeek();

      // Si pas d'utilisateur, retourner semaine courante
      if (!userId) {
        return currentWeek;
      }

      // Construire la requête selon qu'on a un chantier ou non
      let query = supabase
        .from("fiches")
        .select("statut")
        .eq("semaine", currentWeek);

      // Pour les chefs : vérifier user_id + chantier_id
      // Pour les conducteurs/finisseurs : vérifier salarie_id uniquement
      if (chantierId) {
        query = query.eq("user_id", userId).eq("chantier_id", chantierId);
      } else {
        query = query.eq("salarie_id", userId);
      }

      const { data: fiches, error } = await query;

      // En cas d'erreur, fallback vers semaine courante
      if (error) {
        console.error("Erreur lors de la vérification des fiches:", error);
        return currentWeek;
      }

      // Si pas de fiche → semaine courante
      if (!fiches || fiches.length === 0) {
        return currentWeek;
      }

      // Si toutes les fiches sont transmises (aucune en BROUILLON) → semaine suivante
      const hasAnyBrouillon = fiches.some(f => f.statut === "BROUILLON");
      
      if (hasAnyBrouillon) {
        return currentWeek;
      }

      // Toutes les fiches sont transmises → passer à la semaine suivante
      return getNextWeek(currentWeek);
    },
    // Exécuter quand l'user est connu ou si l'URL force une semaine
    enabled: !!urlParamWeek || !!userId,
    staleTime: 0, // Toujours vérifier au chargement
    gcTime: 0, // Ne pas garder en cache
  });
};
