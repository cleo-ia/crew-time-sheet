import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarOff } from "lucide-react";

interface CongesButtonProps {
  onClick: () => void;
  pendingCount?: number;
  variant?: "default" | "outline" | "ghost";
}

export const CongesButton: React.FC<CongesButtonProps> = ({
  onClick,
  pendingCount = 0,
  variant = "outline",
}) => {
  return (
    <Button 
      variant={variant} 
      onClick={onClick}
      className="relative"
    >
      <CalendarOff className="h-4 w-4 mr-2" />
      Congés
      {pendingCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1 shadow-md">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      )}
    </Button>
  );
};
