import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFichesEnAttentePourConducteur = (conducteurId: string | null) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["fiches-en-attente-conducteur", conducteurId, entrepriseId],
    queryFn: async () => {
      if (!conducteurId || !entrepriseId) return 0;

      // Récupérer les combinaisons chantier_id+semaine distinctes
      const { data, error } = await supabase
        .from("fiches")
        .select(`
          chantier_id,
          semaine,
          chantiers!inner (
            id,
            conducteur_id,
            entreprise_id
          )
        `)
        .eq("statut", "VALIDE_CHEF")
        .eq("chantiers.conducteur_id", conducteurId)
        .eq("chantiers.entreprise_id", entrepriseId);

      if (error || !data) {
        console.error("Erreur fiches en attente conducteur:", error);
        return 0;
      }

      // Compter les combinaisons UNIQUES chantier+semaine (= nombre de cartes)
      const uniquePairs = new Set(
        data.map(f => `${f.chantier_id}|${f.semaine}`)
      );

      return uniquePairs.size;
    },
    enabled: !!conducteurId && !!entrepriseId,
  });
};
