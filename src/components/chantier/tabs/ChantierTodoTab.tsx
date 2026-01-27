import { useState } from "react";
import { Plus, ListTodo, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTodosChantier, TodoChantier } from "@/hooks/useTodosChantier";
import { useUpdateTodo } from "@/hooks/useUpdateTodo";
import { TodoFormDialog } from "./TodoFormDialog";
import { TodoDetailDialog } from "./TodoDetailDialog";
import { KanbanTodoCard } from "./KanbanTodoCard";

interface ChantierTodoTabProps {
  chantierId: string;
  readOnly?: boolean;
}

type TodoStatus = "A_FAIRE" | "EN_COURS" | "TERMINE";
type ComputedTodoStatus = "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD";

// Calcule le statut dynamique d'un todo basé sur sa date d'échéance
const getComputedTodoStatus = (todo: TodoChantier): ComputedTodoStatus => {
  // Si terminé, toujours terminé
  if (todo.statut === "TERMINE") return "TERMINE";
  
  // Si pas de date d'échéance, utiliser le statut stocké
  if (!todo.date_echeance) return todo.statut;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(todo.date_echeance);
  dueDate.setHours(0, 0, 0, 0);
  
  // Date d'échéance passée → En retard
  if (dueDate < today) return "EN_RETARD";
  
  // Date d'échéance = aujourd'hui → En cours
  if (dueDate.getTime() === today.getTime()) return "EN_COURS";
  
  // Date d'échéance dans le futur → À faire
  return "A_FAIRE";
};

interface KanbanColumn {
  id: TodoStatus;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  headerBg: string;
  todos: TodoChantier[];
}

export const ChantierTodoTab = ({ chantierId, readOnly = false }: ChantierTodoTabProps) => {
  const { data: todos = [], isLoading } = useTodosChantier(chantierId);
  const updateTodo = useUpdateTodo();
  const [selectedTodo, setSelectedTodo] = useState<TodoChantier | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<TodoStatus | null>(null);

  const columns: KanbanColumn[] = [
    {
      id: "A_FAIRE",
      title: "À faire",
      icon: <ListTodo className="h-4 w-4" />,
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
      headerBg: "bg-gradient-to-r from-blue-500/10 to-blue-500/5",
      todos: todos.filter((t) => getComputedTodoStatus(t) === "A_FAIRE"),
    },
    {
      id: "EN_COURS",
      title: "En cours",
      icon: <Clock className="h-4 w-4" />,
      colorClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
      headerBg: "bg-gradient-to-r from-amber-500/10 to-amber-500/5",
      todos: todos.filter((t) => {
        const computed = getComputedTodoStatus(t);
        return computed === "EN_COURS" || computed === "EN_RETARD";
      }),
    },
    {
      id: "TERMINE",
      title: "Terminé",
      icon: <CheckCircle2 className="h-4 w-4" />,
      colorClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-50/50 dark:bg-green-950/20",
      headerBg: "bg-gradient-to-r from-green-500/10 to-green-500/5",
      todos: todos.filter((t) => getComputedTodoStatus(t) === "TERMINE"),
    },
  ];

  const handleTodoClick = (todo: TodoChantier) => {
    setSelectedTodo(todo);
    setIsDetailOpen(true);
  };

  const isOverdue = (todo: TodoChantier) => {
    return getComputedTodoStatus(todo) === "EN_RETARD";
  };

  const handleDragOver = (e: React.DragEvent, columnId: TodoStatus) => {
    e.preventDefault();
    if (columnId === "EN_COURS" || columnId === "TERMINE") {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TodoStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (targetStatus !== "EN_COURS" && targetStatus !== "TERMINE") return;
    
    const todoId = e.dataTransfer.getData("todoId");
    const todoChanterId = e.dataTransfer.getData("todoChanterId");
    
    if (!todoId || !todoChanterId) return;
    
    updateTodo.mutate({
      id: todoId,
      chantier_id: todoChanterId,
      statut: targetStatus
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement des todos...</p>
        </div>
      </div>
    );
  }

  const totalTodos = todos.length;

  return (
    <>
      {/* Stats header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalTodos} todo{totalTodos > 1 ? 's' : ''} au total
          </span>
        </div>
        {!readOnly && (
          <Button 
            size="sm" 
            onClick={() => setIsFormOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau todo
          </Button>
        )}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map((column, index) => {
          const isDropTarget = column.id === "EN_COURS" || column.id === "TERMINE";
          const isDraggedOver = dragOverColumn === column.id;
          
          return (
          <div 
            key={column.id} 
            className={`flex flex-col rounded-xl border overflow-hidden ${column.bgClass} animate-fade-in transition-all duration-200 ${
              isDraggedOver 
                ? 'border-2 border-primary ring-2 ring-primary/20' 
                : 'border-border/50'
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
            onDragOver={isDropTarget ? (e) => handleDragOver(e, column.id) : undefined}
            onDragLeave={isDropTarget ? handleDragLeave : undefined}
            onDrop={isDropTarget ? (e) => handleDrop(e, column.id) : undefined}
          >
            {/* Column header */}
            <div className={`px-4 py-3.5 ${column.headerBg} border-b border-border/30`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2.5 ${column.colorClass}`}>
                  {column.icon}
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${column.bgClass} ${column.colorClass}`}>
                  {column.todos.length}
                </span>
              </div>
            </div>

            {/* Todos list */}
            <div className="flex-1">
              <div className="p-3 space-y-3">
                {column.todos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className={`p-3 rounded-full ${column.bgClass} mb-3`}>
                      {column.icon}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Aucun élément
                    </p>
                  </div>
                ) : (
                  column.todos.map((todo, todoIndex) => (
                    <div 
                      key={todo.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${(index * 100) + (todoIndex * 50)}ms` }}
                    >
                      <KanbanTodoCard
                        todo={todo}
                        isOverdue={isOverdue(todo)}
                        isDraggable={!readOnly && (column.id === "EN_COURS" || column.id === "TERMINE")}
                        onClick={() => handleTodoClick(todo)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add todo button - only in "À faire" column */}
            {column.id === "A_FAIRE" && !readOnly && (
              <div className="p-3 border-t border-border/30">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`w-full justify-center gap-2 hover:${column.bgClass} ${column.colorClass} hover:text-blue-700 dark:hover:text-blue-300 transition-colors`}
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un todo
                </Button>
              </div>
            )}
          </div>
        )})}
      </div>

      {/* Dialogs */}
      {!readOnly && (
        <TodoFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          chantierId={chantierId}
        />
      )}

      {selectedTodo && (
        <TodoDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          todo={selectedTodo}
          readOnly={readOnly}
        />
      )}
    </>
  );
};
