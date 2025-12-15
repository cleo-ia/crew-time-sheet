import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useConversation } from "@/hooks/useConversation";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useMarkMessagesAsRead } from "@/hooks/useUnreadMessages";
import { MessageBubble } from "./MessageBubble";

interface ConversationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string | null;
  chantierNom: string;
  currentUserId: string;
}

export const ConversationSheet: React.FC<ConversationSheetProps> = ({
  open,
  onOpenChange,
  chantierId,
  chantierNom,
  currentUserId,
}) => {
  const [messageContent, setMessageContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { conversation, isLoading: isLoadingConv, createConversation } = useConversation(chantierId);
  const { messages, isLoading: isLoadingMessages } = useMessages(conversation?.id || null);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();

  // Créer la conversation si elle n'existe pas
  useEffect(() => {
    if (open && chantierId && !conversation && !isLoadingConv) {
      createConversation.mutate(chantierId);
    }
  }, [open, chantierId, conversation, isLoadingConv, createConversation]);

  // Scroll vers le bas quand les messages changent
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Marquer les messages comme lus quand on ouvre le chat
  useEffect(() => {
    if (open && messages.length > 0 && currentUserId) {
      const unreadMessageIds = messages
        .filter((m) => m.author_id !== currentUserId)
        .map((m) => m.id);
      
      if (unreadMessageIds.length > 0) {
        markAsRead.mutate({ messageIds: unreadMessageIds, userId: currentUserId });
      }
    }
  }, [open, messages, currentUserId, markAsRead]);

  const handleSend = () => {
    if (!messageContent.trim() || !conversation?.id || !currentUserId) return;

    sendMessage.mutate(
      {
        conversationId: conversation.id,
        content: messageContent,
        authorId: currentUserId,
      },
      {
        onSuccess: () => {
          setMessageContent("");
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = isLoadingConv || isLoadingMessages || createConversation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-lg font-semibold">
            💬 {chantierNom}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              <div className="py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Aucun message. Soyez le premier à écrire !
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      authorName={
                        message.author
                          ? `${message.author.prenom || ""} ${message.author.nom || ""}`.trim() || "Inconnu"
                          : "Inconnu"
                      }
                      authorRole={message.author?.role_metier || null}
                      createdAt={message.created_at}
                      isOwnMessage={message.author_id === currentUserId}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Votre message..."
                  disabled={sendMessage.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageContent.trim() || sendMessage.isPending}
                  size="icon"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
