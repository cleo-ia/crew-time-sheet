import { useMemo } from "react";
import { format, addDays, startOfWeek, isWeekend, isToday, startOfMonth, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface EmptyGanttGridProps {
  startDate: Date;
  numDays?: number;
}

export const EmptyGanttGrid = ({ startDate, numDays = 90 }: EmptyGanttGridProps) => {
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < numDays; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, numDays]);

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

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Month header row */}
        <div className="flex border-b border-border/50">
          {months.map((monthGroup, idx) => (
            <div
              key={idx}
              className="text-xs font-medium text-muted-foreground px-2 py-1 border-r border-border/30"
              style={{ width: monthGroup.days.length * 32 }}
            >
              {format(monthGroup.month, "MMM yy", { locale: fr })}
            </div>
          ))}
        </div>

        {/* Day header row */}
        <div className="flex border-b border-border">
          {days.map((day, idx) => {
            const weekend = isWeekend(day);
            const today = isToday(day);
            return (
              <div
                key={idx}
                className={`w-8 text-center text-xs py-1 border-r border-border/20 ${
                  weekend ? "text-red-400" : "text-muted-foreground"
                } ${today ? "bg-primary/10 font-bold" : ""}`}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>

        {/* Empty grid rows (placeholder for tasks) */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
          <div key={row} className="flex border-b border-border/20">
            {days.map((day, idx) => {
              const weekend = isWeekend(day);
              const today = isToday(day);
              return (
                <div
                  key={idx}
                  className={`w-8 h-12 border-r border-border/10 ${
                    weekend ? "bg-muted/50" : ""
                  } ${today ? "bg-primary/5" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
