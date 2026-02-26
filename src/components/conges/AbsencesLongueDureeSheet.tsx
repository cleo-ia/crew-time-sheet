import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Calendar } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  useAbsencesLongueDuree,
  useCreateAbsenceLongueDuree,
  useUpdateAbsenceLongueDuree,
  useDeleteAbsenceLongueDuree,
  type AbsenceLongueDuree,
} from "@/hooks/useAbsencesLongueDuree";
import { EmployeeCombobox } from "@/components/rh/EmployeeCombobox";

const TYPE_ABSENCE_LABELS: Record<string, string> = {
  AT: "Accident du travail",
  AM: "Arrêt maladie",
  MP: "Maladie professionnelle",
  CONGE_PARENTAL: "Congé parental",
  CP: "Congés payés",
  CONTRAT_ARRETE: "Contrat arrêté",
  CONTRAT_NON_DEBUTE: "Contrat non débuté",
};

// Subset pertinent pour les absences longue durée
const TYPES_LONGUE_DUREE = ["AT", "AM", "MP", "CONGE_PARENTAL", "CONTRAT_ARRETE", "CONTRAT_NON_DEBUTE"];

interface AbsencesLongueDureeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepriseId: string;
}

export const AbsencesLongueDureeSheet = ({
  open,
  onOpenChange,
  entrepriseId,
}: AbsencesLongueDureeSheetProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<AbsenceLongueDuree | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [salarieId, setSalarieId] = useState("");
  const [typeAbsence, setTypeAbsence] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");

  const { data: absences = [], isLoading } = useAbsencesLongueDuree(entrepriseId);
  const createMutation = useCreateAbsenceLongueDuree();
  const updateMutation = useUpdateAbsenceLongueDuree();
  const deleteMutation = useDeleteAbsenceLongueDuree();

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUserId();
  }, []);

  const resetForm = () => {
    setSalarieId("");
    setTypeAbsence("");
    setDateDebut("");
    setDateFin("");
    setMotif("");
    setEditingAbsence(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (absence: AbsenceLongueDuree) => {
    setEditingAbsence(absence);
    setSalarieId(absence.salarie_id);
    setTypeAbsence(absence.type_absence);
    setDateDebut(absence.date_debut);
    setDateFin(absence.date_fin || "");
    setMotif(absence.motif || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!salarieId || !typeAbsence || !dateDebut) return;

    if (editingAbsence) {
      await updateMutation.mutateAsync({
        id: editingAbsence.id,
        type_absence: typeAbsence,
        date_fin: dateFin || null,
        motif: motif || null,
      });
    } else {
      await createMutation.mutateAsync({
        salarie_id: salarieId,
        entreprise_id: entrepriseId,
        type_absence: typeAbsence,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        motif: motif || null,
        created_by: currentUserId,
      });
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const today = new Date();
  const actives = absences.filter(
    (a) => !a.date_fin || isAfter(parseISO(a.date_fin), today)
  );
  const terminees = absences.filter(
    (a) => a.date_fin && isBefore(parseISO(a.date_fin), today)
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Absences longue durée
              {actives.length > 0 && (
                <Badge variant="secondary">{actives.length} active(s)</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <Tabs defaultValue="en-cours">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="en-cours" className="flex-1">
                  En cours {actives.length > 0 && `(${actives.length})`}
                </TabsTrigger>
                <TabsTrigger value="historique" className="flex-1">
                  Historique {terminees.length > 0 && `(${terminees.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="en-cours">
                <Button onClick={handleOpenCreate} size="sm" className="w-full mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Déclarer une absence longue durée
                </Button>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <p className="text-muted-foreground text-center py-8">Chargement...</p>
                    ) : actives.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Aucune absence en cours
                      </p>
                    ) : (
                      actives.map((absence) => (
                        <AbsenceCard
                          key={absence.id}
                          absence={absence}
                          onEdit={() => handleOpenEdit(absence)}
                          onDelete={() => setDeleteId(absence.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="historique">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <p className="text-muted-foreground text-center py-8">Chargement...</p>
                    ) : terminees.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Aucune absence terminée
                      </p>
                    ) : (
                      terminees.map((absence) => (
                        <AbsenceCard
                          key={absence.id}
                          absence={absence}
                          readOnly
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAbsence ? "Modifier l'absence" : "Déclarer une absence longue durée"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingAbsence && (
              <div>
                <label className="text-sm font-medium mb-1 block">Salarié</label>
              <EmployeeCombobox
                  value={salarieId}
                  onChange={setSalarieId}
                />
              </div>
            )}
            {editingAbsence && (
              <div>
                <label className="text-sm font-medium mb-1 block">Salarié</label>
                <p className="text-sm text-muted-foreground">
                  {editingAbsence.salarie?.prenom} {editingAbsence.salarie?.nom}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Type d'absence</label>
              <Select value={typeAbsence} onValueChange={setTypeAbsence}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_LONGUE_DUREE.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_ABSENCE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date début</label>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  disabled={!!editingAbsence}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date fin (optionnel)</label>
                <Input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Motif (optionnel)</label>
              <Textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Précisions sur l'absence..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!salarieId || !typeAbsence || !dateDebut || createMutation.isPending || updateMutation.isPending}
            >
              {editingAbsence ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette absence ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les fiches déjà générées ne seront pas supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function AbsenceCard({
  absence,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  absence: AbsenceLongueDuree;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const today = new Date();
  const isActive = !absence.date_fin || isAfter(parseISO(absence.date_fin), today);

  return (
    <Card className={`border-border/50 ${readOnly ? "opacity-75" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {absence.salarie?.prenom} {absence.salarie?.nom}
              </span>
              <Badge variant={isActive ? "default" : "secondary"} className="text-xs shrink-0">
                {TYPE_ABSENCE_LABELS[absence.type_absence] || absence.type_absence}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Depuis le {format(parseISO(absence.date_debut), "dd MMM yyyy", { locale: fr })}
                {absence.date_fin && (
                  <> → {format(parseISO(absence.date_fin), "dd MMM yyyy", { locale: fr })}</>
                )}
                {!absence.date_fin && <span className="text-orange-600 dark:text-orange-400"> (indéterminée)</span>}
              </span>
            </div>
            {absence.motif && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{absence.motif}</p>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
