import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFicheId = (semaine: string, chefId: string, chantierId?: string | null) => {
  return useQuery({
    queryKey: ["fiche-id", semaine, chefId, chantierId],
    queryFn: async (): Promise<string | null> => {
      if (!semaine || !chefId) return null;

      let query = supabase
        .from("fiches")
        .select("id, created_at")
        .eq("semaine", semaine)
        .eq("user_id", chefId);

      if (chantierId) {
        query = query.eq("chantier_id", chantierId);
      } else {
        query = query.is("chantier_id", null);
      }

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
