import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Clock, X, MoreHorizontal, Plus, Send, Trash2, HelpCircle, FileText } from "lucide-react";
import { useUpdateTache } from "@/hooks/useUpdateTache";
import { useDeleteTache } from "@/hooks/useDeleteTache";
import { TacheChantier } from "@/hooks/useTachesChantier";
import { toast } from "sonner";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tache: TacheChantier | null;
  chantierId: string;
}

const STATUTS = [
  { value: "A_FAIRE", label: "À faire", color: "bg-gray-400", textColor: "text-gray-700", badgeBg: "bg-gray-100" },
  { value: "EN_COURS", label: "En cours", color: "bg-orange-400", textColor: "text-orange-700", badgeBg: "bg-orange-100" },
  { value: "TERMINE", label: "Terminé", color: "bg-green-500", textColor: "text-green-700", badgeBg: "bg-green-100" },
  { value: "EN_RETARD", label: "En retard", color: "bg-red-500", textColor: "text-red-700", badgeBg: "bg-red-100" },
];

export const TaskDetailDialog = ({ open, onOpenChange, tache, chantierId }: TaskDetailDialogProps) => {
  const updateTache = useUpdateTache();
  const deleteTache = useDeleteTache();
  const [comment, setComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    date_debut: "",
    date_fin: "",
    heures_estimees: "",
    heures_realisees: "",
    statut: "A_FAIRE" as TacheChantier["statut"],
  });

  useEffect(() => {
    if (tache) {
      setFormData({
        nom: tache.nom,
        description: tache.description || "",
        date_debut: tache.date_debut,
        date_fin: tache.date_fin,
        heures_estimees: tache.heures_estimees?.toString() || "",
        heures_realisees: tache.heures_realisees?.toString() || "",
        statut: tache.statut,
      });
    }
  }, [tache]);

  const handleSave = async () => {
    if (!tache || !formData.nom.trim()) return;

    await updateTache.mutateAsync({
      id: tache.id,
      chantier_id: chantierId,
      nom: formData.nom.trim(),
      description: formData.description.trim() || null,
      date_debut: formData.date_debut,
      date_fin: formData.date_fin,
      heures_estimees: formData.heures_estimees ? parseInt(formData.heures_estimees) : null,
      heures_realisees: formData.heures_realisees ? parseInt(formData.heures_realisees) : null,
      statut: formData.statut,
    });

    toast.success("Tâche mise à jour");
  };

  const handleDelete = async () => {
    if (!tache) return;
    await deleteTache.mutateAsync({ id: tache.id, chantier_id: chantierId });
    onOpenChange(false);
  };

  // Auto-save on field change (debounced via blur or select change)
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = () => {
    if (tache) {
      handleSave();
    }
  };

  if (!tache) return null;

  // Calculate status info
  const today = startOfDay(new Date());
  const endDate = parseISO(formData.date_fin);
  const isLate = isAfter(today, endDate) && formData.statut !== "TERMINE";
  const effectiveStatus = isLate ? "EN_RETARD" : formData.statut;
  const statusInfo = STATUTS.find(s => s.value === effectiveStatus) || STATUTS[0];

  // Progress calculation
  const heuresRealisees = parseFloat(formData.heures_realisees) || 0;
  const heuresEstimees = parseFloat(formData.heures_estimees) || 0;
  const progressPercent = heuresEstimees > 0 ? Math.min(100, (heuresRealisees / heuresEstimees) * 100) : 0;

  // Format dates for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  // Late message
  const getLateMessage = () => {
    if (!isLate) return null;
    try {
      return `Devait se terminer le ${format(endDate, "d MMMM", { locale: fr })}`;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border/50">
          {/* Top row: title + actions */}
          <div className="flex items-start justify-between gap-3">
            <Input
              value={formData.nom}
              onChange={(e) => handleFieldChange("nom", e.target.value)}
              onBlur={handleFieldBlur}
              className="text-4xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Nom de la tâche"
            />
            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la tâche ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. La tâche "{tache.nom}" sera définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Status badge + late message */}
          <div className="flex items-center gap-3 mt-3">
            <Badge className={`${statusInfo.badgeBg} ${statusInfo.textColor} border-0 gap-1.5 px-3 py-1`}>
              {isLate && <Clock className="h-3.5 w-3.5" />}
              {statusInfo.label}
            </Badge>
            {getLateMessage() && (
              <span className="text-sm text-muted-foreground">{getLateMessage()}</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-4 mt-6">
            <span className="text-base font-semibold text-muted-foreground shrink-0 w-14">{heuresRealisees}h</span>
            <Progress value={progressPercent} className="h-4 flex-1" indicatorClassName="bg-orange-500" />
            <span className="text-base font-semibold text-muted-foreground shrink-0 w-14 text-right">{heuresEstimees}h</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="recap" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-5 shrink-0">
            <TabsTrigger 
              value="recap" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              Récap
            </TabsTrigger>
            <TabsTrigger 
              value="date" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              Date
            </TabsTrigger>
            <TabsTrigger 
              value="rentabilite" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              Rentabilité
            </TabsTrigger>
            <TabsTrigger 
              value="fichiers" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              Fichiers
            </TabsTrigger>
          </TabsList>

          {/* Récap Tab */}
          <TabsContent value="recap" className="p-5 space-y-5 mt-0 flex-1 overflow-y-auto">
            {/* Statut + Lot */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Select 
                  value={formData.statut} 
                  onValueChange={(v) => {
                    handleFieldChange("statut", v);
                    // Auto-save immediately for select
                    setTimeout(() => handleSave(), 0);
                  }}
                >
                  <SelectTrigger className="w-auto h-8 border-0 bg-transparent shadow-none p-0 gap-1.5">
                    <Badge className={`${statusInfo.badgeBg} ${statusInfo.textColor} border-0 px-3 py-1`}>
                      {STATUTS.find(s => s.value === formData.statut)?.label}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Lot</span>
                <HelpCircle className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground italic">Vide</span>
              </div>
            </div>

            {/* Dates with datepicker */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Date de début</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-medium h-10",
                        !formData.date_debut && "text-muted-foreground"
                      )}
                    >
                      {formData.date_debut ? formatDateDisplay(formData.date_debut) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date_debut ? parseISO(formData.date_debut) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleFieldChange("date_debut", format(date, "yyyy-MM-dd"));
                          handleSave();
                        }
                      }}
                      locale={fr}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Date de fin</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-medium h-10",
                        !formData.date_fin && "text-muted-foreground"
                      )}
                    >
                      {formData.date_fin ? formatDateDisplay(formData.date_fin) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date_fin ? parseISO(formData.date_fin) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleFieldChange("date_fin", format(date, "yyyy-MM-dd"));
                          handleSave();
                        }
                      }}
                      disabled={(date) => formData.date_debut ? date < parseISO(formData.date_debut) : false}
                      locale={fr}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Description */}
            <Textarea
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Insérez une description ici ..."
              className="min-h-[100px] resize-none bg-muted/30 text-sm"
            />
          </TabsContent>

          {/* Date Tab */}
          <TabsContent value="date" className="p-5 space-y-5 mt-0 flex-1 overflow-y-auto">
            <h4 className="font-semibold text-base">Date estimée</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Date de début</span>
                <Input
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => handleFieldChange("date_debut", e.target.value)}
                  onBlur={handleFieldBlur}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Date de fin</span>
                <Input
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => handleFieldChange("date_fin", e.target.value)}
                  onBlur={handleFieldBlur}
                  min={formData.date_debut}
                  className="h-10"
                />
              </div>
            </div>

            {/* Hours */}
            <h4 className="font-semibold text-base pt-2">Heures</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Heures estimées</span>
                <Input
                  type="number"
                  value={formData.heures_estimees}
                  onChange={(e) => handleFieldChange("heures_estimees", e.target.value)}
                  onBlur={handleFieldBlur}
                  min={0}
                  className="h-10"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Heures réalisées</span>
                <Input
                  type="number"
                  value={formData.heures_realisees}
                  onChange={(e) => handleFieldChange("heures_realisees", e.target.value)}
                  onBlur={handleFieldBlur}
                  min={0}
                  className="h-10"
                  placeholder="0"
                />
              </div>
            </div>
          </TabsContent>

          {/* Rentabilité Tab */}
          <TabsContent value="rentabilite" className="p-5 space-y-6 mt-0 flex-1 overflow-y-auto">
            {/* Coûts summary */}
            <div>
              <h4 className="font-semibold text-base mb-3">Coûts</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground uppercase bg-muted/50 px-3 py-2.5">
                  <span>Main d'oeuvre</span>
                  <span>Achats</span>
                  <span>Sous-traitance</span>
                  <span>Total</span>
                </div>
                <div className="grid grid-cols-4 px-3 py-3 text-sm font-semibold">
                  <span>0€</span>
                  <span>0€</span>
                  <span>0€</span>
                  <span>0€</span>
                </div>
              </div>
            </div>

            {/* Feuilles heures */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-base">Feuilles heures</h4>
                <Button variant="default" size="icon" className="h-8 w-8 rounded-lg bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground uppercase bg-muted/50 px-3 py-2.5">
                  <span>Date</span>
                  <span>Ouvrier</span>
                  <span>Heures</span>
                  <span>Coût</span>
                </div>
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Aucune entrée
                </div>
              </div>
            </div>

            {/* Achats et sous-traitance */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-base">Achats et sous-traitance</h4>
                <Button variant="default" size="icon" className="h-8 w-8 rounded-lg bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground uppercase bg-muted/50 px-3 py-2.5">
                  <span>Date</span>
                  <span>Achat</span>
                  <span>Qté</span>
                  <span>Coût</span>
                </div>
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">Aucun achat ajouté</p>
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 h-9 px-4">
                      Ajouter un achat
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 h-9 px-4">
                      <span className="text-muted-foreground">⏵</span>
                      Tutoriel vidéo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Fichiers Tab */}
          <TabsContent value="fichiers" className="p-5 mt-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-base">Fichiers</h4>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="border rounded-lg p-10 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-4">Aucun fichier</p>
              <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 h-9 px-4">
                Ajouter un fichier
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer - Comment section */}
        <div className="border-t p-4 flex items-center gap-3 shrink-0 bg-muted/20">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentez ici ..."
            className="flex-1 h-10 bg-background"
          />
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-10 w-10 shrink-0 rounded-lg bg-orange-500 hover:bg-orange-600">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
