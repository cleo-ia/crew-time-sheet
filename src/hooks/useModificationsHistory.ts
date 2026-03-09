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
  user_role: string | null;
  page_source: string | null;
}

interface UseModificationsHistoryParams {
  entrepriseId: string | null;
  startDate?: string;
  endDate?: string;
  action?: string;
  userId?: string;
  searchTerm?: string;
  limit?: number;
}

export function useModificationsHistory({
  entrepriseId,
  startDate,
  endDate,
  action,
  userId,
  searchTerm,
  limit = 100,
}: UseModificationsHistoryParams) {
  return useQuery({
    queryKey: ["fiches-modifications", entrepriseId, startDate, endDate, action, userId, searchTerm, limit],
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

      let results = (data || []) as FicheModification[];

      // Client-side search filter
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        results = results.filter((mod) => {
          const details = mod.details as Record<string, unknown>;
          const salarie = String(details.salarie || "").toLowerCase();
          const chantier = String(details.chantier || "").toLowerCase();
          const userName = mod.user_name.toLowerCase();
          return salarie.includes(term) || chantier.includes(term) || userName.includes(term);
        });
      }

      return results;
    },
    enabled: !!entrepriseId,
  });
}
