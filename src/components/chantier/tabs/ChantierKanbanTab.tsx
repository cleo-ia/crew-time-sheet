import { useState } from "react";
import { Plus, Clock, CheckCircle2, CalendarClock } from "lucide-react";
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
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  headerBg: string;
  tasks: TacheChantier[];
}

export const ChantierKanbanTab = ({ chantierId }: ChantierKanbanTabProps) => {
  const { data: taches = [], isLoading } = useTachesChantier(chantierId);
  const [selectedTache, setSelectedTache] = useState<TacheChantier | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Categorize tasks by computed status
  const columns: KanbanColumn[] = [
    { 
      id: "A_FAIRE", 
      title: "À venir", 
      icon: <CalendarClock className="h-4 w-4" />,
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
      headerBg: "bg-gradient-to-r from-blue-500/10 to-blue-500/5",
      tasks: [] 
    },
    { 
      id: "EN_COURS", 
      title: "En cours", 
      icon: <Clock className="h-4 w-4" />,
      colorClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
      headerBg: "bg-gradient-to-r from-amber-500/10 to-amber-500/5",
      tasks: [] 
    },
    { 
      id: "TERMINE", 
      title: "Terminé", 
      icon: <CheckCircle2 className="h-4 w-4" />,
      colorClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-50/50 dark:bg-green-950/20",
      headerBg: "bg-gradient-to-r from-green-500/10 to-green-500/5",
      tasks: [] 
    },
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement des tâches...</p>
        </div>
      </div>
    );
  }

  const totalTasks = taches.length;

  return (
    <>
      {/* Stats header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalTasks} tâche{totalTasks > 1 ? 's' : ''} au total
          </span>
        </div>
        <Button 
          size="sm" 
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-[calc(100vh-350px)] min-h-[450px]">
        {columns.map((column, index) => (
          <div 
            key={column.id} 
            className={`flex flex-col rounded-xl border border-border/50 overflow-hidden ${column.bgClass} animate-fade-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Column header */}
            <div className={`px-4 py-3.5 ${column.headerBg} border-b border-border/30`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2.5 ${column.colorClass}`}>
                  {column.icon}
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${column.bgClass} ${column.colorClass}`}>
                  {column.tasks.length}
                </span>
              </div>
            </div>

            {/* Tasks list */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {column.tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className={`p-3 rounded-full ${column.bgClass} mb-3`}>
                      {column.icon}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Aucune tâche
                    </p>
                  </div>
                ) : (
                  column.tasks.map((tache, taskIndex) => {
                    const computedStatus = getComputedStatus(tache);
                    return (
                      <div 
                        key={tache.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${(index * 100) + (taskIndex * 50)}ms` }}
                      >
                        <KanbanTaskCard
                          tache={tache}
                          computedStatus={computedStatus}
                          onClick={() => handleCardClick(tache)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Add task button - only in "À venir" column */}
            {column.id === "A_FAIRE" && (
              <div className="p-3 border-t border-border/30">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`w-full justify-center gap-2 hover:${column.bgClass} ${column.colorClass} hover:text-blue-700 dark:hover:text-blue-300 transition-colors`}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une tâche
                </Button>
              </div>
            )}
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
