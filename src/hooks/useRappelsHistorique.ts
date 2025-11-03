import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRappelsHistorique = () => {
  return useQuery({
    queryKey: ['rappels-historique'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rappels_historique')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });
};
