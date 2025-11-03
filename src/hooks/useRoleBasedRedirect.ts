import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRoleBasedRedirect = () => {
  return useQuery({
    queryKey: ["role-based-redirect"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "/";

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = data?.role;

      // Définir la route de redirection selon le rôle
      switch (role) {
        case "conducteur":
          return "/validation-conducteur";
        case "chef":
          return "/";
        case "rh":
          return "/consultation-rh";
        case "admin":
          return "/admin";
        default:
          return "/";
      }
    },
    enabled: false, // On l'appelle manuellement
  });
};
