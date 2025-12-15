import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useConversation = (chantierId: string | null) => {
  const queryClient = useQueryClient();
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  const query = useQuery({
    queryKey: ["conversation", chantierId, entrepriseId],
    queryFn: async () => {
      if (!chantierId || !entrepriseId) return null;

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("chantier_id", chantierId)
        .maybeSingle();

      if (error) {
        console.error("Erreur récupération conversation:", error);
        throw error;
      }

      return data;
    },
    enabled: !!chantierId && !!entrepriseId,
  });

  const createConversation = useMutation({
    mutationFn: async (chantierId: string) => {
      if (!entrepriseId) throw new Error("Entreprise non sélectionnée");

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          chantier_id: chantierId,
          entreprise_id: entrepriseId,
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création conversation:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", chantierId, entrepriseId] });
    },
  });

  return {
    conversation: query.data,
    isLoading: query.isLoading,
    createConversation,
  };
};
