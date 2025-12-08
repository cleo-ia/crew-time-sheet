import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCurrentEntrepriseId = () => {
  return useQuery({
    queryKey: ["current-entreprise-id"],
    queryFn: async () => {
      // 1. Priorité au localStorage (entreprise sélectionnée au login)
      const storedId = localStorage.getItem("current_entreprise_id");
      if (storedId) return storedId;
      
      // 2. Fallback: récupérer depuis user_roles avec ordre déterministe
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("entreprise_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.entreprise_id || null;
    },
  });
};