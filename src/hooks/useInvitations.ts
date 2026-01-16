import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";

export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  entreprise_id: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export const useInvitations = () => {
  const { data: entrepriseId } = useCurrentEntrepriseId();

  return useQuery({
    queryKey: ["invitations", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invitations:", error);
        throw error;
      }

      return data as Invitation[];
    },
    enabled: !!entrepriseId,
  });
};

export const useInvitationByEmail = (email: string | null) => {
  const { data: entrepriseId } = useCurrentEntrepriseId();

  return useQuery({
    queryKey: ["invitation", email, entrepriseId],
    queryFn: async () => {
      if (!email || !entrepriseId) return null;

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("entreprise_id", entrepriseId)
        .eq("status", "pending")
        .maybeSingle();

      if (error) {
        console.error("Error fetching invitation by email:", error);
        throw error;
      }

      return data as Invitation | null;
    },
    enabled: !!email && !!entrepriseId,
  });
};
