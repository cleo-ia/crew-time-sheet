import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, AlertTriangle, Diamond, CheckCircle } from "lucide-react";
import type { TodoChantier } from "@/hooks/useTodosChantier";
import { useUpdateTodo } from "@/hooks/useUpdateTodo";

interface KanbanTodoCardProps {
  todo: TodoChantier;
  isOverdue: boolean;
  showValidateButton?: boolean;
  onClick: () => void;
}

export const KanbanTodoCard = ({ todo, isOverdue, showValidateButton, onClick }: KanbanTodoCardProps) => {
  const updateTodo = useUpdateTodo();

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

  const handleValidate = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTodo.mutate({
      id: todo.id,
      chantier_id: todo.chantier_id,
      statut: "TERMINE"
    });
  };

  const dateMessage = getDateMessage();

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 bg-card border-l-4 ${getBorderColor()} group`}
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

        {/* Footer with priority badge and validate button */}
        <div className="flex items-center justify-between gap-2">
          {todo.priorite === "HAUTE" ? (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
              Priorité haute
            </Badge>
          ) : (
            <div />
          )}
          
          {showValidateButton && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={handleValidate}
              disabled={updateTodo.isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Valider
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
