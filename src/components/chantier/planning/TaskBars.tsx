import { useMemo } from "react";
import { TacheChantier } from "@/hooks/useTachesChantier";
import { parseISO, differenceInDays, isAfter, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ZoomLevel } from "./EmptyGanttGrid";

interface TaskBarsProps {
  taches: TacheChantier[];
  startDate: Date;
  zoomLevel: ZoomLevel;
  onTaskClick: (tache: TacheChantier) => void;
}

const getDayWidth = (zoomLevel: ZoomLevel): number => {
  switch (zoomLevel) {
    case "month": return 32;
    case "quarter": return 12;
    case "semester": return 6;
    case "year": return 3;
    default: return 32;
  }
};

const getStatusInfo = (statut: TacheChantier["statut"], isLate: boolean) => {
  if (isLate || statut === "EN_RETARD") {
    return { label: "En retard", color: "bg-red-500", textColor: "text-red-700", badgeBg: "bg-red-100" };
  }
  switch (statut) {
    case "TERMINE":
      return { label: "Terminé", color: "bg-green-500", textColor: "text-green-700", badgeBg: "bg-green-100" };
    case "EN_COURS":
      return { label: "En cours", color: "bg-orange-400", textColor: "text-orange-700", badgeBg: "bg-orange-100" };
    case "A_FAIRE":
    default:
      return { label: "À venir", color: "bg-gray-400", textColor: "text-gray-700", badgeBg: "bg-gray-100" };
  }
};

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 32;
const BAR_VERTICAL_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;

export const TaskBars = ({
  taches, 
  startDate, 
  zoomLevel, 
  onTaskClick,
}: TaskBarsProps) => {
  const dayWidth = getDayWidth(zoomLevel);
  const today = startOfDay(new Date());

  // Sort tasks by start date, then by duration (longer first) for better visual stacking
  const sortedTaches = useMemo(() => {
    return [...taches].sort((a, b) => {
      const startDiff = differenceInDays(parseISO(a.date_debut), parseISO(b.date_debut));
      if (startDiff !== 0) return startDiff;
      // If same start, longer tasks first
      const durationA = differenceInDays(parseISO(a.date_fin), parseISO(a.date_debut));
      const durationB = differenceInDays(parseISO(b.date_fin), parseISO(b.date_debut));
      return durationB - durationA;
    });
  }, [taches]);

  // Calculate task positions with row assignment to avoid overlaps
  const taskPositions = useMemo(() => {
    const positions: Array<{
      tache: TacheChantier;
      left: number;
      width: number;
      row: number;
      isLate: boolean;
    }> = [];

    // Track end positions per row to assign rows without overlap
    const rowEndDays: number[] = [];

    sortedTaches.forEach((tache) => {
      const taskStartDate = parseISO(tache.date_debut);
      const taskEndDate = parseISO(tache.date_fin);
      
      const startDayIndex = differenceInDays(taskStartDate, startDate);
      const endDayIndex = differenceInDays(taskEndDate, startDate);
      const duration = endDayIndex - startDayIndex + 1;

      const left = startDayIndex * dayWidth;
      const width = Math.max(duration * dayWidth, dayWidth); // Minimum 1 day width

      // Check if task is late
      const isLate = isAfter(today, taskEndDate) && tache.statut !== "TERMINE";

      // Find the first row where this task fits (doesn't overlap)
      let assignedRow = 0;
      for (let i = 0; i < rowEndDays.length; i++) {
        if (rowEndDays[i] < startDayIndex) {
          assignedRow = i;
          break;
        }
        assignedRow = i + 1;
      }

      // Update or add the end day for this row
      if (assignedRow < rowEndDays.length) {
        rowEndDays[assignedRow] = endDayIndex;
      } else {
        rowEndDays.push(endDayIndex);
      }

      positions.push({
        tache,
        left,
        width,
        row: assignedRow,
        isLate,
      });
    });

    return positions;
  }, [sortedTaches, startDate, dayWidth, today]);

  const totalRows = Math.max(1, ...taskPositions.map(p => p.row + 1));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {taskPositions.map(({ tache, left, width, row, isLate }) => {
        const statusInfo = getStatusInfo(tache.statut, isLate);
        const top = row * ROW_HEIGHT + BAR_VERTICAL_PADDING;

        return (
          <div
            key={tache.id}
            className={`absolute rounded-md cursor-pointer pointer-events-auto transition-all hover:brightness-95 hover:shadow-md ${statusInfo.color}`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${BAR_HEIGHT}px`,
            }}
            onClick={() => onTaskClick(tache)}
          >
            <div className="flex items-center gap-2 h-full px-2 overflow-hidden">
              <span className="text-white text-sm font-medium truncate">
                {tache.nom}
              </span>
              <Badge 
                variant="secondary" 
                className={`${statusInfo.badgeBg} ${statusInfo.textColor} text-xs shrink-0 border-0`}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};
