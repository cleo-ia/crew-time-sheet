import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { differenceInDays, format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { TodoChantier } from "@/hooks/useTodosChantier";
import { useUpdateTodo } from "@/hooks/useUpdateTodo";
import { ZoomLevel } from "./EmptyGanttGrid";

interface EventMarkersProps {
  todos: TodoChantier[];
  startDate: Date;
  zoomLevel: ZoomLevel;
  onEventClick: (todo: TodoChantier) => void;
  tasksCount: number;
}

const ROW_HEIGHT = 48;

const getDayWidth = (zoomLevel: ZoomLevel): number => {
  switch (zoomLevel) {
    case "month": return 32;
    case "quarter": return 20;
    case "semester": return 6;
    case "year": return 3;
    default: return 32;
  }
};

// Status-based colors for the diamond marker (matches task status logic)
const getStatusColor = (todo: TodoChantier): string => {
  // Si terminé → Vert
  if (todo.statut === "TERMINE") return "bg-green-500";
  
  // Sans date d'échéance → Gris
  if (!todo.date_echeance) return "bg-gray-400";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(todo.date_echeance);
  dueDate.setHours(0, 0, 0, 0);
  
  // Date passée → Rouge (en retard)
  if (dueDate < today) return "bg-red-500";
  
  // Date = aujourd'hui → Orange (en cours)
  if (dueDate.getTime() === today.getTime()) return "bg-orange-400";
  
  // Date future → Gris (à venir)
  return "bg-gray-400";
};

export const EventMarkers = ({ 
  todos, 
  startDate, 
  zoomLevel, 
  onEventClick,
  tasksCount 
}: EventMarkersProps) => {
  const dayWidth = getDayWidth(zoomLevel);
  const updateTodo = useUpdateTodo();

  // Drag state - using refs like TaskBars.tsx
  const dragStartRef = useRef<{ todoId: string; startX: number; originalOffset: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Filter todos that have date_echeance and afficher_planning
  const events = useMemo(() => {
    return todos
      .filter(t => t.afficher_planning && t.date_echeance)
      .map(todo => {
        const echeanceDate = new Date(todo.date_echeance!);
        const dayOffset = differenceInDays(echeanceDate, startDate);
        return { todo, dayOffset, echeanceDate };
      })
      .sort((a, b) => a.dayOffset - b.dayOffset);
  }, [todos, startDate]);

  const handleMouseDown = useCallback((e: React.MouseEvent, todoId: string, originalOffset: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartRef.current = {
      todoId,
      startX: e.clientX,
      originalOffset
    };
    isDraggingRef.current = false;
    justDraggedRef.current = false;
    setDraggedTodoId(todoId);
    setDragOffset(0);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !draggedTodoId) return;
    
    const deltaX = e.clientX - dragStartRef.current.startX;
    
    if (Math.abs(deltaX) > 5) {
      isDraggingRef.current = true;
    }
    
    // Snap to grid
    const snappedX = Math.round(deltaX / dayWidth) * dayWidth;
    setDragOffset(snappedX);
  }, [draggedTodoId, dayWidth]);

  const handleMouseUp = useCallback(() => {
    if (!dragStartRef.current || !draggedTodoId) {
      setDraggedTodoId(null);
      setDragOffset(0);
      return;
    }

    if (isDraggingRef.current) {
      const daysMoved = Math.round(dragOffset / dayWidth);
      
      if (daysMoved !== 0) {
        const event = events.find(e => e.todo.id === draggedTodoId);
        if (event) {
          const newDate = addDays(event.echeanceDate, daysMoved);
          updateTodo.mutate({
            id: event.todo.id,
            chantier_id: event.todo.chantier_id,
            date_echeance: format(newDate, "yyyy-MM-dd")
          });
        }
      }
      
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 100);
    }

    setDraggedTodoId(null);
    setDragOffset(0);
    dragStartRef.current = null;
    isDraggingRef.current = false;
  }, [draggedTodoId, dragOffset, dayWidth, events, updateTodo]);

  // Global event listeners - same pattern as TaskBars.tsx
  useEffect(() => {
    if (draggedTodoId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggedTodoId, handleMouseMove, handleMouseUp]);

  const handleClick = useCallback((e: React.MouseEvent, todo: TodoChantier) => {
    if (justDraggedRef.current) {
      e.stopPropagation();
      return;
    }
    onEventClick(todo);
  }, [onEventClick]);

  if (events.length === 0) return null;

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none z-20"
      style={{ top: tasksCount * ROW_HEIGHT }}
    >
      {events.map((event, idx) => {
        const isDragging = draggedTodoId === event.todo.id;
        const currentDragOffset = isDragging ? dragOffset : 0;
        const leftPosition = event.dayOffset * dayWidth + dayWidth / 2 - 10 + currentDragOffset;
        const topPosition = idx * ROW_HEIGHT + (ROW_HEIGHT - 20) / 2;

        return (
          <div
            key={event.todo.id}
            className={`absolute pointer-events-auto group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              left: leftPosition,
              top: topPosition,
              height: 20,
              opacity: isDragging ? 0.8 : 1,
              transition: isDragging ? 'none' : 'opacity 0.2s'
            }}
            onMouseDown={(e) => handleMouseDown(e, event.todo.id, event.dayOffset)}
            onClick={(e) => handleClick(e, event.todo)}
          >
            {/* Diamond marker */}
            <div 
              className={`w-3.5 h-3.5 ${getStatusColor(event.todo)} rotate-45 shadow-md group-hover:scale-110 transition-transform`}
            />
            
            {/* Event label */}
            <div 
              className="absolute left-5 top-0 whitespace-nowrap flex items-center gap-2 h-3.5"
              style={{ transform: "translateY(0)" }}
            >
              <span className="text-sm font-medium text-foreground bg-background/80 px-1.5 py-0.5 rounded shadow-sm">
                {event.todo.nom}
              </span>
              <span className="text-xs text-muted-foreground bg-background/60 px-1 py-0.5 rounded">
                {format(event.echeanceDate, "d MMM", { locale: fr })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
