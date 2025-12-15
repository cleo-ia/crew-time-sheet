import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UnreadCount {
  total: number;
  byChantier: Map<string, number>;
}

export const useUnreadMessages = (userId: string | null, chantierIds?: string[]) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["unread-messages", userId, entrepriseId, chantierIds],
    queryFn: async (): Promise<UnreadCount> => {
      if (!userId || !entrepriseId) {
        return { total: 0, byChantier: new Map() };
      }

      // Récupérer toutes les conversations de l'entreprise (ou des chantiers spécifiés)
      let conversationsQuery = supabase
        .from("conversations")
        .select("id, chantier_id")
        .eq("entreprise_id", entrepriseId);

      if (chantierIds && chantierIds.length > 0) {
        conversationsQuery = conversationsQuery.in("chantier_id", chantierIds);
      }

      const { data: conversations, error: convError } = await conversationsQuery;

      if (convError || !conversations || conversations.length === 0) {
        return { total: 0, byChantier: new Map() };
      }

      const conversationIds = conversations.map((c) => c.id);
      const chantierByConversation = new Map(conversations.map((c) => [c.id, c.chantier_id]));

      // Récupérer tous les messages de ces conversations
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, conversation_id")
        .in("conversation_id", conversationIds);

      if (msgError || !messages || messages.length === 0) {
        return { total: 0, byChantier: new Map() };
      }

      const messageIds = messages.map((m) => m.id);

      // Récupérer les messages lus par cet utilisateur
      const { data: readStatuses, error: readError } = await supabase
        .from("message_read_status")
        .select("message_id")
        .eq("user_id", userId)
        .in("message_id", messageIds);

      if (readError) {
        console.error("Erreur récupération statuts lecture:", readError);
        return { total: 0, byChantier: new Map() };
      }

      const readMessageIds = new Set(readStatuses?.map((r) => r.message_id) || []);

      // Calculer les non lus
      const byChantier = new Map<string, number>();
      let total = 0;

      for (const message of messages) {
        if (!readMessageIds.has(message.id)) {
          total++;
          const chantierId = chantierByConversation.get(message.conversation_id);
          if (chantierId) {
            byChantier.set(chantierId, (byChantier.get(chantierId) || 0) + 1);
          }
        }
      }

      return { total, byChantier };
    },
    enabled: !!userId && !!entrepriseId,
    refetchInterval: 30000, // Refresh toutes les 30 secondes
  });
};

export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageIds,
      userId,
    }: {
      messageIds: string[];
      userId: string;
    }) => {
      if (messageIds.length === 0) return;

      // Utiliser upsert pour éviter les doublons
      const { error } = await supabase.from("message_read_status").upsert(
        messageIds.map((messageId) => ({
          message_id: messageId,
          user_id: userId,
        })),
        { onConflict: "message_id,user_id" }
      );

      if (error) {
        console.error("Erreur marquage messages lus:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    },
  });
};
