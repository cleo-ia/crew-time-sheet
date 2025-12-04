import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TacheChantier {
  id: string;
  chantier_id: string;
  nom: string;
  description: string | null;
  date_debut: string;
  date_fin: string;
  heures_estimees: number | null;
  heures_realisees: number | null;
  montant_vendu: number | null;
  statut: "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD";
  ordre: number;
  couleur: string | null;
  created_at: string;
  updated_at: string;
}

export const useTachesChantier = (chantierId: string | undefined) => {
  return useQuery({
    queryKey: ["taches-chantier", chantierId],
    queryFn: async (): Promise<TacheChantier[]> => {
      if (!chantierId) return [];

      const { data, error } = await supabase
        .from("taches_chantier")
        .select("*")
        .eq("chantier_id", chantierId)
        .order("ordre", { ascending: true })
        .order("date_debut", { ascending: true });

      if (error) throw error;
      return (data || []) as TacheChantier[];
    },
    enabled: !!chantierId,
  });
};
