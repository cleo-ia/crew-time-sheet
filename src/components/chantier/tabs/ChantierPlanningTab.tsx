import { useState, useRef } from "react";
import { ViewMode } from "gantt-task-react";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GanttChart } from "@/components/chantier/planning/GanttChart";
import { EmptyGanttGrid, EmptyGanttGridRef } from "@/components/chantier/planning/EmptyGanttGrid";
import { TaskFormDialog } from "@/components/chantier/planning/TaskFormDialog";
import { TaskDetailDialog } from "@/components/chantier/planning/TaskDetailDialog";
import { useTachesChantier, TacheChantier } from "@/hooks/useTachesChantier";
import { Skeleton } from "@/components/ui/skeleton";

interface ChantierPlanningTabProps {
  chantierId: string;
}

// Start from January 2020 to allow scrolling far back and forward
const START_DATE = new Date(2020, 0, 1);
// ~11 years of days to 2030
const NUM_DAYS = 365 * 11;

export const ChantierPlanningTab = ({ chantierId }: ChantierPlanningTabProps) => {
  const { data: taches = [], isLoading } = useTachesChantier(chantierId);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTache, setSelectedTache] = useState<TacheChantier | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDates, setShowDates] = useState(true);
  const ganttRef = useRef<EmptyGanttGridRef>(null);

  const handleTaskClick = (tache: TacheChantier) => {
    setSelectedTache(tache);
    setShowDetailDialog(true);
  };

  const handleViewModeChange = (value: string) => {
    if (value) {
      setViewMode(value as ViewMode);
    }
  };

  const goToToday = () => {
    ganttRef.current?.scrollToToday();
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
      {/* Toolbar - Similar to the reference image */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/30 rounded-lg">
        {/* Left side - Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goToToday} className="text-primary font-medium">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Aujourd'hui
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-4">
          {/* Show dates toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="show-dates" className="text-sm text-muted-foreground">
              Afficher les dates
            </Label>
            <Switch
              id="show-dates"
              checked={showDates}
              onCheckedChange={setShowDates}
            />
          </div>

          {/* View mode selector */}
          <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-background">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} size="sm">
              <ToggleGroupItem value={ViewMode.Day} aria-label="Vue jour" className="text-xs">
                Jour
              </ToggleGroupItem>
              <ToggleGroupItem value={ViewMode.Week} aria-label="Vue semaine" className="text-xs">
                Semaine
              </ToggleGroupItem>
              <ToggleGroupItem value={ViewMode.Month} aria-label="Vue mois" className="text-xs">
                Mois
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Add task button */}
          <Button 
            onClick={() => setShowCreateDialog(true)} 
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart - Always show grid even without tasks */}
      <div className="border rounded-lg overflow-hidden bg-background">
        {taches.length > 0 ? (
          <GanttChart
            taches={taches}
            chantierId={chantierId}
            viewMode={viewMode}
            onTaskClick={handleTaskClick}
            showDates={showDates}
          />
        ) : (
          <EmptyGanttGrid ref={ganttRef} startDate={START_DATE} numDays={NUM_DAYS} />
        )}
      </div>

      {/* Legend - only show if there are tasks */}
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

      {/* Info text when empty */}
      {taches.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Cliquez sur le bouton <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white rounded text-xs mx-1"><Plus className="h-3 w-3" /></span> pour créer votre première tâche
        </p>
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
