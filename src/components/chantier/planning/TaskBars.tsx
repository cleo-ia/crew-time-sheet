import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { TacheChantier } from "@/hooks/useTachesChantier";
import { parseISO, differenceInDays, isAfter, startOfDay, addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ZoomLevel } from "./EmptyGanttGrid";
import { useUpdateTache } from "@/hooks/useUpdateTache";
import { toast } from "sonner";

interface TaskBarsProps {
  taches: TacheChantier[];
  startDate: Date;
  zoomLevel: ZoomLevel;
  onTaskClick: (tache: TacheChantier) => void;
  chantierId: string;
  scrollLeft?: number;
}

const getDayWidth = (zoomLevel: ZoomLevel): number => {
  switch (zoomLevel) {
    case "month": return 32;
    case "quarter": return 20;
    case "semester": return 6;
    case "year": return 3;
    default: return 32;
  }
};

const getStatusInfo = (statut: TacheChantier["statut"], isLate: boolean, isOngoing: boolean) => {
  if (isLate || statut === "EN_RETARD") {
    return { label: "En retard", color: "bg-red-500", textColor: "text-red-700", badgeBg: "bg-red-100" };
  }
  if (statut === "TERMINE") {
    return { label: "Terminé", color: "bg-green-500", textColor: "text-green-700", badgeBg: "bg-green-100" };
  }
  // Si la tâche est en cours (date du jour comprise entre début et fin)
  if (isOngoing || statut === "EN_COURS") {
    return { label: "En cours", color: "bg-orange-400", textColor: "text-orange-700", badgeBg: "bg-orange-100" };
  }
  // À venir (pas encore commencé)
  return { label: "À venir", color: "bg-gray-400", textColor: "text-gray-700", badgeBg: "bg-gray-100" };
};

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 32;
const BAR_VERTICAL_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;

