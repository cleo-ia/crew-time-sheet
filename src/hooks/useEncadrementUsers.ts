import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EncadrementUser {
  id: string;
  name: string;
  role: string;
  lastActivity: string | null;
}

const ENCADREMENT_ROLES = ["admin", "rh", "gestionnaire", "conducteur", "chef"] as const;

export function useEncadrementUsers(
  entrepriseId: string | null,
  roleFilter?: string | null
) {
  return useQuery({
    queryKey: ["encadrement-users", entrepriseId, roleFilter],
    queryFn: async (): Promise<EncadrementUser[]> => {
      if (!entrepriseId) return [];

      // 1. Get user_roles for encadrement roles
      let rolesQuery = supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("entreprise_id", entrepriseId);

      if (roleFilter && ENCADREMENT_ROLES.includes(roleFilter as any)) {
        rolesQuery = rolesQuery.eq("role", roleFilter as any);
      } else {
        rolesQuery = rolesQuery.in("role", [...ENCADREMENT_ROLES] as any);
      }

      const { data: rolesData, error: rolesError } = await rolesQuery;
      if (rolesError) throw rolesError;
      if (!rolesData?.length) return [];

      const userIds = rolesData.map((r) => r.user_id);
      const roleMap = new Map(rolesData.map((r) => [r.user_id, r.role as string]));

      // 2. Resolve names via utilisateurs
      const { data: utilisateurs } = await supabase
        .from("utilisateurs")
        .select("auth_user_id, prenom, nom")
        .in("auth_user_id", userIds)
        .eq("entreprise_id", entrepriseId);

      const nameMap = new Map<string, string>();
      for (const u of utilisateurs || []) {
        if (u.auth_user_id && u.prenom && u.nom) {
          nameMap.set(u.auth_user_id, `${u.prenom} ${u.nom}`);
        }
      }

      // Fallback to profiles
      const unresolved = userIds.filter((id) => !nameMap.has(id));
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
          nameMap.set(p.id, name);
        }
      }

      // 3. Get last activity per user from fiches_modifications
      const { data: lastActivities } = await supabase
        .from("fiches_modifications")
        .select("user_id, created_at")
        .eq("entreprise_id", entrepriseId)
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      const lastActivityMap = new Map<string, string>();
      for (const a of lastActivities || []) {
        if (!lastActivityMap.has(a.user_id)) {
          lastActivityMap.set(a.user_id, a.created_at);
        }
      }

      // 4. Build result
      return userIds
        .map((id) => ({
          id,
          name: nameMap.get(id) || id,
          role: roleMap.get(id) || "unknown",
          lastActivity: lastActivityMap.get(id) || null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!entrepriseId,
  });
}
