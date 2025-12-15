import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { HardHat, Truck, Wrench, User } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  authorName: string;
  authorRole?: string | null;
  createdAt: string;
  isOwnMessage: boolean;
}

const getRoleConfig = (role: string | null) => {
  switch (role) {
    case "chef":
      return { 
        label: "Chef", 
        icon: HardHat,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
      };
    case "conducteur":
      return { 
        label: "Conducteur", 
        icon: Truck,
        className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" 
      };
    case "finisseur":
      return { 
        label: "Finisseur", 
        icon: Wrench,
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
      };
    case "macon":
      return { 
        label: "Maçon", 
        icon: User,
        className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" 
      };
    default:
      return null;
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  authorName,
  authorRole,
  createdAt,
  isOwnMessage,
}) => {
  const roleConfig = getRoleConfig(authorRole);
  const formattedTime = format(new Date(createdAt), "HH:mm", { locale: fr });
  const formattedDate = format(new Date(createdAt), "d MMM", { locale: fr });

  return (
    <div className={cn(
      "flex flex-col gap-1.5 max-w-[85%]", 
      isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      {/* Header avec nom et rôle */}
      <div className={cn(
        "flex items-center gap-2 px-1",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}>
        <span className="text-xs font-medium text-foreground/80">{authorName}</span>
        {roleConfig && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
            roleConfig.className
          )}>
            <roleConfig.icon className="h-2.5 w-2.5" />
            {roleConfig.label}
          </span>
        )}
      </div>
      
      {/* Bulle de message */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-card text-foreground border border-border/50 rounded-tl-md"
        )}
      >
        {content}
      </div>
      
      {/* Timestamp */}
      <span className={cn(
        "text-[10px] text-muted-foreground/60 px-1",
        isOwnMessage ? "text-right" : "text-left"
      )}>
        {formattedDate} à {formattedTime}
      </span>
    </div>
  );
};
