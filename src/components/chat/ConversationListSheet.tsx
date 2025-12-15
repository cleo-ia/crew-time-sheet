import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { ConversationSheet } from "./ConversationSheet";
import { Badge } from "@/components/ui/badge";

interface ConversationListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export const ConversationListSheet: React.FC<ConversationListSheetProps> = ({
  open,
  onOpenChange,
  currentUserId,
}) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  const [selectedChantier, setSelectedChantier] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  // Récupérer tous les chantiers de l'entreprise
  const { data: chantiers, isLoading } = useQuery({
    queryKey: ["chantiers-for-chat", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("chantiers")
        .select("id, nom, code_chantier, actif")
        .eq("entreprise_id", entrepriseId)
        .eq("actif", true)
        .order("nom");

      if (error) {
        console.error("Erreur récupération chantiers:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!entrepriseId && open,
  });

  const { data: unreadData } = useUnreadMessages(currentUserId);

  if (selectedChantier) {
    return (
      <ConversationSheet
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedChantier(null);
          }
          onOpenChange(isOpen);
        }}
        chantierId={selectedChantier.id}
        chantierNom={selectedChantier.nom}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="py-2">
              {!chantiers || chantiers.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8 px-4">
                  Aucun chantier actif
                </div>
              ) : (
                chantiers.map((chantier) => {
                  const unreadCount = unreadData?.byChantier.get(chantier.id) || 0;

                  return (
                    <button
                      key={chantier.id}
                      onClick={() =>
                        setSelectedChantier({ id: chantier.id, nom: chantier.nom })
                      }
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left border-b border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{chantier.nom}</div>
                        {chantier.code_chantier && (
                          <div className="text-xs text-muted-foreground">
                            {chantier.code_chantier}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {unreadCount}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
