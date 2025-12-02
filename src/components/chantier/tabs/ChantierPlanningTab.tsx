import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyGanttGrid, EmptyGanttGridRef, ZoomLevel } from "@/components/chantier/planning/EmptyGanttGrid";
import { TaskBars } from "@/components/chantier/planning/TaskBars";
import { TaskFormDialog } from "@/components/chantier/planning/TaskFormDialog";
import { TaskDetailDialog } from "@/components/chantier/planning/TaskDetailDialog";
import { useTachesChantier, TacheChantier } from "@/hooks/useTachesChantier";
import { Skeleton } from "@/components/ui/skeleton";

interface ChantierPlanningTabProps {
  chantierId: string;
}

// Start from January 2015 to allow scrolling far back and forward
const START_DATE = new Date(2015, 0, 1);
// ~36 years of days to 2050
const NUM_DAYS = 365 * 36;

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Année" },
];

export const ChantierPlanningTab = ({ chantierId }: ChantierPlanningTabProps) => {
  const { data: taches = [], isLoading } = useTachesChantier(chantierId);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("quarter");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTache, setSelectedTache] = useState<TacheChantier | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  // Show dates by default for month and quarter views
  const [showDates, setShowDates] = useState(true);
  const ganttRef = useRef<EmptyGanttGridRef>(null);

  // Auto-enable dates for month/quarter zoom levels
  const handleZoomChange = (newZoom: ZoomLevel) => {
    setZoomLevel(newZoom);
    if (newZoom === "month" || newZoom === "quarter") {
      setShowDates(true);
    }
  };

  const handleTaskClick = (tache: TacheChantier) => {
    setSelectedTache(tache);
    setShowDetailDialog(true);
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
      {/* Toolbar */}
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

          {/* Zoom level selector */}
          <Select value={zoomLevel} onValueChange={(v) => handleZoomChange(v as ZoomLevel)}>
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZOOM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      {/* Gantt Chart - Always show grid with tasks overlay */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <EmptyGanttGrid 
          ref={ganttRef} 
          startDate={START_DATE} 
          numDays={NUM_DAYS} 
          zoomLevel={zoomLevel}
          showDates={showDates}
        >
          {taches.length > 0 && (
            <TaskBars
              taches={taches}
              startDate={START_DATE}
              zoomLevel={zoomLevel}
              onTaskClick={handleTaskClick}
              chantierId={chantierId}
            />
          )}
        </EmptyGanttGrid>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-400" />
          <span>En cours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Terminé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>À venir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>En retard</span>
        </div>
      </div>

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