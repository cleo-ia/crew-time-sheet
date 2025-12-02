import { useMemo, useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { format, addDays, isWeekend, isToday, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export type ZoomLevel = "month" | "quarter" | "semester" | "year";

interface EmptyGanttGridProps {
  startDate: Date;
  numDays?: number;
  zoomLevel?: ZoomLevel;
  showDates?: boolean;
  onScrollChange?: (scrollLeft: number, containerWidth: number) => void;
  children?: React.ReactNode;
}

export interface EmptyGanttGridRef {
  scrollToToday: () => void;
}

const ROW_HEIGHT = 48;
const NUM_ROWS = 8;
const BUFFER_DAYS = 60; // Days to render outside visible area

// Day width based on zoom level
const getDayWidth = (zoomLevel: ZoomLevel): number => {
  switch (zoomLevel) {
    case "month":
      return 32;
    case "quarter":
      return 20;
    case "semester":
      return 6;
    case "year":
      return 3;
    default:
      return 32;
  }
};

export const EmptyGanttGrid = forwardRef<EmptyGanttGridRef, EmptyGanttGridProps>(
  ({ startDate, numDays = 90, zoomLevel = "month", showDates = true, onScrollChange, children }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [containerWidth, setContainerWidth] = useState(1200);
    const dayWidth = getDayWidth(zoomLevel);
    const totalWidth = numDays * dayWidth;

    // Find today's index
    const todayIndex = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < numDays ? diffDays : -1;
    }, [startDate, numDays]);

    // Calculate visible range with buffer
    const { startIdx, endIdx } = useMemo(() => {
      const visibleStart = Math.floor(scrollLeft / dayWidth);
      const visibleDays = Math.ceil(containerWidth / dayWidth);
      const start = Math.max(0, visibleStart - BUFFER_DAYS);
      const end = Math.min(numDays, visibleStart + visibleDays + BUFFER_DAYS);
      return { startIdx: start, endIdx: end };
    }, [scrollLeft, containerWidth, dayWidth, numDays]);

    // Generate only visible days
    const visibleDays = useMemo(() => {
      const result = [];
      for (let i = startIdx; i < endIdx; i++) {
        result.push({ date: addDays(startDate, i), index: i });
      }
      return result;
    }, [startDate, startIdx, endIdx]);

    // Group visible days by month for header
    const visibleMonths = useMemo(() => {
      const result: { month: Date; startIdx: number; count: number }[] = [];
      let currentMonth: Date | null = null;
      let currentStartIdx = 0;
      let currentCount = 0;

      visibleDays.forEach(({ date, index }) => {
        const monthStart = startOfMonth(date);
        if (!currentMonth || monthStart.getTime() !== currentMonth.getTime()) {
          if (currentMonth) {
            result.push({ month: currentMonth, startIdx: currentStartIdx, count: currentCount });
          }
          currentMonth = monthStart;
          currentStartIdx = index;
          currentCount = 1;
        } else {
          currentCount++;
        }
      });

      if (currentMonth && currentCount > 0) {
        result.push({ month: currentMonth, startIdx: currentStartIdx, count: currentCount });
      }

      return result;
    }, [visibleDays]);

    // Throttled scroll handler
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      setScrollLeft(target.scrollLeft);
      onScrollChange?.(target.scrollLeft, target.clientWidth);
    }, [onScrollChange]);

    const scrollToToday = useCallback(() => {
      if (containerRef.current && todayIndex >= 0) {
        const scrollPosition = todayIndex * dayWidth - containerRef.current.clientWidth / 2 + dayWidth / 2;
        containerRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }
    }, [todayIndex, dayWidth]);

    // Expose scrollToToday to parent
    useImperativeHandle(ref, () => ({
      scrollToToday,
    }));

    // Update container width on resize
    useEffect(() => {
      const updateWidth = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.clientWidth);
        }
      };
      updateWidth();
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }, []);

    // Scroll to today on mount and notify parent
    useEffect(() => {
      if (containerRef.current && todayIndex >= 0) {
        const scrollPosition = todayIndex * dayWidth - containerRef.current.clientWidth / 2 + dayWidth / 2;
        containerRef.current.scrollLeft = Math.max(0, scrollPosition);
        setScrollLeft(Math.max(0, scrollPosition));
        onScrollChange?.(Math.max(0, scrollPosition), containerRef.current.clientWidth);
      }
    }, [todayIndex, dayWidth, onScrollChange]);

    // Determine if we should show day numbers based on zoom level
    const showDayNumbers = (zoomLevel === "month" || zoomLevel === "quarter") && showDates;

    const leftSpacerWidth = startIdx * dayWidth;
    const rightSpacerWidth = Math.max(0, (numDays - endIdx) * dayWidth);

    return (
      <div ref={containerRef} className="overflow-x-auto relative" onScroll={handleScroll}>
        <div style={{ width: totalWidth }} className="relative">
          {/* Month header row */}
          <div className="flex border-b border-border/50">
            <div style={{ width: leftSpacerWidth, flexShrink: 0 }} />
            {visibleMonths.map((monthGroup, idx) => (
              <div
                key={`${monthGroup.month.getTime()}-${idx}`}
                className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-r border-border/30 capitalize truncate"
                style={{ width: monthGroup.count * dayWidth, flexShrink: 0 }}
              >
                {format(monthGroup.month, "MMM yy", { locale: fr })}
              </div>
            ))}
            <div style={{ width: rightSpacerWidth, flexShrink: 0 }} />
          </div>

          {/* Day header row - only show if showDates and zoom allows */}
          {showDayNumbers && (
            <div className="flex border-b border-border">
              <div style={{ width: leftSpacerWidth, flexShrink: 0 }} />
              {visibleDays.map(({ date, index }) => {
                const weekend = isWeekend(date);
                const today = isToday(date);
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-center text-xs py-1 border-r border-border/20 ${
                      weekend ? "text-red-400" : "text-muted-foreground"
                    }`}
                    style={{ width: dayWidth, flexShrink: 0 }}
                  >
                    {today ? (
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white font-bold text-xs">
                        {format(date, "d")}
                      </span>
                    ) : (
                      format(date, "d")
                    )}
                  </div>
                );
              })}
              <div style={{ width: rightSpacerWidth, flexShrink: 0 }} />
            </div>
          )}

          {/* Grid body with rows */}
          <div className="relative">
            {/* Grid rows */}
            {Array.from({ length: NUM_ROWS }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex border-b border-border/20">
                <div style={{ width: leftSpacerWidth, flexShrink: 0 }} />
                {visibleDays.map(({ date, index }) => {
                  const weekend = isWeekend(date);
                  return (
                    <div
                      key={index}
                      className={`border-r border-border/10 ${weekend ? "bg-muted/40" : ""}`}
                      style={{ width: dayWidth, height: ROW_HEIGHT, flexShrink: 0 }}
                    />
                  );
                })}
                <div style={{ width: rightSpacerWidth, flexShrink: 0 }} />
              </div>
            ))}

            {/* Task bars overlay - rendered as children */}
            {children}

            {/* Today's vertical red line */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left: todayIndex * dayWidth + dayWidth / 2,
                  width: 2,
                }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: "repeating-linear-gradient(to bottom, #ef4444 0, #ef4444 8px, transparent 8px, transparent 16px)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

EmptyGanttGrid.displayName = "EmptyGanttGrid";
