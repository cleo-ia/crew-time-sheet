import { useState } from "react";
import { ViewMode } from "gantt-task-react";
import { CalendarDays, Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GanttChart } from "@/components/chantier/planning/GanttChart";
import { TaskFormDialog } from "@/components/chantier/planning/TaskFormDialog";
import { TaskDetailDialog } from "@/components/chantier/planning/TaskDetailDialog";
import { useTachesChantier, TacheChantier } from "@/hooks/useTachesChantier";
import { Skeleton } from "@/components/ui/skeleton";

interface ChantierPlanningTabProps {
  chantierId: string;
}

export const ChantierPlanningTab = ({ chantierId }: ChantierPlanningTabProps) => {
  const { data: taches = [], isLoading } = useTachesChantier(chantierId);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTache, setSelectedTache] = useState<TacheChantier | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleTaskClick = (tache: TacheChantier) => {
    setSelectedTache(tache);
    setShowDetailDialog(true);
  };

  const handleViewModeChange = (value: string) => {
    if (value) {
      setViewMode(value as ViewMode);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Planning Gantt</span>
          <span className="text-sm text-muted-foreground">
            ({taches.length} tâche{taches.length > 1 ? "s" : ""})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} size="sm">
            <ToggleGroupItem value={ViewMode.Day} aria-label="Vue jour">
              Jour
            </ToggleGroupItem>
            <ToggleGroupItem value={ViewMode.Week} aria-label="Vue semaine">
              Semaine
            </ToggleGroupItem>
            <ToggleGroupItem value={ViewMode.Month} aria-label="Vue mois">
              Mois
            </ToggleGroupItem>
          </ToggleGroup>

          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Gantt Chart or Empty State */}
      {taches.length > 0 ? (
        <div className="border rounded-lg overflow-hidden bg-background">
          <GanttChart
            taches={taches}
            chantierId={chantierId}
            viewMode={viewMode}
            onTaskClick={handleTaskClick}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/10">
          <List className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Aucune tâche planifiée</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Commencez par ajouter des tâches pour visualiser votre planning
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Créer la première tâche
          </Button>
        </div>
      )}

      {/* Legend */}
      {taches.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Terminé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>En retard</span>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <TaskFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        chantierId={chantierId}
      />

      <TaskDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        tache={selectedTache}
        chantierId={chantierId}
      />
    </div>
  );
};
