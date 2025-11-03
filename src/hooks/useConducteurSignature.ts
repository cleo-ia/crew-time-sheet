import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useConducteurSignature = (ficheId: string | null, conducteurId: string | null) => {
  return useQuery({
    queryKey: ["conducteur-signature", ficheId, conducteurId],
    queryFn: async () => {
      if (!ficheId || !conducteurId) return null;

      const isComposite = ficheId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{4}-(W|S)\d{2}$/i);
      
      let ficheIds: string[] = [];
      
      if (isComposite) {
        // Pour un ID composite, récupérer TOUTES les fiches du lot
        const lastHyphenIndex = ficheId.lastIndexOf("-");
        const secondLastHyphenIndex = ficheId.lastIndexOf("-", lastHyphenIndex - 1);
        const chantierId = ficheId.substring(0, secondLastHyphenIndex);
        const semaine = ficheId.substring(secondLastHyphenIndex + 1);
        
        const { data: fiches } = await supabase
          .from("fiches")
          .select("id")
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine);
        
        ficheIds = fiches?.map(f => f.id) || [];
      } else {
        ficheIds = [ficheId];
      }

      // Vérifier que le conducteur a signé TOUTES les fiches
      const { data, error } = await supabase
        .from("signatures")
        .select("*")
        .in("fiche_id", ficheIds)
        .eq("signed_by", conducteurId)
        .eq("role", "conducteur");

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Retourner la première signature si TOUTES les fiches sont signées
      // Sinon retourner null
      if (data && data.length === ficheIds.length) {
        return data[0]; // Retourner la première signature pour affichage
      }
      
      return null;
    },
    enabled: !!ficheId && !!conducteurId,
  });
};
