import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Message {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    id: string;
    nom: string | null;
    prenom: string | null;
    role_metier: string | null;
  };
}

export const useMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          author_id,
          content,
          created_at
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erreur récupération messages:", error);
        throw error;
      }

      // Récupérer les infos des auteurs
      const authorIds = [...new Set(data.map((m) => m.author_id))];
      const { data: authors } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, role_metier, auth_user_id")
        .in("auth_user_id", authorIds);

      const authorsMap = new Map(authors?.map((a) => [a.auth_user_id, a]) || []);

      return data.map((m) => ({
        ...m,
        author: authorsMap.get(m.author_id) || null,
      })) as Message[];
    },
    enabled: !!conversationId,
  });

  // Écouter les nouveaux messages en temps réel via Supabase Realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Nouveau message reçu:", payload);
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
