import { useState, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyGanttGrid, EmptyGanttGridRef, ZoomLevel } from "@/components/chantier/planning/EmptyGanttGrid";
import { TaskBars } from "@/components/chantier/planning/TaskBars";
import { EventMarkers } from "@/components/chantier/planning/EventMarkers";
import { TaskFormDialog } from "@/components/chantier/planning/TaskFormDialog";
import { TaskDetailDialog } from "@/components/chantier/planning/TaskDetailDialog";
import { TodoDetailDialog } from "@/components/chantier/tabs/TodoDetailDialog";
import { useTachesChantier, TacheChantier } from "@/hooks/useTachesChantier";
import { useTodosChantier, TodoChantier } from "@/hooks/useTodosChantier";
import { useChantierDetail } from "@/hooks/useChantierDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChantierPlanningTabProps {
  chantierId: string;
  chantierNom?: string;
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

export const ChantierPlanningTab = ({ chantierId, chantierNom }: ChantierPlanningTabProps) => {
  const { data: taches = [], isLoading } = useTachesChantier(chantierId);
  const { data: todos = [] } = useTodosChantier(chantierId);
  const { data: chantierDetail } = useChantierDetail(chantierId);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("quarter");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTache, setSelectedTache] = useState<TacheChantier | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<TodoChantier | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTodoDetailDialog, setShowTodoDetailDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Show dates by default for month and quarter views
  const [showDates, setShowDates] = useState(true);
  const ganttRef = useRef<EmptyGanttGridRef>(null);

  // Filter todos to show on planning
  const planningTodos = useMemo(() => 
    todos.filter(t => t.afficher_planning && t.date_echeance), 
    [todos]
  );

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

  const handleEventClick = (todo: TodoChantier) => {
    setSelectedTodo(todo);
    setShowTodoDetailDialog(true);
  };

  const goToToday = () => {
    ganttRef.current?.scrollToToday();
  };

  const goBackOneWeek = () => {
    ganttRef.current?.scrollByDays(-7);
  };

  const goForwardOneWeek = () => {
    ganttRef.current?.scrollByDays(7);
  };

  const STATUS_LABELS: Record<string, string> = {
    A_FAIRE: "À faire",
    EN_COURS: "En cours",
    TERMINE: "Terminé",
    EN_RETARD: "En retard",
  };

  const STATUS_COLORS: Record<string, string> = {
    A_FAIRE: "FF9CA3AF", // gray
    EN_COURS: "FFFB923C", // orange
    TERMINE: "FF22C55E", // green
    EN_RETARD: "FFEF4444", // red
  };

  // Calculate dynamic status like in the planning view
  const getComputedStatus = (tache: TacheChantier): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateDebut = new Date(tache.date_debut);
    const dateFin = new Date(tache.date_fin);
    
    if (tache.statut === "TERMINE") return "TERMINE";
    if (dateFin < today) return "EN_RETARD";
    if (dateDebut <= today && today <= dateFin) return "EN_COURS";
    return "A_FAIRE";
  };

  const exportToExcel = async () => {
    if (taches.length === 0 && planningTodos.length === 0) {
      toast.error("Aucune tâche ou événement à exporter");
      return;
    }

    setIsExporting(true);
    toast.info("Export en cours...");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Planning");

      // Find date range for Gantt visualization (include events dates)
      const taskDates = taches.flatMap(t => [new Date(t.date_debut), new Date(t.date_fin)]);
      const eventDates = planningTodos.map(t => new Date(t.date_echeance!));
      const allDates = [...taskDates, ...eventDates];
      
      if (allDates.length === 0) {
        toast.error("Aucune date à afficher");
        return;
      }
      
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      // Define base columns
      const baseColumns = [
        { header: "Tâche", key: "nom", width: 25 },
        { header: "Statut", key: "statut", width: 12 },
        { header: "Début", key: "date_debut", width: 12 },
        { header: "Fin", key: "date_fin", width: 12 },
        { header: "Durée", key: "duree", width: 10 },
        { header: "H. Est.", key: "heures_estimees", width: 10 },
        { header: "H. Réal.", key: "heures_realisees", width: 10 },
      ];

      // Generate all days between min and max date
      const days: Date[] = [];
      const currentDay = new Date(minDate);
      while (currentDay <= maxDate) {
        days.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }

      // Group days by month for header row
      const monthGroups: { month: string; startCol: number; count: number }[] = [];
      let currentMonth = "";
      days.forEach((day, idx) => {
        const monthLabel = format(day, "MMMM yyyy", { locale: fr });
        if (monthLabel !== currentMonth) {
          monthGroups.push({ month: monthLabel, startCol: baseColumns.length + 1 + idx, count: 1 });
          currentMonth = monthLabel;
        } else {
          monthGroups[monthGroups.length - 1].count++;
        }
      });

      // Day name mapping (L, M, M, J, V, S, D)
      const dayNames = ["D", "L", "M", "M", "J", "V", "S"];

      // Add day columns for Gantt visualization
      const dayColumns = days.map((day, i) => ({
        header: `${dayNames[day.getDay()]}${format(day, "d", { locale: fr })}`,
        key: `day_${i}`,
        width: 4,
      }));

      worksheet.columns = [...baseColumns, ...dayColumns];

      // Build title with chantier info
      const titleParts = [`Planning - ${chantierNom || "Chantier"}`];
      if (chantierDetail?.code_chantier) {
        titleParts.push(`(${chantierDetail.code_chantier})`);
      }
      if (chantierDetail?.client) {
        titleParts.push(`• Client: ${chantierDetail.client}`);
      }
      
      // Add title row first (row 1)
      const titleRow = worksheet.insertRow(1, []);
      titleRow.height = 30;
      const titleCell = titleRow.getCell(1);
      titleCell.value = titleParts.join(" ");
      titleCell.font = { bold: true, size: 14, color: { argb: "FF1F2937" } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.mergeCells(1, 1, 1, baseColumns.length + days.length);

      // Add month header row (row 2)
      const monthRow = worksheet.insertRow(2, []);
      monthRow.height = 20;
      
      // Merge cells for base columns in month row
      worksheet.mergeCells(2, 1, 2, baseColumns.length);
      
      // Add month labels and merge cells
      monthGroups.forEach(group => {
        const adjustedStartCol = group.startCol;
        const startCell = monthRow.getCell(adjustedStartCol);
        startCell.value = group.month.charAt(0).toUpperCase() + group.month.slice(1);
        startCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F2937" },
        };
        startCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
        startCell.alignment = { horizontal: "center", vertical: "middle" };
        
        if (group.count > 1) {
          worksheet.mergeCells(2, adjustedStartCol, 2, adjustedStartCol + group.count - 1);
        }
      });
      
      // Style day header row (now row 3)
      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true, size: 10 };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 22;
      
      // Style base header cells
      for (let i = 1; i <= baseColumns.length; i++) {
        const cell = headerRow.getCell(i);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF97316" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      }
      
      // Style day header cells (gray out weekends)
      days.forEach((day, idx) => {
        const cell = headerRow.getCell(baseColumns.length + 1 + idx);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isWeekend ? "FF9CA3AF" : "FF374151" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      });

      // Add data rows
      taches.forEach((tache, rowIndex) => {
        const dateDebut = new Date(tache.date_debut);
        const dateFin = new Date(tache.date_fin);
        const duree = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const computedStatus = getComputedStatus(tache);

        const rowData: Record<string, any> = {
          nom: tache.nom,
          statut: STATUS_LABELS[computedStatus],
          date_debut: format(dateDebut, "dd/MM/yyyy", { locale: fr }),
          date_fin: format(dateFin, "dd/MM/yyyy", { locale: fr }),
          duree: `${duree}j`,
          heures_estimees: tache.heures_estimees || "-",
          heures_realisees: tache.heures_realisees || "-",
        };

        // Find start and end day indices for this task
        let startDayIndex = -1;
        let endDayIndex = -1;
        
        days.forEach((day, dayIndex) => {
          const dayTime = day.getTime();
          const overlaps = dayTime >= dateDebut.getTime() && dayTime <= dateFin.getTime();
          if (overlaps) {
            if (startDayIndex === -1) startDayIndex = dayIndex;
            endDayIndex = dayIndex;
          }
          // Initialize all day cells as empty
          rowData[`day_${dayIndex}`] = "";
        });

        const row = worksheet.addRow(rowData);
        const actualRowNumber = row.number;
        
        // Style status cell with color
        const statusCell = row.getCell(2);
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STATUS_COLORS[computedStatus] },
        };
        statusCell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 9 };
        statusCell.alignment = { horizontal: "center" };

        // Style weekend cells (only for cells outside the task bar)
        days.forEach((day, dayIndex) => {
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isInTaskRange = dayIndex >= startDayIndex && dayIndex <= endDayIndex;
          
          if (!isInTaskRange && isWeekend) {
            const cell = row.getCell(baseColumns.length + 1 + dayIndex);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE5E7EB" },
            };
          }
        });

        // Merge task bar cells (colored bar without text)
        if (startDayIndex !== -1 && endDayIndex !== -1) {
          const startCol = baseColumns.length + 1 + startDayIndex;
          const endCol = baseColumns.length + 1 + endDayIndex;
          
          // Merge cells for the task bar
          if (endCol > startCol) {
            worksheet.mergeCells(actualRowNumber, startCol, actualRowNumber, endCol);
          }
          
          // Style the merged cell (colored bar only)
          const taskBarCell = row.getCell(startCol);
          taskBarCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: STATUS_COLORS[computedStatus] },
          };
        }

        // Alternate row background for base columns
        if (rowIndex % 2 === 1) {
          for (let i = 1; i <= baseColumns.length; i++) {
            const cell = row.getCell(i);
            if (i !== 2) { // Skip status cell
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF9FAFB" },
              };
            }
          }
        }
      });

      // Add events section if there are any
      if (planningTodos.length > 0) {
        // Add empty row separator
        worksheet.addRow([]);
        
        // Add events header
        const eventsHeaderRow = worksheet.addRow(["◆ Événements"]);
        eventsHeaderRow.font = { bold: true, size: 11 };
        eventsHeaderRow.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4B5563" },
        };
        eventsHeaderRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.mergeCells(eventsHeaderRow.number, 1, eventsHeaderRow.number, baseColumns.length);

        // Add events data
        planningTodos.forEach((todo) => {
          const echeanceDate = new Date(todo.date_echeance!);
          const prioriteLabels: Record<string, string> = {
            HAUTE: "Haute",
            NORMALE: "Normale",
            BASSE: "Basse",
          };
          const statutLabels: Record<string, string> = {
            A_FAIRE: "À faire",
            EN_COURS: "En cours",
            TERMINE: "Terminé",
          };
          
          const rowData: Record<string, any> = {
            nom: `◆ ${todo.nom}`,
            statut: statutLabels[todo.statut] || todo.statut,
            date_debut: format(echeanceDate, "dd/MM/yyyy", { locale: fr }),
            date_fin: "-",
            duree: "-",
            heures_estimees: prioriteLabels[todo.priorite || "NORMALE"],
            heures_realisees: "-",
          };

          // Find event day index
          let eventDayIndex = -1;
          days.forEach((day, dayIndex) => {
            if (day.getTime() === echeanceDate.getTime()) {
              eventDayIndex = dayIndex;
            }
            rowData[`day_${dayIndex}`] = "";
          });

          const row = worksheet.addRow(rowData);
          
          // Style the event row
          row.getCell(1).font = { bold: true };
          row.getCell(2).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF6B7280" },
          };
          row.getCell(2).font = { color: { argb: "FFFFFFFF" }, size: 9 };
          row.getCell(2).alignment = { horizontal: "center" };

          // Mark the event day with diamond symbol
          if (eventDayIndex !== -1) {
            const eventCell = row.getCell(baseColumns.length + 1 + eventDayIndex);
            eventCell.value = "◆";
            eventCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4B5563" },
            };
            eventCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
            eventCell.alignment = { horizontal: "center" };
          }
        });
      }

      // Add borders to all cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E5E5" } },
            bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
            left: { style: "thin", color: { argb: "FFE5E5E5" } },
            right: { style: "thin", color: { argb: "FFE5E5E5" } },
          };
        });
      });

      // Freeze panes: columns A-G (7 columns) and rows 1-3 (headers)
      worksheet.views = [
        { state: "frozen", xSplit: baseColumns.length, ySplit: 3, topLeftCell: "H4" }
      ];

      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `planning-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Planning exporté en Excel");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
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
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goBackOneWeek} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={goToToday} className="text-primary font-medium px-3">
            Aujourd'hui
          </Button>
          <Button variant="ghost" size="icon" onClick={goForwardOneWeek} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowCreateDialog(true)} 
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ajouter une tâche</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Export Excel button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={exportToExcel} 
                  size="sm"
                  variant="outline"
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exporter en Excel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Gantt Chart - Always show grid with tasks overlay */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <EmptyGanttGrid 
          ref={ganttRef} 
          startDate={START_DATE} 
          numDays={NUM_DAYS} 
          numRows={taches.length + planningTodos.length}
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
              scrollContainerRef={ganttRef}
            />
          )}
          {planningTodos.length > 0 && (
            <EventMarkers
              todos={planningTodos}
              startDate={START_DATE}
              zoomLevel={zoomLevel}
              onEventClick={handleEventClick}
              tasksCount={taches.length}
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
        {planningTodos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-600 rotate-45" />
            <span>Événement</span>
          </div>
        )}
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

      {selectedTodo && (
        <TodoDetailDialog
          open={showTodoDetailDialog}
          onOpenChange={setShowTodoDetailDialog}
          todo={selectedTodo}
        />
      )}
    </div>
  );
};