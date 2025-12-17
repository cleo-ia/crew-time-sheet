import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface LogModificationParams {
  ficheId?: string | null;
  entrepriseId: string;
  userId: string;
  userName: string;
  action: string;
  champModifie?: string | null;
  ancienneValeur?: string | null;
  nouvelleValeur?: string | null;
  details?: Json;
}

export function useLogModification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ficheId,
      entrepriseId,
      userId,
      userName,
      action,
      champModifie,
      ancienneValeur,
      nouvelleValeur,
      details = {},
    }: LogModificationParams) => {
      const { data, error } = await supabase
        .from("fiches_modifications")
        .insert([{
          fiche_id: ficheId || undefined,
          entreprise_id: entrepriseId,
          user_id: userId,
          user_name: userName,
          action,
          champ_modifie: champModifie || undefined,
          ancienne_valeur: ancienneValeur || undefined,
          nouvelle_valeur: nouvelleValeur || undefined,
          details,
        }])
        .select()
        .single();

      if (error) {
        console.error("Error logging modification:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches-modifications"] });
    },
  });
}
