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

      // Récupérer les fiches créées par ce conducteur pour cette semaine (hors sa propre fiche)
      const { data: fiches, error } = await supabase
        .from("fiches")
        .select("id, statut, salarie_id")
        .eq("semaine", semaine)
        .eq("user_id", conducteurId)
        .is("chantier_id", null);

      if (error) {
        console.error("Erreur vérification transmission:", error);
        return { isTransmitted: false, fichesCount: 0 };
      }

      // Exclure la fiche personnelle du conducteur (salarie_id === conducteurId)
      const finisseurFiches = (fiches || []).filter(f => f.salarie_id !== conducteurId);

      if (finisseurFiches.length === 0) return { isTransmitted: false, fichesCount: 0 };

      // Vérifier si TOUTES les fiches sont en statut transmis
      const transmittedStatuses = ["VALIDE_CHEF", "VALIDE_CONDUCTEUR", "AUTO_VALIDE", "ENVOYE_RH"];
      const allTransmitted = finisseurFiches.every(f => 
        transmittedStatuses.includes(f.statut)
      );

      return { 
        isTransmitted: allTransmitted, 
        fichesCount: finisseurFiches.length 
      };
    },
    enabled: !!semaine && !!conducteurId,
  });
};
