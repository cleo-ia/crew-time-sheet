import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RatioJournalier {
  id?: string;
  fiche_id: string;
  date: string;
  m3_beton: number | null;
  ml_voile: number | null;
  m2_coffrage: number | null;
  meteo: string | null;
  observations: string | null;
  incident: string | null;
}

/**
 * Hook pour charger les ratios journaliers d'une fiche
 */
export const useRatiosJournaliers = (ficheId: string | null) => {
  return useQuery({
    queryKey: ["ratios-journaliers", ficheId],
    queryFn: async () => {
      if (!ficheId) return [];
      
      const { data, error } = await supabase
        .from("ratios_journaliers")
        .select("*")
        .eq("fiche_id", ficheId)
        .order("date", { ascending: true });
      
      if (error) {
        console.error("Erreur chargement ratios journaliers:", error);
        throw error;
      }
      
      return data as RatioJournalier[];
    },
    enabled: !!ficheId,
  });
};

/**
 * Hook pour sauvegarder un ratio journalier (upsert)
 */
export const useSaveRatioJournalier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ratio: RatioJournalier) => {
      // Upsert : insert ou update si existe déjà pour cette fiche/date
      const { data, error } = await supabase
        .from("ratios_journaliers")
        .upsert(
          {
            fiche_id: ratio.fiche_id,
            date: ratio.date,
            m3_beton: ratio.m3_beton,
            ml_voile: ratio.ml_voile,
            m2_coffrage: ratio.m2_coffrage,
            meteo: ratio.meteo,
            observations: ratio.observations,
            incident: ratio.incident,
          },
          { onConflict: "fiche_id,date" }
        )
        .select()
        .single();
      
      if (error) {
        console.error("Erreur sauvegarde ratio journalier:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["ratios-journaliers", variables.fiche_id] 
      });
    },
  });
};
