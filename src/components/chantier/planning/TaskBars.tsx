import { useMemo, useState, useCallback, useRef, useEffect, RefObject } from "react";
import { TacheChantier } from "@/hooks/useTachesChantier";
import { parseISO, differenceInDays, isAfter, startOfDay, addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ZoomLevel, EmptyGanttGridRef } from "./EmptyGanttGrid";
import { useUpdateTache } from "@/hooks/useUpdateTache";
import { toast } from "sonner";

interface TaskBarsProps {
  taches: TacheChantier[];
  startDate: Date;
  zoomLevel: ZoomLevel;
  onTaskClick: (tache: TacheChantier) => void;
  chantierId: string;
  scrollContainerRef?: RefObject<EmptyGanttGridRef>;
  readOnly?: boolean;
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
  if (isOngoing || statut === "EN_COURS") {
    return { label: "En cours", color: "bg-orange-400", textColor: "text-orange-700", badgeBg: "bg-orange-100" };
  }
  return { label: "À venir", color: "bg-gray-400", textColor: "text-gray-700", badgeBg: "bg-gray-100" };
};

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 32;
const BAR_VERTICAL_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;

// AABB intersection check
const rectsIntersect = (
  r1: { left: number; top: number; right: number; bottom: number },
  r2: { left: number; top: number; right: number; bottom: number }
) => {
  return r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top;
};

