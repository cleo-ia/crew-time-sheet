import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodoChantier {
  id: string;
  chantier_id: string;
  nom: string;
  description: string | null;
  statut: "A_FAIRE" | "EN_COURS" | "TERMINE";
  priorite: "BASSE" | "NORMALE" | "HAUTE" | null;
  date_echeance: string | null;
  afficher_planning: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useTodosChantier = (chantierId: string | undefined) => {
  return useQuery({
    queryKey: ["todos-chantier", chantierId],
    queryFn: async () => {
      if (!chantierId) return [];
      
      const { data, error } = await supabase
        .from("todos_chantier")
        .select("*")
        .eq("chantier_id", chantierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TodoChantier[];
    },
    enabled: !!chantierId,
  });
};
