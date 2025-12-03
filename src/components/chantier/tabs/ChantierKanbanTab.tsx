import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTachesChantier, type TacheChantier } from "@/hooks/useTachesChantier";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { TaskDetailDialog } from "../planning/TaskDetailDialog";
import { TaskFormDialog } from "../planning/TaskFormDialog";

interface ChantierKanbanTabProps {
  chantierId: string;
}

type ComputedStatus = "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD";

const getComputedStatus = (tache: TacheChantier): ComputedStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(tache.date_debut);
  const endDate = new Date(tache.date_fin);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (tache.statut === "TERMINE") return "TERMINE";
  if (endDate < today) return "EN_RETARD";
  if (startDate <= today && today <= endDate) return "EN_COURS";
  return "A_FAIRE";
};

interface KanbanColumn {
  id: ComputedStatus;
  title: string;
  tasks: TacheChantier[];
}

export const ChantierKanbanTab = ({ chantierId }: ChantierKanbanTabProps) => {
  const { data: taches = [], isLoading } = useTachesChantier(chantierId);
  const [selectedTache, setSelectedTache] = useState<TacheChantier | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Categorize tasks by computed status
  const columns: KanbanColumn[] = [
    { id: "A_FAIRE", title: "À venir", tasks: [] },
    { id: "EN_COURS", title: "En cours", tasks: [] },
    { id: "TERMINE", title: "Terminé", tasks: [] },
  ];

  // Also track late tasks (they go in "À venir" or "En cours" visually but show badge)
  const tasksWithStatus = taches.map(tache => ({
    tache,
    computedStatus: getComputedStatus(tache),
  }));

  tasksWithStatus.forEach(({ tache, computedStatus }) => {
    if (computedStatus === "EN_RETARD") {
      // Late tasks that haven't started go to "À venir", others to "En cours"
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(tache.date_debut);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate > today) {
        columns[0].tasks.push(tache); // À venir
      } else {
        columns[1].tasks.push(tache); // En cours
      }
    } else {
      const column = columns.find(c => c.id === computedStatus);
      if (column) column.tasks.push(tache);
    }
  });

  const handleCardClick = (tache: TacheChantier) => {
    setSelectedTache(tache);
    setDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
        {columns.map(column => (
          <div 
            key={column.id} 
            className="flex flex-col bg-muted/30 rounded-lg"
          >
            {/* Column header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{column.title}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {column.tasks.length}
                </span>
              </div>
            </div>

            {/* Tasks list */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {column.tasks.map(tache => {
                  const computedStatus = getComputedStatus(tache);
                  return (
                    <KanbanTaskCard
                      key={tache.id}
                      tache={tache}
                      computedStatus={computedStatus}
                      onClick={() => handleCardClick(tache)}
                    />
                  );
                })}
              </div>
            </ScrollArea>

            {/* Add task button */}
            <div className="p-3 border-t border-border/50">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une tâche
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Task detail dialog */}
      <TaskDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        tache={selectedTache}
        chantierId={chantierId}
      />

      {/* Create task dialog */}
      <TaskFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        chantierId={chantierId}
      />
    </>
  );
};
