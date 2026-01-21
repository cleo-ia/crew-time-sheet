import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentWeek, getNextWeek, calculatePreviousWeek } from "@/lib/weekUtils";

interface PlanningWeekSelectorProps {
  semaine: string;
  onSemaineChange: (semaine: string) => void;
  affectationsCount?: number;
}

export const PlanningWeekSelector = ({
  semaine,
  onSemaineChange,
  affectationsCount = 0,
}: PlanningWeekSelectorProps) => {
  const currentWeek = getCurrentWeek();
  const nextWeek = getNextWeek(currentWeek);
  
  const handlePrevious = () => {
    onSemaineChange(calculatePreviousWeek(semaine));
  };

  const handleNext = () => {
    onSemaineChange(getNextWeek(semaine));
  };

  const isCurrentWeek = semaine === currentWeek;
  const isNextWeek = semaine === nextWeek;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg min-w-[80px] text-center">
          {semaine}
        </span>
        {isCurrentWeek && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
            Cette semaine
          </span>
        )}
        {isNextWeek && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            S+1
          </span>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {affectationsCount > 0 && (
        <span className="text-sm text-muted-foreground ml-2">
          {affectationsCount} affectation{affectationsCount > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};
