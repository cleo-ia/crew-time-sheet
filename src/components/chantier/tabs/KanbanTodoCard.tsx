import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, AlertTriangle, Diamond } from "lucide-react";
import type { TodoChantier } from "@/hooks/useTodosChantier";

interface KanbanTodoCardProps {
  todo: TodoChantier;
  isOverdue: boolean;
  isDraggable?: boolean;
  onClick: () => void;
}

export const KanbanTodoCard = ({ todo, isOverdue, isDraggable = false, onClick }: KanbanTodoCardProps) => {

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("todoId", todo.id);
    e.dataTransfer.setData("todoChanterId", todo.chantier_id);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  };

  const getDateMessage = () => {
    if (!todo.date_echeance) return null;
    
    if (todo.statut === "TERMINE") {
      return `Terminé`;
    }
    if (isOverdue) {
      return `Devait être fait le ${formatDate(todo.date_echeance)}`;
    }
    return `Échéance le ${formatDate(todo.date_echeance)}`;
  };

  // Border color based on status
  const getBorderColor = () => {
    if (isOverdue) return "border-l-red-500";
    switch (todo.statut) {
      case "EN_COURS":
        return "border-l-amber-500";
      case "TERMINE":
        return "border-l-green-500";
      default:
        return "border-l-blue-500";
    }
  };

  const dateMessage = getDateMessage();

  return (
    <Card 
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 bg-card border-l-4 ${getBorderColor()} group ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {todo.afficher_planning && (
              <Diamond className="h-3 w-3 text-gray-500 fill-gray-500 shrink-0" />
            )}
            <h4 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {todo.nom}
            </h4>
          </div>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs shrink-0 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Retard
            </Badge>
          )}
        </div>

        {/* Date info */}
        {dateMessage && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateMessage}</span>
          </div>
        )}

        {/* Description preview */}
        {todo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {todo.description}
          </p>
        )}

        {/* Footer with priority badge */}
        {todo.priorite === "HAUTE" && (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            Priorité haute
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
