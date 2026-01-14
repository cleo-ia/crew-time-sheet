import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCurrentUserRole = () => {
  return useQuery({
    queryKey: ["current-user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Récupérer l'entreprise sélectionnée
      const currentEntrepriseId = localStorage.getItem("current_entreprise_id");

      // Requête avec filtre entreprise si disponible
      let query = supabase
        .from("user_roles")
        .select("role, entreprise_id")
        .eq("user_id", user.id);

      if (currentEntrepriseId) {
        query = query.eq("entreprise_id", currentEntrepriseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Priorité des rôles : super_admin > admin > rh > conducteur > chef
      const priority: Array<"super_admin" | "admin" | "rh" | "conducteur" | "chef"> = ['super_admin', 'admin', 'rh', 'conducteur', 'chef'];
      const roles = data.map(r => r.role);

      for (const role of priority) {
        if (roles.includes(role)) return role;
      }

      return roles[0];
    },
  });
};