export const TaskBars = ({
  taches,
  startDate,
  zoomLevel,
  onTaskClick,
  chantierId,
  scrollContainerRef,
  readOnly = false,
}: TaskBarsProps) => {
  const dayWidth = getDayWidth(zoomLevel);
  const today = startOfDay(new Date());
  const updateTache = useUpdateTache();

  // Scroll state
  const [scrollLeft, setScrollLeft] = useState(0);

  // Selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Lasso state
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lassoStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const isLassoingRef = useRef(false);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; taskLeft: number; taskRow: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen to scroll
  useEffect(() => {
    const container = scrollContainerRef?.current?.getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      setScrollLeft(container.scrollLeft);
    };

    setScrollLeft(container.scrollLeft);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, scrollContainerRef?.current]);

  // Sort tasks
  const sortedTaches = useMemo(() => {
    return [...taches].sort((a, b) => {
      if (a.ordre !== b.ordre) return a.ordre - b.ordre;
      return differenceInDays(parseISO(a.date_debut), parseISO(b.date_debut));
    });
  }, [taches]);

  // Calculate task positions
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

      positions.push({ tache, left, width, row: index, isLate, isOngoing });
    });

    return positions;
  }, [sortedTaches, startDate, dayWidth, today]);

  // --- DRAG HANDLERS (individual or grouped) ---

  const handleBarMouseDown = useCallback((e: React.MouseEvent, tache: TacheChantier, currentLeft: number, currentRow: number) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();

    // If this task is not in selection, clear selection and drag individually
    if (!selectedTaskIds.has(tache.id)) {
      setSelectedTaskIds(new Set());
    }

    setDraggedTaskId(tache.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY, taskLeft: currentLeft, taskRow: currentRow };
    isDraggingRef.current = false;
  }, [readOnly, selectedTaskIds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Handle lasso
    if (lassoStartRef.current && !draggedTaskId) {
      const container = scrollContainerRef?.current?.getScrollContainer();
      if (!container || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left + container.scrollLeft;
      const currentY = e.clientY - containerRect.top + container.scrollTop;

      const startX = lassoStartRef.current.x;
      const startY = lassoStartRef.current.y;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);

      if (w > 5 || h > 5) {
        isLassoingRef.current = true;
      }

      setLassoRect({ x, y, w, h });

      // Live selection: find intersecting tasks
      const lassoBox = { left: x, top: y, right: x + w, bottom: y + h };
      const newSelected = new Set<string>();
      taskPositions.forEach(({ tache, left, width, row }) => {
        const taskTop = row * ROW_HEIGHT + BAR_VERTICAL_PADDING;
        const taskBox = { left, top: taskTop, right: left + width, bottom: taskTop + BAR_HEIGHT };
        if (rectsIntersect(lassoBox, taskBox)) {
          newSelected.add(tache.id);
        }
      });
      setSelectedTaskIds(newSelected);
      return;
    }

    // Handle drag
    if (!dragStartRef.current || !draggedTaskId) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDraggingRef.current = true;
    }

    // Only horizontal snap for grouped movement
    const snappedX = Math.round(dx / dayWidth) * dayWidth;
    const snappedY = Math.round(dy / ROW_HEIGHT) * ROW_HEIGHT;

    setDragOffset({ x: snappedX, y: snappedY });
  }, [draggedTaskId, dayWidth, scrollContainerRef, taskPositions]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Handle lasso end
    if (lassoStartRef.current) {
      lassoStartRef.current = null;
      setLassoRect(null);

      // If it was just a click (no lasso movement), deselect all
      if (!isLassoingRef.current) {
        setSelectedTaskIds(new Set());
      }
      isLassoingRef.current = false;
      return;
    }

    // Handle drag end
    if (!dragStartRef.current || !draggedTaskId) {
      setDraggedTaskId(null);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    const dx = dragOffset.x;
    const dy = dragOffset.y;

    if (isDraggingRef.current) {
      const isGroupDrag = selectedTaskIds.has(draggedTaskId) && selectedTaskIds.size > 1;
      const dayShift = Math.round(dx / dayWidth);

      if (isGroupDrag && dayShift !== 0) {
        // Grouped horizontal movement
        const tasksToMove = taches.filter(t => selectedTaskIds.has(t.id));
        tasksToMove.forEach(task => {
          const taskStart = parseISO(task.date_debut);
          const taskEnd = parseISO(task.date_fin);
          updateTache.mutate({
            id: task.id,
            chantier_id: chantierId,
            date_debut: format(addDays(taskStart, dayShift), "yyyy-MM-dd"),
            date_fin: format(addDays(taskEnd, dayShift), "yyyy-MM-dd"),
          });
        });
        toast.success(`${tasksToMove.length} tâches déplacées`);
      } else if (!isGroupDrag) {
        // Individual drag (existing logic)
        const draggedTask = taches.find(t => t.id === draggedTaskId);
        if (draggedTask) {
          const rowShift = Math.round(dy / ROW_HEIGHT);
          const hasHorizontalChange = dayShift !== 0;
          const hasVerticalChange = rowShift !== 0;

          if (hasHorizontalChange || hasVerticalChange) {
            const currentTaskStart = parseISO(draggedTask.date_debut);
            const currentTaskEnd = parseISO(draggedTask.date_fin);
            const newStartDate = addDays(currentTaskStart, dayShift);
            const newEndDate = addDays(currentTaskEnd, dayShift);

            const currentIndex = sortedTaches.findIndex(t => t.id === draggedTaskId);
            let newIndex = currentIndex + rowShift;
            newIndex = Math.max(0, Math.min(newIndex, sortedTaches.length - 1));

            if (hasVerticalChange && newIndex !== currentIndex) {
              const reorderedTasks = [...sortedTaches];
              const [movedTask] = reorderedTasks.splice(currentIndex, 1);
              reorderedTasks.splice(newIndex, 0, movedTask);

              reorderedTasks.forEach((task, idx) => {
                const updates: any = { id: task.id, chantier_id: chantierId, ordre: idx };
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
    }

    setDraggedTaskId(null);
    setDragOffset({ x: 0, y: 0 });
    dragStartRef.current = null;

    if (isDraggingRef.current) {
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 100);
    }
    isDraggingRef.current = false;
  }, [draggedTaskId, dragOffset, taches, sortedTaches, dayWidth, chantierId, updateTache, selectedTaskIds]);

  const handleClick = useCallback((e: React.MouseEvent, tache: TacheChantier) => {
    if (!justDraggedRef.current) {
      onTaskClick(tache);
    }
  }, [onTaskClick]);

  // --- LASSO: mousedown on empty area ---
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    // Only start lasso if NOT clicking on a task bar
    const target = e.target as HTMLElement;
    if (target.closest('[data-task-bar]')) return;

    const container = scrollContainerRef?.current?.getScrollContainer();
    if (!container || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left + container.scrollLeft;
    const y = e.clientY - containerRect.top + container.scrollTop;

    lassoStartRef.current = { x, y, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
    isLassoingRef.current = false;

    e.preventDefault();
  }, [readOnly, scrollContainerRef]);

  // Global mouse event listeners
  useEffect(() => {
    if (draggedTaskId || lassoStartRef.current !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggedTaskId, handleMouseMove, handleMouseUp]);

  // We need a separate effect for lasso since lassoStartRef doesn't trigger re-renders
  const [lassoActive, setLassoActive] = useState(false);

  const handleContainerMouseDownWrapped = useCallback((e: React.MouseEvent) => {
    handleContainerMouseDown(e);
    const target = e.target as HTMLElement;
    if (!readOnly && !target.closest('[data-task-bar]')) {
      setLassoActive(true);
    }
  }, [handleContainerMouseDown, readOnly]);

  // Clean up lasso active state
  const handleMouseUpWrapped = useCallback((e: MouseEvent) => {
    handleMouseUp(e);
    setLassoActive(false);
  }, [handleMouseUp]);

  useEffect(() => {
    if (lassoActive) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUpWrapped);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUpWrapped);
      };
    }
  }, [lassoActive, handleMouseMove, handleMouseUpWrapped]);

  // Drag listeners (keep separate)
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

  const isGroupDragging = draggedTaskId && selectedTaskIds.has(draggedTaskId) && selectedTaskIds.size > 1;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${readOnly ? 'pointer-events-none' : ''}`}
      onMouseDown={handleContainerMouseDownWrapped}
    >
      {/* Lasso rectangle */}
      {lassoRect && lassoRect.w > 5 && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-sm pointer-events-none z-40"
          style={{
            left: `${lassoRect.x}px`,
            top: `${lassoRect.y}px`,
            width: `${lassoRect.w}px`,
            height: `${lassoRect.h}px`,
          }}
        />
      )}

      {taskPositions.map(({ tache, left, width, row, isLate, isOngoing }) => {
        const statusInfo = getStatusInfo(tache.statut, isLate, isOngoing);
        const top = row * ROW_HEIGHT + BAR_VERTICAL_PADDING;
        const isDragging = draggedTaskId === tache.id;
        const isSelected = selectedTaskIds.has(tache.id);
        const isGroupMember = isGroupDragging && isSelected && !isDragging;

        // Apply drag offset
        let displayLeft = left;
        let displayTop = top;

        if (isDragging) {
          displayLeft = left + dragOffset.x;
          displayTop = top + dragOffset.y;
        } else if (isGroupMember) {
          // Only horizontal offset for group members
          displayLeft = left + dragOffset.x;
        }

        // Sticky label
        const barStart = displayLeft;
        const barEnd = displayLeft + width;
        const isPartiallyHidden = barStart < scrollLeft;
        const isStillVisible = barEnd > scrollLeft;

        let labelOffset = 0;
        if (isPartiallyHidden && isStillVisible && !isDragging && !isGroupMember) {
          labelOffset = Math.min(scrollLeft - barStart, width - 120);
          labelOffset = Math.max(0, labelOffset);
        }

        return (
          <div
            key={tache.id}
            data-task-bar
            className={`absolute rounded-md pointer-events-auto transition-shadow overflow-hidden ${statusInfo.color} ${
              readOnly
                ? "cursor-pointer hover:brightness-95"
                : isDragging
                  ? "opacity-80 shadow-lg z-50 cursor-grabbing"
                  : "cursor-grab hover:brightness-95 hover:shadow-md"
            } ${isSelected && !isDragging ? "ring-2 ring-blue-500 ring-offset-1 z-10" : ""} ${
              isGroupMember ? "opacity-80 shadow-md z-30" : ""
            }`}
            style={{
              left: `${displayLeft}px`,
              top: `${displayTop}px`,
              width: `${width}px`,
              height: `${BAR_HEIGHT}px`,
              transition: isDragging || isGroupMember ? "none" : "box-shadow 0.2s",
            }}
            onMouseDown={readOnly ? undefined : (e) => handleBarMouseDown(e, tache, left, row)}
            onClick={(e) => handleClick(e, tache)}
          >
            <div
              className="h-full flex items-center gap-2 select-none whitespace-nowrap px-2"
              style={{
                transform: labelOffset > 0 ? `translateX(${labelOffset}px)` : undefined,
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
