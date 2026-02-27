import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RapprochementStatus {
  id: string;
  entreprise_id: string;
  agence_name: string;
  semaine: string;
  periode: string;
  rapproche: boolean;
  rapproche_at: string | null;
  rapproche_by: string | null;
}

export const useRapprochementStatus = (periode: string, entrepriseId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rapprochement-status", periode, entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];
      const { data, error } = await supabase
        .from("rapprochements_status" as any)
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("periode", periode);
      if (error) throw error;
      return (data || []) as unknown as RapprochementStatus[];
    },
    enabled: !!entrepriseId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      agenceName,
      semaine,
    }: {
      agenceName: string;
      semaine: string;
    }) => {
      if (!entrepriseId) throw new Error("No entreprise");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check existing
      const existing = query.data?.find(
        (s) => s.agence_name === agenceName && s.semaine === semaine
      );

      if (existing) {
        const newValue = !existing.rapproche;
        const { error } = await supabase
          .from("rapprochements_status" as any)
          .update({
            rapproche: newValue,
            rapproche_at: newValue ? new Date().toISOString() : null,
            rapproche_by: newValue ? user.id : null,
          } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rapprochements_status" as any)
          .insert({
            entreprise_id: entrepriseId,
            agence_name: agenceName,
            semaine,
            periode,
            rapproche: true,
            rapproche_at: new Date().toISOString(),
            rapproche_by: user.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapprochement-status", periode, entrepriseId] });
    },
  });

  const isRapproche = (agenceName: string, semaine: string): boolean => {
    return query.data?.some(
      (s) => s.agence_name === agenceName && s.semaine === semaine && s.rapproche
    ) ?? false;
  };

  const getRapprocheSummary = (agenceName: string, semaines: string[]): { done: number; total: number } => {
    const done = semaines.filter((s) => isRapproche(agenceName, s)).length;
    return { done, total: semaines.length };
  };

  return {
    ...query,
    isRapproche,
    getRapprocheSummary,
    toggle: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
};
