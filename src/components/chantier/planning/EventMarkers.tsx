import { useMemo, useState, useCallback } from "react";
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

// Priority colors for the diamond marker
const getPriorityColor = (priorite: string | null): string => {
  switch (priorite) {
    case "HAUTE": return "bg-red-500";
    case "BASSE": return "bg-gray-400";
    default: return "bg-gray-600";
  }
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

  // Drag state
  const [dragState, setDragState] = useState<{
    todoId: string;
    startX: number;
    originalOffset: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [justDragged, setJustDragged] = useState(false);

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
    setDragState({
      todoId,
      startX: e.clientX,
      originalOffset
    });
    setDragOffset(0);
    setJustDragged(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    setDragOffset(deltaX);
    if (Math.abs(deltaX) > 5) {
      setJustDragged(true);
    }
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

    const daysMoved = Math.round(dragOffset / dayWidth);
    
    if (daysMoved !== 0) {
      const event = events.find(e => e.todo.id === dragState.todoId);
      if (event) {
        const newDate = addDays(event.echeanceDate, daysMoved);
        updateTodo.mutate({
          id: event.todo.id,
          chantier_id: event.todo.chantier_id,
          date_echeance: format(newDate, "yyyy-MM-dd")
        });
      }
    }

    setDragState(null);
    setDragOffset(0);
    
    // Reset justDragged after a short delay
    setTimeout(() => setJustDragged(false), 100);
  }, [dragState, dragOffset, dayWidth, events, updateTodo]);

  const handleClick = useCallback((e: React.MouseEvent, todo: TodoChantier) => {
    if (justDragged) {
      e.stopPropagation();
      return;
    }
    onEventClick(todo);
  }, [justDragged, onEventClick]);

  if (events.length === 0) return null;

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none z-20"
      style={{ top: tasksCount * ROW_HEIGHT }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {events.map((event, idx) => {
        const isDragging = dragState?.todoId === event.todo.id;
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
              className={`w-3.5 h-3.5 ${getPriorityColor(event.todo.priorite)} rotate-45 shadow-md group-hover:scale-110 transition-transform`}
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