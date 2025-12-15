import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageBubbleProps {
  content: string;
  authorName: string;
  authorRole?: string | null;
  createdAt: string;
  isOwnMessage: boolean;
}

const getRoleBadge = (role: string | null) => {
  switch (role) {
    case "chef":
      return { label: "Chef", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
    case "conducteur":
      return { label: "Conducteur", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
    case "finisseur":
      return { label: "Finisseur", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
    case "macon":
      return { label: "Maçon", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" };
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
  const roleBadge = getRoleBadge(authorRole);
  const formattedTime = format(new Date(createdAt), "HH:mm", { locale: fr });
  const formattedDate = format(new Date(createdAt), "d MMM", { locale: fr });

  return (
    <div className={cn("flex flex-col gap-1 max-w-[80%]", isOwnMessage ? "ml-auto items-end" : "mr-auto items-start")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{authorName}</span>
        {roleBadge && (
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", roleBadge.className)}>
            {roleBadge.label}
          </span>
        )}
        <span>•</span>
        <span>{formattedDate} à {formattedTime}</span>
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {content}
      </div>
    </div>
  );
};
