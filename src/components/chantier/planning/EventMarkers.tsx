import { useMemo } from "react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { TodoChantier } from "@/hooks/useTodosChantier";
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

  if (events.length === 0) return null;

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none z-20"
      style={{ top: tasksCount * ROW_HEIGHT }}
    >
      {events.map((event, idx) => {
        const leftPosition = event.dayOffset * dayWidth + dayWidth / 2 - 10;
        const topPosition = idx * ROW_HEIGHT + (ROW_HEIGHT - 20) / 2;

        return (
          <div
            key={event.todo.id}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{
              left: leftPosition,
              top: topPosition,
              height: 20,
            }}
            onClick={() => onEventClick(event.todo)}
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