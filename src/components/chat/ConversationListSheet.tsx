import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, ChevronRight, Building2, MessagesSquare } from "lucide-react";
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

  // Calculer le total des messages non lus
  const totalUnread = unreadData?.total || 0;

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
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 gap-0">
        {/* Header avec gradient */}
        <SheetHeader className="px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <MessagesSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold text-foreground">
                Conversations
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chantiers?.length || 0} chantier{(chantiers?.length || 0) > 1 ? 's' : ''} actif{(chantiers?.length || 0) > 1 ? 's' : ''}
                {totalUnread > 0 && (
                  <span className="text-primary font-medium"> • {totalUnread} non lu{totalUnread > 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {!chantiers || chantiers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm text-center">
                    Aucun chantier actif
                  </p>
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
                      className="w-full group relative rounded-xl border border-border/60 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 text-left overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3.5">
                        {/* Icône du chantier */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/70 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        
                        {/* Infos du chantier */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {chantier.nom}
                          </div>
                          {chantier.code_chantier && (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                              {chantier.code_chantier}
                            </div>
                          )}
                        </div>

                        {/* Badge non-lus et flèche */}
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="text-xs px-2 py-0.5 font-semibold animate-pulse"
                            >
                              {unreadCount}
                            </Badge>
                          )}
                          <div className="w-7 h-7 rounded-full bg-muted/50 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>

                      {/* Indicateur de messages non lus */}
                      {unreadCount > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive rounded-l-xl" />
                      )}
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
