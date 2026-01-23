import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFicheId = (semaine: string, chefId: string, chantierId?: string | null) => {
  return useQuery({
    queryKey: ["fiche-id", semaine, chefId, chantierId],
    queryFn: async (): Promise<string | null> => {
      if (!semaine || !chefId) return null;

      // ✅ CORRECTION : chantier_id est maintenant obligatoire
      // Si pas de chantierId fourni, on cherche toutes les fiches de l'utilisateur pour cette semaine
      let query = supabase
        .from("fiches")
        .select("id, created_at")
        .eq("semaine", semaine)
        .eq("user_id", chefId);

      if (chantierId) {
        query = query.eq("chantier_id", chantierId);
      }
      // Plus de filtre chantier_id IS NULL - toutes les fiches ont un chantier

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!semaine && !!chefId,
  });
};
