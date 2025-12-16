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
import { Send, Loader2, MessageCircle, Building2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useConversation } from "@/hooks/useConversation";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useMarkMessagesAsRead } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";
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
  const [sheetHeight, setSheetHeight] = useState("85vh");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Scroll vers le bas quand les messages changent ou quand la conversation s'ouvre
  useEffect(() => {
    if (open && messagesEndRef.current) {
      // Délai pour s'assurer que ScrollArea est complètement rendu
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, open]);

  // Adapter la hauteur du sheet quand le clavier apparaît (tablettes/mobiles)
  useEffect(() => {
    if (!open) return;
    
    const updateHeight = () => {
      if (window.visualViewport) {
        const availableHeight = window.visualViewport.height;
        const totalHeight = window.innerHeight;
        
        // Si le clavier est ouvert (viewport réduit de plus de 100px)
        if (totalHeight - availableHeight > 100) {
          setSheetHeight(`${availableHeight * 0.95}px`);
        } else {
          setSheetHeight("85vh");
        }
      }
    };

    window.visualViewport?.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("scroll", updateHeight);
    updateHeight();

    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("scroll", updateHeight);
    };
  }, [open]);

  // Mettre à zéro les notifications DÈS l'ouverture de la conversation (mise à jour optimiste)
  useEffect(() => {
    if (open && chantierId) {
      // Utiliser setQueriesData pour cibler TOUTES les queries "unread-messages" (matcher partiel)
      queryClient.setQueriesData(
        { queryKey: ["unread-messages"] },
        (oldData: { total: number; byChantier: Map<string, number> } | undefined) => {
          if (!oldData) return oldData;
          const newByChantier = new Map(oldData.byChantier);
          const countForThisChantier = newByChantier.get(chantierId) || 0;
          newByChantier.delete(chantierId);
          return {
            total: Math.max(0, oldData.total - countForThisChantier),
            byChantier: newByChantier,
          };
        }
      );
    }
  }, [open, chantierId, queryClient]);

  // Marquer les messages comme lus en arrière-plan (pour persister en base)
  useEffect(() => {
    if (!open || messages.length === 0 || !currentUserId) return;

    const unreadMessageIds = messages
      .filter((m) => m.author_id !== currentUserId)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      markAsRead.mutate({ messageIds: unreadMessageIds, userId: currentUserId });
    }
  }, [open, messages, currentUserId]);

  const handleSend = () => {
    if (!messageContent.trim()) return;

    if (!currentUserId) {
      toast({
        title: "Impossible d'envoyer",
        description: "Utilisateur non identifié.",
        variant: "destructive",
      });
      return;
    }

    if (!conversation?.id) {
      toast({
        title: "Conversation en cours",
        description: "Patientez une seconde puis réessayez.",
      });
      return;
    }

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
        onError: (error: any) => {
          toast({
            title: "Erreur d'envoi",
            description: error?.message || "Le message n'a pas pu être envoyé.",
            variant: "destructive",
          });
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
      <SheetContent 
        className="w-full sm:max-w-md flex flex-col p-0 gap-0 transition-[height] duration-150"
        style={{ height: sheetHeight, maxHeight: sheetHeight }}
      >
        {/* Header amélioré */}
        <SheetHeader className="px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold truncate">
                {chantierNom}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Conversation d'équipe</p>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Zone des messages */}
            <ScrollArea className="flex-1 bg-muted/20">
              <div className="p-4 space-y-3 min-h-full">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground text-center">
                      Aucun message
                    </p>
                    <p className="text-xs text-muted-foreground/70 text-center mt-1">
                      Soyez le premier à écrire !
                    </p>
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
                {/* Ancre invisible pour le scroll automatique vers le bas */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Zone de saisie améliorée */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2 items-center">
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un message..."
                  disabled={sendMessage.isPending}
                  className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl h-11"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageContent.trim() || sendMessage.isPending}
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0"
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