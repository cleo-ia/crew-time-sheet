import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Vérifie si une semaine a déjà été transmise par le conducteur
 * Retourne true si TOUTES les fiches des finisseurs sont en statut validé/envoyé
 */
export const useWeekTransmissionStatus = (
  semaine: string | null,
  conducteurId: string | null
) => {
  return useQuery({
    queryKey: ["week-transmission-status", semaine, conducteurId],
    queryFn: async () => {
      if (!semaine || !conducteurId) return { isTransmitted: false, fichesCount: 0 };

      // 1. Récupérer les finisseurs affectés par ce conducteur cette semaine
      // La table affectations_finisseurs_jours stocke les dates au format ISO (YYYY-MM-DD)
      // On doit donc récupérer toutes les affectations pour cette semaine via le champ "semaine"
      const { data: affectations, error: affError } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", semaine);

      if (affError) {
        console.error("Erreur récupération affectations:", affError);
        return { isTransmitted: false, fichesCount: 0 };
      }

      // Extraire les IDs uniques des finisseurs
      const finisseurIds = [...new Set((affectations || []).map(a => a.finisseur_id))];

      if (finisseurIds.length === 0) return { isTransmitted: false, fichesCount: 0 };

      // 2. Récupérer les fiches de ces finisseurs pour cette semaine
      // ✅ CORRECTION: Récupérer les chantiers des affectations et chercher les fiches avec chantier
      const { data: affectationsWithChantier, error: affChError } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id, chantier_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", semaine);

      if (affChError) {
        console.error("Erreur récupération affectations chantier:", affChError);
        return { isTransmitted: false, fichesCount: 0 };
      }

      // Construire les paires (finisseur_id, chantier_id) uniques
      const chantierIds = [...new Set((affectationsWithChantier || []).map(a => a.chantier_id).filter(Boolean))];

      if (chantierIds.length === 0) {
        return { isTransmitted: false, fichesCount: 0 };
      }

      // Récupérer les fiches avec les chantiers identifiés
      const { data: fiches, error } = await supabase
        .from("fiches")
        .select("id, statut, salarie_id")
        .eq("semaine", semaine)
        .in("salarie_id", finisseurIds)
        .in("chantier_id", chantierIds);

      if (error) {
        console.error("Erreur vérification transmission:", error);
        return { isTransmitted: false, fichesCount: 0 };
      }

      if (!fiches || fiches.length === 0) {
        return { isTransmitted: false, fichesCount: 0 };
      }

      // 3. Vérifier si TOUTES les fiches sont en statut transmis
      const transmittedStatuses = ["VALIDE_CHEF", "VALIDE_CONDUCTEUR", "AUTO_VALIDE", "ENVOYE_RH"];
      const allTransmitted = fiches.every(f => 
        transmittedStatuses.includes(f.statut)
      );

      return { 
        isTransmitted: allTransmitted, 
        fichesCount: fiches.length 
      };
    },
    enabled: !!semaine && !!conducteurId,
  });
};
