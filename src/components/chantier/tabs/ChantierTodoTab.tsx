import { useState } from "react";
import { Plus, ListTodo, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTodosChantier, TodoChantier } from "@/hooks/useTodosChantier";
import { TodoFormDialog } from "./TodoFormDialog";
import { TodoDetailDialog } from "./TodoDetailDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChantierTodoTabProps {
  chantierId: string;
}

type TodoStatus = "A_FAIRE" | "EN_COURS" | "TERMINE";

interface KanbanColumn {
  id: TodoStatus;
  title: string;
  icon: React.ElementType;
  todos: TodoChantier[];
}

const priorityConfig = {
  HAUTE: { label: "Haute", className: "bg-destructive/10 text-destructive border-destructive/20" },
  NORMALE: { label: "Normale", className: "bg-muted text-muted-foreground" },
  BASSE: { label: "Basse", className: "bg-muted/50 text-muted-foreground/70" },
};

export const ChantierTodoTab = ({ chantierId }: ChantierTodoTabProps) => {
  const { data: todos = [], isLoading } = useTodosChantier(chantierId);
  const [selectedTodo, setSelectedTodo] = useState<TodoChantier | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns: KanbanColumn[] = [
    {
      id: "A_FAIRE",
      title: "À faire",
      icon: ListTodo,
      todos: todos.filter((t) => t.statut === "A_FAIRE"),
    },
    {
      id: "EN_COURS",
      title: "En cours",
      icon: Clock,
      todos: todos.filter((t) => t.statut === "EN_COURS"),
    },
    {
      id: "TERMINE",
      title: "Terminé",
      icon: CheckCircle2,
      todos: todos.filter((t) => t.statut === "TERMINE"),
    },
  ];

  const handleTodoClick = (todo: TodoChantier) => {
    setSelectedTodo(todo);
    setIsDetailOpen(true);
  };

  const isOverdue = (todo: TodoChantier) => {
    if (!todo.date_echeance || todo.statut === "TERMINE") return false;
    return new Date(todo.date_echeance) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <div key={column.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">{column.title}</h3>
                  <Badge variant="secondary" className="ml-1">
                    {column.todos.length}
                  </Badge>
                </div>
                {column.id === "A_FAIRE" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Column Content */}
              <div className="space-y-2 min-h-[200px]">
                {column.todos.length === 0 ? (
                  <div className="flex items-center justify-center h-[100px] border-2 border-dashed rounded-lg text-muted-foreground/50 text-sm">
                    Aucun élément
                  </div>
                ) : (
                  column.todos.map((todo) => (
                    <Card
                      key={todo.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTodoClick(todo)}
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Priority & Overdue */}
                        <div className="flex items-center gap-2">
                          {isOverdue(todo) && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              En retard
                            </Badge>
                          )}
                          {todo.priorite && todo.priorite !== "NORMALE" && (
                            <Badge className={priorityConfig[todo.priorite].className}>
                              {priorityConfig[todo.priorite].label}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <p className="font-medium text-sm line-clamp-2">{todo.nom}</p>

                        {/* Description preview */}
                        {todo.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {todo.description}
                          </p>
                        )}

                        {/* Due date */}
                        {todo.date_echeance && (
                          <p className={`text-xs ${isOverdue(todo) ? "text-destructive" : "text-muted-foreground"}`}>
                            Échéance: {format(new Date(todo.date_echeance), "d MMM yyyy", { locale: fr })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <TodoFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        chantierId={chantierId}
      />

      {selectedTodo && (
        <TodoDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          todo={selectedTodo}
        />
      )}
    </div>
  );
};
