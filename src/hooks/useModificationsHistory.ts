import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FicheModification {
  id: string;
  fiche_id: string | null;
  entreprise_id: string;
  user_id: string;
  user_name: string;
  action: string;
  champ_modifie: string | null;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface UseModificationsHistoryParams {
  entrepriseId: string | null;
  startDate?: string;
  endDate?: string;
  action?: string;
  userId?: string;
  limit?: number;
}

export function useModificationsHistory({
  entrepriseId,
  startDate,
  endDate,
  action,
  userId,
  limit = 100,
}: UseModificationsHistoryParams) {
  return useQuery({
    queryKey: ["fiches-modifications", entrepriseId, startDate, endDate, action, userId, limit],
    queryFn: async () => {
      if (!entrepriseId) return [];

      let query = supabase
        .from("fiches_modifications")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }
      if (action) {
        query = query.eq("action", action);
      }
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching modifications history:", error);
        throw error;
      }

      return (data || []) as FicheModification[];
    },
    enabled: !!entrepriseId,
  });
}
