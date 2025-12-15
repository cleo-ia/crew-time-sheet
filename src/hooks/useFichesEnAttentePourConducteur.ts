import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFichesEnAttentePourConducteur = (conducteurId: string | null) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["fiches-en-attente-conducteur", conducteurId, entrepriseId],
    queryFn: async () => {
      if (!conducteurId || !entrepriseId) return 0;

      // Compter les fiches VALIDE_CHEF sur les chantiers de CE conducteur
      const { count, error } = await supabase
        .from("fiches")
        .select(`
          id,
          chantiers!inner (
            id,
            conducteur_id,
            entreprise_id
          )
        `, { count: 'exact', head: true })
        .eq("statut", "VALIDE_CHEF")
        .eq("chantiers.conducteur_id", conducteurId)
        .eq("chantiers.entreprise_id", entrepriseId);

      if (error) {
        console.error("Erreur fiches en attente conducteur:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!conducteurId && !!entrepriseId,
  });
};
