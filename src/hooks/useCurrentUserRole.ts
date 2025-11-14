import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export const useCurrentUserRole = () => {
  const { user, status } = useAuth();

  return useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role || null;
    },
    enabled: status === 'authenticated' && !!user?.id,
    staleTime: 60000,
  });
};