import { useMemo } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { TacheChantier } from "@/hooks/useTachesChantier";
import { useUpdateTache } from "@/hooks/useUpdateTache";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { ZoomLevel } from "./EmptyGanttGrid";

interface GanttChartProps {
  taches: TacheChantier[];
  chantierId: string;
  zoomLevel: ZoomLevel;
  onTaskClick: (tache: TacheChantier) => void;
  showDates?: boolean;
}

// Map our status to progress percentage for visual display
const getProgressFromStatus = (statut: TacheChantier["statut"]): number => {
  switch (statut) {
    case "TERMINE":
      return 100;
    case "EN_COURS":
      return 50;
    case "EN_RETARD":
      return 25;
    case "A_FAIRE":
    default:
      return 0;
  }
};

// Get bar color based on status and custom color
const getBarStyles = (tache: TacheChantier): { backgroundColor: string; progressColor: string } => {
  const baseColor = tache.couleur || "#3b82f6";
  
  // Check if task is late (end date passed and not completed)
  const today = startOfDay(new Date());
  const endDate = parseISO(tache.date_fin);
  const isLate = isAfter(today, endDate) && tache.statut !== "TERMINE";
  
  if (isLate || tache.statut === "EN_RETARD") {
    return { backgroundColor: "#ef4444", progressColor: "#dc2626" };
  }
  
  return { backgroundColor: baseColor, progressColor: baseColor };
};

// Convert our zoom level to gantt-task-react ViewMode
const getViewModeFromZoom = (zoomLevel: ZoomLevel): ViewMode => {
  switch (zoomLevel) {
    case "month":
      return ViewMode.Day;
    case "quarter":
      return ViewMode.Week;
    case "semester":
      return ViewMode.Month;
    case "year":
      return ViewMode.Month;
    default:
      return ViewMode.Day;
  }
};

// Get column width based on zoom level
const getColumnWidth = (zoomLevel: ZoomLevel): number => {
  switch (zoomLevel) {
    case "month":
      return 32;
    case "quarter":
      return 80;
    case "semester":
      return 150;
    case "year":
      return 300;
    default:
      return 32;
  }
};

export const GanttChart = ({ taches, chantierId, zoomLevel, onTaskClick, showDates = true }: GanttChartProps) => {
  const updateTache = useUpdateTache();
  const viewMode = getViewModeFromZoom(zoomLevel);
  const columnWidth = getColumnWidth(zoomLevel);

  // Convert our taches to gantt-task-react format
  const tasks: Task[] = useMemo(() => {
    return taches.map((tache) => {
      const styles = getBarStyles(tache);
      return {
        id: tache.id,
        name: tache.nom,
        start: parseISO(tache.date_debut),
        end: parseISO(tache.date_fin),
        progress: getProgressFromStatus(tache.statut),
        type: "task" as const,
        styles: {
          backgroundColor: styles.backgroundColor,
          backgroundSelectedColor: styles.backgroundColor,
          progressColor: styles.progressColor,
          progressSelectedColor: styles.progressColor,
        },
      };
    });
  }, [taches]);

  // Handle date change from drag & drop or resize
  const handleDateChange = async (task: Task) => {
    const tache = taches.find((t) => t.id === task.id);
    if (!tache) return;

    await updateTache.mutateAsync({
      id: task.id,
      chantier_id: chantierId,
      date_debut: format(task.start, "yyyy-MM-dd"),
      date_fin: format(task.end, "yyyy-MM-dd"),
    });
  };

  // Handle click on task bar
  const handleClick = (task: Task) => {
    const tache = taches.find((t) => t.id === task.id);
    if (tache) {
      onTaskClick(tache);
    }
  };

  // Handle progress change (not used but required by lib)
  const handleProgressChange = async (task: Task) => {
    // We don't update progress directly, it's derived from status
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="gantt-wrapper overflow-x-auto">
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        onDateChange={handleDateChange}
        onProgressChange={handleProgressChange}
        onClick={handleClick}
        columnWidth={columnWidth}
        listCellWidth=""
        rowHeight={50}
        barCornerRadius={4}
        todayColor="rgba(239, 68, 68, 0.1)"
        locale="fr"
        barFill={60}
      />
    </div>
  );
};
