import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMarkDemandesExportees = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (demandeIds: string[]) => {
      const { error } = await supabase
        .from("demandes_conges")
        .update({ exporte_at: new Date().toISOString() })
        .in("id", demandeIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandes-conges-rh"] });
    },
  });
};
