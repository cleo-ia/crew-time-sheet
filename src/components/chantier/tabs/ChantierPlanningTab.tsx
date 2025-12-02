import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyGanttGrid, EmptyGanttGridRef, ZoomLevel } from "@/components/chantier/planning/EmptyGanttGrid";
import { TaskBars } from "@/components/chantier/planning/TaskBars";
import { TaskFormDialog } from "@/components/chantier/planning/TaskFormDialog";
import { TaskDetailDialog } from "@/components/chantier/planning/TaskDetailDialog";
import { useTachesChantier, TacheChantier } from "@/hooks/useTachesChantier";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const [isExporting, setIsExporting] = useState(false);
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

  const exportToExcel = async () => {
    if (taches.length === 0) {
      toast.error("Aucune tâche à exporter");
      return;
    }

    setIsExporting(true);
    toast.info("Export en cours...");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Planning");

      // Define columns
      worksheet.columns = [
        { header: "Tâche", key: "nom", width: 30 },
        { header: "Statut", key: "statut", width: 15 },
        { header: "Date début", key: "date_debut", width: 15 },
        { header: "Date fin", key: "date_fin", width: 15 },
        { header: "Durée (jours)", key: "duree", width: 15 },
        { header: "Heures estimées", key: "heures_estimees", width: 18 },
        { header: "Heures réalisées", key: "heures_realisees", width: 18 },
        { header: "Description", key: "description", width: 40 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF97316" }, // Orange
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 25;

      // Add data rows
      taches.forEach((tache) => {
        const dateDebut = new Date(tache.date_debut);
        const dateFin = new Date(tache.date_fin);
        const duree = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        worksheet.addRow({
          nom: tache.nom,
          statut: STATUS_LABELS[tache.statut] || tache.statut,
          date_debut: format(dateDebut, "dd/MM/yyyy", { locale: fr }),
          date_fin: format(dateFin, "dd/MM/yyyy", { locale: fr }),
          duree,
          heures_estimees: tache.heures_estimees || "-",
          heures_realisees: tache.heures_realisees || "-",
          description: tache.description || "",
        });
      });

      // Style data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE5E5E5" } },
              bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
              left: { style: "thin", color: { argb: "FFE5E5E5" } },
              right: { style: "thin", color: { argb: "FFE5E5E5" } },
            };
          });
          // Alternate row colors
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" },
            };
          }
        }
      });

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