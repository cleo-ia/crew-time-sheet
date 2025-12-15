import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface ConversationButtonProps {
  onClick: () => void;
  unreadCount?: number;
  variant?: "default" | "outline" | "ghost";
}

export const ConversationButton: React.FC<ConversationButtonProps> = ({
  onClick,
  unreadCount = 0,
  variant = "outline",
}) => {
  return (
    <Button 
      variant={variant} 
      onClick={onClick}
      className="relative"
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Conversation
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1 shadow-md">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
};
