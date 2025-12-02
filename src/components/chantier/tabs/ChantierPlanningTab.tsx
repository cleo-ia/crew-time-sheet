import { CalendarDays } from "lucide-react";

export const ChantierPlanningTab = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CalendarDays className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium">Planning Gantt</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Le planning du chantier sera disponible prochainement
      </p>
    </div>
  );
};