export const TaskBars = ({
  taches, 
  startDate, 
  zoomLevel, 
  onTaskClick,
  chantierId,
  scrollLeft = 0,
}: TaskBarsProps) => {
  const dayWidth = getDayWidth(zoomLevel);
  const today = startOfDay(new Date());
  const updateTache = useUpdateTache();
  
  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; taskLeft: number; taskRow: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false); // Persists slightly longer to block click
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort tasks by ordre field first, then by start date
  const sortedTaches = useMemo(() => {
    return [...taches].sort((a, b) => {
      // Primary sort by ordre
      if (a.ordre !== b.ordre) return a.ordre - b.ordre;
      // Secondary sort by start date
      return differenceInDays(parseISO(a.date_debut), parseISO(b.date_debut));
    });
  }, [taches]);

  // Calculate task positions - each task gets its own row based on ordre
  const taskPositions = useMemo(() => {
    const positions: Array<{
      tache: TacheChantier;
      left: number;
      width: number;
      row: number;
      isLate: boolean;
      isOngoing: boolean;
    }> = [];

    sortedTaches.forEach((tache, index) => {
      const taskStartDate = parseISO(tache.date_debut);
      const taskEndDate = parseISO(tache.date_fin);
      
      const startDayIndex = differenceInDays(taskStartDate, startDate);
      const endDayIndex = differenceInDays(taskEndDate, startDate);
      const duration = endDayIndex - startDayIndex + 1;

      const left = startDayIndex * dayWidth;
      const width = Math.max(duration * dayWidth, dayWidth);

      const isLate = isAfter(today, taskEndDate) && tache.statut !== "TERMINE";
      const isOngoing = !isAfter(taskStartDate, today) && !isAfter(today, taskEndDate) && tache.statut !== "TERMINE";

      positions.push({
        tache,
        left,
        width,
        row: index, // Each task gets its own row
        isLate,
        isOngoing,
      });
    });

    return positions;
  }, [sortedTaches, startDate, dayWidth, today]);

  const handleMouseDown = useCallback((e: React.MouseEvent, tache: TacheChantier, currentLeft: number, currentRow: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDraggedTaskId(tache.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY, taskLeft: currentLeft, taskRow: currentRow };
    isDraggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !draggedTaskId) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    // Mark as dragging if moved more than 5px
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDraggingRef.current = true;
    }
    
    // Snap to grid: days horizontally, rows vertically
    const snappedX = Math.round(dx / dayWidth) * dayWidth;
    const snappedY = Math.round(dy / ROW_HEIGHT) * ROW_HEIGHT;
    
    setDragOffset({ x: snappedX, y: snappedY });
  }, [draggedTaskId, dayWidth]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !draggedTaskId) {
      setDraggedTaskId(null);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    const dx = dragOffset.x;
    const dy = dragOffset.y;
    
    // Only process if actually dragged
    if (isDraggingRef.current) {
      const draggedTask = taches.find(t => t.id === draggedTaskId);
      if (draggedTask) {
        // Calculate day shift from horizontal movement
        const dayShift = Math.round(dx / dayWidth);
        
        // Calculate row shift from vertical movement
        const rowShift = Math.round(dy / ROW_HEIGHT);
        
        const hasHorizontalChange = dayShift !== 0;
        const hasVerticalChange = rowShift !== 0;
        
        if (hasHorizontalChange || hasVerticalChange) {
          const currentTaskStart = parseISO(draggedTask.date_debut);
          const currentTaskEnd = parseISO(draggedTask.date_fin);
          
          // Calculate new dates
          const newStartDate = addDays(currentTaskStart, dayShift);
          const newEndDate = addDays(currentTaskEnd, dayShift);
          
          // Calculate new ordre based on row position
          const currentIndex = sortedTaches.findIndex(t => t.id === draggedTaskId);
          let newIndex = currentIndex + rowShift;
          newIndex = Math.max(0, Math.min(newIndex, sortedTaches.length - 1));
          
          // If vertical change, we need to reorder
          if (hasVerticalChange && newIndex !== currentIndex) {
            // Update ordre for all affected tasks
            const reorderedTasks = [...sortedTaches];
            const [movedTask] = reorderedTasks.splice(currentIndex, 1);
            reorderedTasks.splice(newIndex, 0, movedTask);
            
            // Update all tasks with their new ordre
            reorderedTasks.forEach((task, idx) => {
              const updates: any = { id: task.id, chantier_id: chantierId, ordre: idx };
              
              // Also update dates if this is the dragged task and dates changed
              if (task.id === draggedTaskId && hasHorizontalChange) {
                updates.date_debut = format(newStartDate, "yyyy-MM-dd");
                updates.date_fin = format(newEndDate, "yyyy-MM-dd");
              }
              
              if (task.ordre !== idx || task.id === draggedTaskId) {
                updateTache.mutate(updates);
              }
            });
            
            toast.success("Tâche déplacée");
          } else if (hasHorizontalChange) {
            // Only horizontal change
            updateTache.mutate({
              id: draggedTask.id,
              chantier_id: chantierId,
              date_debut: format(newStartDate, "yyyy-MM-dd"),
              date_fin: format(newEndDate, "yyyy-MM-dd"),
            });
            toast.success("Dates modifiées");
          }
        }
      }
    }
    
    setDraggedTaskId(null);
    setDragOffset({ x: 0, y: 0 });
    dragStartRef.current = null;
    
    // Keep justDraggedRef true briefly to block click event
    if (isDraggingRef.current) {
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 100);
    }
    isDraggingRef.current = false;
  }, [draggedTaskId, dragOffset, taches, sortedTaches, dayWidth, chantierId, updateTache]);

  // Handle click separately to avoid triggering on drag
  const handleClick = useCallback((e: React.MouseEvent, tache: TacheChantier) => {
    // Block click if we just finished dragging
    if (!justDraggedRef.current) {
      onTaskClick(tache);
    }
  }, [onTaskClick]);

  // Add global mouse event listeners
  useEffect(() => {
    if (draggedTaskId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggedTaskId, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {taskPositions.map(({ tache, left, width, row, isLate, isOngoing }) => {
        const statusInfo = getStatusInfo(tache.statut, isLate, isOngoing);
        const top = row * ROW_HEIGHT + BAR_VERTICAL_PADDING;
        const isDragging = draggedTaskId === tache.id;
        
        // Apply drag offset if dragging this task
        const displayLeft = isDragging ? left + dragOffset.x : left;
        const displayTop = isDragging ? top + dragOffset.y : top;

        // Calculate sticky label offset
        const barStart = displayLeft;
        const barEnd = displayLeft + width;
        const isPartiallyHidden = barStart < scrollLeft;
        const isStillVisible = barEnd > scrollLeft;
        
        let labelOffset = 0;
        if (isPartiallyHidden && isStillVisible && !isDragging) {
          // Offset = how much the bar is hidden + small padding
          labelOffset = Math.min(scrollLeft - barStart, width - 120); // Keep at least 120px for content
          labelOffset = Math.max(0, labelOffset);
        }

        // Calculate visible portion of the bar
        const visibleLeft = Math.max(0, scrollLeft - barStart);
        const visibleWidth = Math.max(0, Math.min(width - visibleLeft, barEnd - scrollLeft));
        
        return (
          <div
            key={tache.id}
            className={`absolute rounded-md pointer-events-auto transition-shadow ${statusInfo.color} ${
              isDragging ? "opacity-80 shadow-lg z-50 cursor-grabbing" : "cursor-grab hover:brightness-95 hover:shadow-md"
            }`}
            style={{
              left: `${displayLeft}px`,
              top: `${displayTop}px`,
              width: `${width}px`,
              height: `${BAR_HEIGHT}px`,
              transition: isDragging ? "none" : "box-shadow 0.2s",
            }}
            onMouseDown={(e) => handleMouseDown(e, tache, left, row)}
            onClick={(e) => handleClick(e, tache)}
          >
            {/* Label container with sticky behavior */}
            <div 
              className="absolute inset-y-0 flex items-center gap-2 select-none whitespace-nowrap overflow-hidden"
              style={{ 
                left: `${labelOffset}px`,
                right: 0,
                paddingLeft: '8px',
                paddingRight: '8px',
              }}
            >
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
