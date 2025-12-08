import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCurrentEntrepriseId = () => {
  return useQuery({
    queryKey: ["current-entreprise-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("entreprise_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.entreprise_id || null;
    },
  });
};