import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserRoles = (userIds: string[]) => {
  return useQuery({
    queryKey: ["user-roles", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return new Map<string, string>();
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      
      if (error) throw error;
      
      return new Map(data?.map(r => [r.user_id, r.role]) || []);
    },
    enabled: userIds.length > 0,
  });
};
