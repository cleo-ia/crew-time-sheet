import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFicheModifiable = (
  semaine: string,
  chantierId: string | null,
  chefId: string | null
) => {
  return useQuery({
    queryKey: ["fiche-modifiable", semaine, chantierId, chefId],
    queryFn: async () => {
      if (!semaine || !chefId) {
        return { isModifiable: false, raison: "Paramètres manquants", statutBloquant: null };
      }

      // 1. Vérifier si la période est clôturée (envoyée aux RH)
      const { data: periode } = await supabase
        .from("periodes_cloturees")
        .select("*")
        .lte("semaine_debut", semaine)
        .gte("semaine_fin", semaine)
        .maybeSingle();

      if (periode) {
        return {
          isModifiable: false,
          raison: "Période déjà envoyée aux RH et clôturée",
          statutBloquant: "ENVOYE_RH",
        };
      }

      // 2. Vérifier le statut des fiches existantes
      // ✅ CORRECTION : chantier_id est maintenant obligatoire
      let query = supabase
        .from("fiches")
        .select("statut")
        .eq("semaine", semaine)
        .eq("user_id", chefId);

      if (chantierId) {
        query = query.eq("chantier_id", chantierId);
      }
      // Plus de filtre chantier_id IS NULL - toutes les fiches ont un chantier

      const { data: fiches } = await query;

      // Si aucune fiche → modifiable
      if (!fiches || fiches.length === 0) {
        return { isModifiable: true, raison: null, statutBloquant: null };
      }

      // Vérifier si au moins une fiche a un statut bloquant
      const statutsBloquants = ["VALIDE_CHEF", "VALIDE_CONDUCTEUR", "ENVOYE_RH"];
      const ficheBloquante = fiches.find((f) => statutsBloquants.includes(f.statut));

      if (ficheBloquante) {
        return {
          isModifiable: false,
          raison:
            ficheBloquante.statut === "VALIDE_CHEF"
              ? "Fiche déjà transmise et signatures collectées"
              : ficheBloquante.statut === "VALIDE_CONDUCTEUR"
              ? "Fiche déjà transmise au conducteur"
              : "Fiche déjà envoyée aux RH",
          statutBloquant: ficheBloquante.statut,
        };
      }

      return { isModifiable: true, raison: null, statutBloquant: null };
    },
    enabled: !!semaine && !!chefId,
  });
};
