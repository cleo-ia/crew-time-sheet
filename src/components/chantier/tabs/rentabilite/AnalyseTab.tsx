import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { HelpCircle, Pencil, Check, Clock, TrendingUp, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTachesChantier, TacheChantier } from "@/hooks/useTachesChantier";
import { useAchatsChantier } from "@/hooks/useAchatsChantier";
import { TaskDetailDialog } from "@/components/chantier/planning/TaskDetailDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnalyseTabProps {
  chantierId: string;
  montantVendu: number;
}

type ViewMode = "horaire" | "monetaire";

// Compute dynamic status based on dates (same logic as Gantt planning)
const getComputedStatus = (task: TacheChantier): TacheChantier["statut"] => {
  if (task.statut === "TERMINE") return "TERMINE";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateDebut = new Date(task.date_debut);
  const dateFin = new Date(task.date_fin);
  dateDebut.setHours(0, 0, 0, 0);
  dateFin.setHours(0, 0, 0, 0);

  if (today > dateFin) return "EN_RETARD";
  if (today >= dateDebut && today <= dateFin) return "EN_COURS";
  return "A_FAIRE";
};

const getStatusConfig = (status: TacheChantier["statut"]) => {
  switch (status) {
    case "TERMINE":
      return { label: "Terminé", variant: "default" as const, className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20" };
    case "EN_COURS":
      return { label: "En cours", variant: "default" as const, className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20" };
    case "EN_RETARD":
      return { label: "En retard", variant: "default" as const, className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20" };
    case "A_FAIRE":
    default:
      return { label: "À faire", variant: "default" as const, className: "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20" };
  }
};

export const AnalyseTab = ({ chantierId, montantVendu }: AnalyseTabProps) => {
  const queryClient = useQueryClient();
  const { data: taches = [], isLoading: isLoadingTaches } = useTachesChantier(chantierId);
  const { data: achatsData = [] } = useAchatsChantier(chantierId);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [venduInput, setVenduInput] = useState(montantVendu.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TacheChantier | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("horaire");

  const handleTaskDoubleClick = (task: TacheChantier) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  // Calculate totals from real tasks
  const totalHeuresEstimees = taches.reduce((sum, t) => sum + (t.heures_estimees ?? 0), 0);
  const totalHeuresRealisees = taches.reduce((sum, t) => sum + (t.heures_realisees ?? 0), 0);
  const totalMontantVendu = taches.reduce((sum, t) => sum + (t.montant_vendu ?? 0), 0);

  // Calculate achats totals
  const totalAchats = useMemo(() => 
    achatsData.reduce((sum, a) => sum + a.montant, 0), 
    [achatsData]
  );
  
  const achatsParTache = useMemo(() => {
    const map: Record<string, number> = {};
    achatsData.forEach(a => {
      if (a.tache_id) {
        map[a.tache_id] = (map[a.tache_id] || 0) + a.montant;
      }
    });
    return map;
  }, [achatsData]);

  // Computed values
  const mainOeuvre = 0; // Future: heures × taux horaire
  const achats = totalAchats;
  const sousTraitance = 0; // Future
  const coutsValue = mainOeuvre + achats + sousTraitance;
  const margeValue = montantVendu - coutsValue;
  const margePercent = montantVendu > 0 ? (margeValue / montantVendu) * 100 : 0;

  const donutData = [
    { name: "Marge", value: margePercent },
    { name: "Coûts", value: 100 - margePercent },
  ];

  const handleSaveVendu = async () => {
    const newValue = parseFloat(venduInput.replace(/\s/g, "").replace(",", ".")) || 0;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("chantiers")
      .update({ montant_vendu: newValue })
      .eq("id", chantierId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      toast.success("Montant vendu mis à jour");
      queryClient.invalidateQueries({ queryKey: ["chantier-detail", chantierId] });
      setIsPopoverOpen(false);
    }
    setIsSaving(false);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      setVenduInput(montantVendu.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top section: Single card with Donut + KPIs + Costs */}
      <Card>
        <CardContent className="py-8 px-10">
          <div className="flex items-center gap-12">
            {/* Donut Chart */}
            <div className="flex-shrink-0">
              <div className="h-[220px] w-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill="hsl(142, 76%, 36%)" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-green-600">{margePercent.toFixed(2)}%</span>
                  <span className="text-sm text-muted-foreground">de marge</span>
                </div>
              </div>
            </div>

            {/* KPIs Grid */}
            <div className="flex-1 grid grid-cols-3 gap-12">
              {/* MARGE Column */}
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {margeValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">MARGE</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{mainOeuvre.toLocaleString("fr-FR")}€</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="w-3 h-3 rounded-full bg-gray-400" />
                    <span>MAIN D'OEUVRE</span>
                    <HelpCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* VENDU Column */}
              <div className="space-y-6">
                <div>
                  <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
                    <PopoverTrigger asChild>
                      <div className="group cursor-pointer inline-flex items-center gap-2">
                        <p className="text-3xl font-bold hover:text-primary transition-colors">
                          €{montantVendu.toLocaleString("fr-FR")}
                        </p>
                        <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Modifier le montant vendu</p>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">€</span>
                          <Input
                            type="text"
                            value={venduInput}
                            onChange={(e) => setVenduInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveVendu();
                              if (e.key === "Escape") setIsPopoverOpen(false);
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button 
                            size="icon" 
                            onClick={handleSaveVendu} 
                            disabled={isSaving}
                            className="shrink-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">VENDU</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{achats.toLocaleString("fr-FR")}€</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>ACHATS</span>
                    <HelpCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* COÛTS Column */}
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-bold text-destructive">
                    {coutsValue.toLocaleString("fr-FR")}€
                  </p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">COÛTS</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{sousTraitance.toLocaleString("fr-FR")}€</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span>SOUS TRAITANCE</span>
                    <HelpCircle className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks table - Redesigned */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header with Toggle */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Rentabilité par tâche</h3>
              </div>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode("monetaire")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === "monetaire"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monétaire
                </button>
                <button
                  onClick={() => setViewMode("horaire")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === "horaire"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Horaire
                </button>
              </div>
            </div>
          </div>
          
          {viewMode === "horaire" ? (
            <>
              {/* Table Header - Horaire */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Tâches</div>
                <div className="col-span-2 text-center">Est.</div>
                <div className="col-span-3 text-center">Trav.</div>
                <div className="col-span-3 text-center">Marge</div>
              </div>
              
              {/* Table Body - Horaire */}
              <div className="divide-y">
                {isLoadingTaches ? (
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>Chargement des tâches...</p>
                  </div>
                ) : taches.length === 0 ? (
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <p className="text-sm">Aucune tâche définie pour ce chantier</p>
                    <p className="text-xs mt-1">Créez des tâches dans l'onglet Planning</p>
                  </div>
                ) : (
                  taches.map((task) => {
                    const computedStatus = getComputedStatus(task);
                    const statusConfig = getStatusConfig(computedStatus);
                    const heuresEstimees = task.heures_estimees ?? 0;
                    const heuresRealisees = task.heures_realisees ?? 0;
                    const margeHeures = heuresEstimees - heuresRealisees;
                    
                    return (
                      <div 
                        key={task.id} 
                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                        onDoubleClick={() => handleTaskDoubleClick(task)}
                      >
                        {/* Task Name + Status Badge */}
                        <div className="col-span-4 space-y-1">
                          <p className="font-medium text-sm">{task.nom}</p>
                          <Badge variant={statusConfig.variant} className={`${statusConfig.className} text-xs font-medium`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        {/* Estimated Hours */}
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-medium tabular-nums">{heuresEstimees}h</span>
                        </div>
                        
                        {/* Worked Hours */}
                        <div className="col-span-3 text-center">
                          <span className="text-sm font-medium tabular-nums">{heuresRealisees}h</span>
                        </div>
                        
                        {/* Margin in Hours */}
                        <div className="col-span-3 text-center">
                          <span className={`text-sm font-medium tabular-nums ${margeHeures >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {margeHeures}h
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Footer / Totals - Horaire */}
              {taches.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 border-t items-center">
                  <div className="col-span-4">
                    <span className="font-semibold text-sm">Total</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="font-semibold text-sm tabular-nums">{totalHeuresEstimees}h</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <span className="font-semibold text-sm tabular-nums">{totalHeuresRealisees}h</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <span className={`font-semibold text-sm tabular-nums ${(totalHeuresEstimees - totalHeuresRealisees) >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {totalHeuresEstimees - totalHeuresRealisees}h
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Table Header - Monétaire */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-3">Tâches</div>
                <div className="col-span-2 text-center">Vendu</div>
                <div className="col-span-2 text-center flex items-center justify-center gap-1">
                  <span>MO</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Main d'œuvre</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="col-span-2 text-center">Achats</div>
                <div className="col-span-1 text-center flex items-center justify-center gap-1">
                  <span>ST</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sous-traitance</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="col-span-2 text-center">Marge</div>
              </div>
              
              {/* Table Body - Monétaire */}
              <div className="divide-y">
                {isLoadingTaches ? (
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>Chargement des tâches...</p>
                  </div>
                ) : taches.length === 0 ? (
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <p className="text-sm">Aucune tâche définie pour ce chantier</p>
                    <p className="text-xs mt-1">Créez des tâches dans l'onglet Planning</p>
                  </div>
                ) : (
                  taches.map((task) => {
                    const computedStatus = getComputedStatus(task);
                    const statusConfig = getStatusConfig(computedStatus);
                    
                    return (
                      <div 
                        key={task.id} 
                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                        onDoubleClick={() => handleTaskDoubleClick(task)}
                      >
                        {/* Task Name + Status Badge */}
                        <div className="col-span-3 space-y-1">
                          <p className="font-medium text-sm">{task.nom}</p>
                          <Badge variant={statusConfig.variant} className={`${statusConfig.className} text-xs font-medium`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        {/* Vendu */}
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-medium tabular-nums">{(task.montant_vendu ?? 0).toLocaleString("fr-FR")}€</span>
                        </div>
                        
                        {/* MO (Main d'œuvre) */}
                        <div className="col-span-2 text-center">
                          <span className="text-sm text-muted-foreground tabular-nums">0€</span>
                        </div>
                        
                        {/* Achats */}
                        <div className="col-span-2 text-center">
                          <span className="text-sm tabular-nums">{(achatsParTache[task.id] ?? 0).toLocaleString("fr-FR")}€</span>
                        </div>
                        
                        {/* ST (Sous-traitance) */}
                        <div className="col-span-1 text-center">
                          <span className="text-sm text-muted-foreground tabular-nums">0€</span>
                        </div>
                        
                        {/* Marge (Vendu - MO - Achats - ST) */}
                        <div className="col-span-2 text-center">
                          {(() => {
                            const taskVendu = task.montant_vendu ?? 0;
                            const taskAchats = achatsParTache[task.id] ?? 0;
                            const taskMarge = taskVendu - taskAchats; // MO and ST will be added later
                            return (
                              <span className={`text-sm font-medium tabular-nums ${taskMarge >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {taskMarge.toLocaleString("fr-FR")}€
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Footer / Totals - Monétaire */}
              {taches.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 border-t items-center">
                  <div className="col-span-3">
                    <span className="font-semibold text-sm">Total</span>
                    <span className="text-xs text-muted-foreground ml-2">({taches.length} tâches)</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="font-semibold text-sm tabular-nums">{totalMontantVendu.toLocaleString("fr-FR")}€</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="font-semibold text-sm text-muted-foreground tabular-nums">0€</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="font-semibold text-sm tabular-nums">{totalAchats.toLocaleString("fr-FR")}€</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="font-semibold text-sm text-muted-foreground tabular-nums">0€</span>
                  </div>
                  <div className="col-span-2 text-center">
                    {(() => {
                      const totalMarge = totalMontantVendu - totalAchats;
                      return (
                        <span className={`font-semibold text-sm tabular-nums ${totalMarge >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {totalMarge.toLocaleString("fr-FR")}€
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        tache={selectedTask}
        chantierId={chantierId}
        initialTab="rentabilite"
      />
    </div>
  );
};
