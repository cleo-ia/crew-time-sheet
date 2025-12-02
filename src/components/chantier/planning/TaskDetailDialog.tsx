import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Save, FileText, Calendar, ClipboardList } from "lucide-react";
import { useUpdateTache } from "@/hooks/useUpdateTache";
import { useDeleteTache } from "@/hooks/useDeleteTache";
import { TacheChantier } from "@/hooks/useTachesChantier";
import { toast } from "sonner";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tache: TacheChantier | null;
  chantierId: string;
}

const STATUTS = [
  { value: "A_FAIRE", label: "À faire", color: "bg-orange-500" },
  { value: "EN_COURS", label: "En cours", color: "bg-blue-500" },
  { value: "TERMINE", label: "Terminé", color: "bg-green-500" },
  { value: "EN_RETARD", label: "En retard", color: "bg-red-500" },
];

const COULEURS = [
  { value: "#3b82f6", label: "Bleu" },
  { value: "#22c55e", label: "Vert" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ec4899", label: "Rose" },
  { value: "#eab308", label: "Jaune" },
];

export const TaskDetailDialog = ({ open, onOpenChange, tache, chantierId }: TaskDetailDialogProps) => {
  const updateTache = useUpdateTache();
  const deleteTache = useDeleteTache();

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    date_debut: "",
    date_fin: "",
    heures_estimees: "",
    heures_realisees: "",
    statut: "A_FAIRE" as TacheChantier["statut"],
    couleur: "#3b82f6",
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
        couleur: tache.couleur || "#3b82f6",
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
      couleur: formData.couleur,
    });

    toast.success("Tâche mise à jour");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!tache) return;
    await deleteTache.mutateAsync({ id: tache.id, chantier_id: chantierId });
    onOpenChange(false);
  };

  if (!tache) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: formData.couleur }} />
            {formData.nom || "Détail de la tâche"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="recap" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recap" className="gap-1">
              <ClipboardList className="h-4 w-4" />
              Récap
            </TabsTrigger>
            <TabsTrigger value="dates" className="gap-1">
              <Calendar className="h-4 w-4" />
              Dates
            </TabsTrigger>
            <TabsTrigger value="fichiers" className="gap-1">
              <FileText className="h-4 w-4" />
              Fichiers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recap" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom de la tâche</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select 
                value={formData.statut} 
                onValueChange={(v) => setFormData({ ...formData, statut: v as TacheChantier["statut"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Couleur</Label>
              <Select value={formData.couleur} onValueChange={(v) => setFormData({ ...formData, couleur: v })}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.couleur }} />
                      {COULEURS.find(c => c.value === formData.couleur)?.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COULEURS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="dates" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_debut">Date début</Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_fin">Date fin</Label>
                <Input
                  id="date_fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  min={formData.date_debut}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heures_estimees">Heures estimées</Label>
                <Input
                  id="heures_estimees"
                  type="number"
                  value={formData.heures_estimees}
                  onChange={(e) => setFormData({ ...formData, heures_estimees: e.target.value })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heures_realisees">Heures réalisées</Label>
                <Input
                  id="heures_realisees"
                  type="number"
                  value={formData.heures_realisees}
                  onChange={(e) => setFormData({ ...formData, heures_realisees: e.target.value })}
                  min={0}
                />
              </div>
            </div>

            {formData.heures_estimees && formData.heures_realisees && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Progression : {Math.round((parseInt(formData.heures_realisees) / parseInt(formData.heures_estimees)) * 100)}%
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fichiers" className="mt-4">
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Aucun fichier attaché</p>
              <p className="text-xs">Cette fonctionnalité sera disponible prochainement</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
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
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={updateTache.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateTache.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
