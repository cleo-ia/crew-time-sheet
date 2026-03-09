import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserOption {
  id: string;
  name: string;
}

export function useUtilisateursByAuthRole(
  role: string | null,
  entrepriseId: string | null
) {
  return useQuery({
    queryKey: ["utilisateurs-by-auth-role", role, entrepriseId],
    queryFn: async (): Promise<UserOption[]> => {
      if (!role || !entrepriseId) return [];

      // Get user_ids with this role in this entreprise
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role as any)
        .eq("entreprise_id", entrepriseId);

      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const userIds = roleData.map((r) => r.user_id);

      // Get names from utilisateurs (joined via auth_user_id)
      const { data: utilisateurs } = await supabase
        .from("utilisateurs")
        .select("auth_user_id, prenom, nom")
        .in("auth_user_id", userIds)
        .eq("entreprise_id", entrepriseId);

      const results: UserOption[] = [];
      const resolved = new Set<string>();

      for (const u of utilisateurs || []) {
        if (u.auth_user_id && u.prenom && u.nom) {
          results.push({ id: u.auth_user_id, name: `${u.prenom} ${u.nom}` });
          resolved.add(u.auth_user_id);
        }
      }

      // Fallback to profiles for any unresolved
      const unresolved = userIds.filter((id) => !resolved.has(id));
      if (unresolved.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", unresolved);

        for (const p of profiles || []) {
          const name =
            p.first_name || p.last_name
              ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
              : p.email;
          results.push({ id: p.id, name });
        }
      }

      return results.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!role && !!entrepriseId,
  });
}
