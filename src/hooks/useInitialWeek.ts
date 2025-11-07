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
      // Déterminer quelle semaine vérifier : URL ou courante
      const weekToCheck = urlParamWeek || getCurrentWeek();

      // Si pas d'utilisateur, retourner la semaine à vérifier
      if (!userId) {
        return weekToCheck;
      }

      // Cas chef (chantierId fourni) : vérifier user_id + chantier_id
      if (chantierId) {
        const { data: fiches, error } = await supabase
          .from("fiches")
          .select("statut")
          .eq("semaine", weekToCheck)
          .or(`user_id.eq.${userId},user_id.is.null`)
          .eq("chantier_id", chantierId);

        if (error) {
          console.error("Erreur lors de la vérification des fiches (chef):", error);
          return weekToCheck;
        }

        if (!fiches || fiches.length === 0) {
          return weekToCheck;
        }

        // Vérifier si TOUTES les fiches sont transmises (statut final)
        const allTransmitted = fiches.every((f) => 
          f.statut === "VALIDE_CHEF" || f.statut === "VALIDE_CONDUCTEUR" || f.statut === "AUTO_VALIDE"
        );
        
        if (allTransmitted) {
          // Tout est transmis → passer à la semaine suivante
          return getNextWeek(weekToCheck);
        }

        // Sinon, vérifier si au moins une fiche est en brouillon
        const hasAnyBrouillon = fiches.some((f) => f.statut === "BROUILLON");
        return hasAnyBrouillon ? weekToCheck : getNextWeek(weekToCheck);
      }

      // Cas conducteur: prendre les fiches finisseurs qu'il a créées (chantier_id IS NULL)
      const { data: fichesByUser, error: errUser } = await supabase
        .from("fiches")
        .select("statut, salarie_id")
        .eq("semaine", weekToCheck)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .is("chantier_id", null);

      if (errUser) {
        console.error("Erreur lors de la vérification des fiches (conducteur):", errUser);
        return weekToCheck;
      }

      // Exclure la fiche personnelle du conducteur, on ne considère que celles des finisseurs
      const finisseurFiches = (fichesByUser || []).filter((f) => f.salarie_id && f.salarie_id !== userId);

      if (finisseurFiches.length === 0) {
        return weekToCheck;
      }

      // Vérifier si TOUTES les fiches sont transmises (statut final)
      const allTransmitted = finisseurFiches.every((f) => 
        f.statut === "VALIDE_CHEF" || f.statut === "VALIDE_CONDUCTEUR" || f.statut === "AUTO_VALIDE"
      );
      
      if (allTransmitted) {
        // Tout est transmis → passer à la semaine suivante
        return getNextWeek(weekToCheck);
      }

      // Sinon, vérifier si au moins une fiche est en brouillon
      const hasAnyBrouillon = finisseurFiches.some((f) => f.statut === "BROUILLON");
      return hasAnyBrouillon ? weekToCheck : getNextWeek(weekToCheck);
    },
    // Exécuter quand l'user est connu ou si l'URL force une semaine
    enabled: !!urlParamWeek || !!userId,
    staleTime: 0, // Toujours vérifier au chargement
    gcTime: 0, // Ne pas garder en cache
  });
};
