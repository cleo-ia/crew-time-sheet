import { useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { format, addDays, isWeekend, isToday, startOfMonth, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

export type ZoomLevel = "month" | "quarter" | "semester" | "year";

interface EmptyGanttGridProps {
  startDate: Date;
  numDays?: number;
  zoomLevel?: ZoomLevel;
  showDates?: boolean;
}

export interface EmptyGanttGridRef {
  scrollToToday: () => void;
}

const ROW_HEIGHT = 48;
const NUM_ROWS = 8;

// Day width based on zoom level
const getDayWidth = (zoomLevel: ZoomLevel): number => {
  switch (zoomLevel) {
    case "month":
      return 32;
    case "quarter":
      return 12;
    case "semester":
      return 6;
    case "year":
      return 3;
    default:
      return 32;
  }
};

export const EmptyGanttGrid = forwardRef<EmptyGanttGridRef, EmptyGanttGridProps>(
  ({ startDate, numDays = 90, zoomLevel = "month", showDates = true }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dayWidth = getDayWidth(zoomLevel);

    const days = useMemo(() => {
      const result = [];
      for (let i = 0; i < numDays; i++) {
        result.push(addDays(startDate, i));
      }
      return result;
    }, [startDate, numDays]);

    // Find today's position
    const todayIndex = useMemo(() => {
      const today = new Date();
      return days.findIndex((day) => isToday(day));
    }, [days]);

    // Group days by month
    const months = useMemo(() => {
      const result: { month: Date; days: Date[] }[] = [];
      let currentMonth: Date | null = null;
      let currentDays: Date[] = [];

      days.forEach((day) => {
        const monthStart = startOfMonth(day);
        if (!currentMonth || monthStart.getTime() !== currentMonth.getTime()) {
          if (currentMonth) {
            result.push({ month: currentMonth, days: currentDays });
          }
          currentMonth = monthStart;
          currentDays = [day];
        } else {
          currentDays.push(day);
        }
      });

      if (currentMonth && currentDays.length > 0) {
        result.push({ month: currentMonth, days: currentDays });
      }

      return result;
    }, [days]);

    const scrollToToday = () => {
      if (containerRef.current && todayIndex >= 0) {
        const scrollPosition = todayIndex * dayWidth - containerRef.current.clientWidth / 2 + dayWidth / 2;
        containerRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }
    };

    // Expose scrollToToday to parent
    useImperativeHandle(ref, () => ({
      scrollToToday,
    }));

    // Scroll to today on mount
    useEffect(() => {
      if (containerRef.current && todayIndex >= 0) {
        const scrollPosition = todayIndex * dayWidth - containerRef.current.clientWidth / 2 + dayWidth / 2;
        containerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }, [todayIndex, dayWidth]);

    // Determine if we should show day numbers based on zoom level
    const showDayNumbers = zoomLevel === "month" && showDates;

    return (
      <div ref={containerRef} className="overflow-x-auto relative">
        <div className="min-w-max relative">
          {/* Month header row */}
          <div className="flex border-b border-border/50">
            {months.map((monthGroup, idx) => (
              <div
                key={idx}
                className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-r border-border/30 capitalize truncate"
                style={{ width: monthGroup.days.length * dayWidth }}
              >
                {format(monthGroup.month, "MMM yy", { locale: fr })}
              </div>
            ))}
          </div>

          {/* Day header row - only show if showDates and zoom allows */}
          {showDayNumbers && (
            <div className="flex border-b border-border">
              {days.map((day, idx) => {
                const weekend = isWeekend(day);
                const today = isToday(day);
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center text-xs py-1 border-r border-border/20 ${
                      weekend ? "text-red-400" : "text-muted-foreground"
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {today ? (
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white font-bold text-xs">
                        {format(day, "d")}
                      </span>
                    ) : (
                      format(day, "d")
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid body with rows */}
          <div className="relative">
            {/* Grid rows */}
            {Array.from({ length: NUM_ROWS }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex border-b border-border/20">
                {days.map((day, idx) => {
                  const weekend = isWeekend(day);
                  return (
                    <div
                      key={idx}
                      className={`border-r border-border/10 ${weekend ? "bg-muted/40" : ""}`}
                      style={{ width: dayWidth, height: ROW_HEIGHT }}
                    />
                  );
                })}
              </div>
            ))}

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
