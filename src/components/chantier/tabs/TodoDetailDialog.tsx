import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { TodoChantier } from "@/hooks/useTodosChantier";
import { useUpdateTodo } from "@/hooks/useUpdateTodo";
import { useDeleteTodo } from "@/hooks/useDeleteTodo";

interface TodoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoChantier;
}

export const TodoDetailDialog = ({ open, onOpenChange, todo }: TodoDetailDialogProps) => {
  const [nom, setNom] = useState(todo.nom);
  const [description, setDescription] = useState(todo.description || "");
  const [statut, setStatut] = useState(todo.statut);
  const [priorite, setPriorite] = useState(todo.priorite || "NORMALE");
  const [dateEcheance, setDateEcheance] = useState(todo.date_echeance || "");

  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  // Reset form when todo changes
  useEffect(() => {
    setNom(todo.nom);
    setDescription(todo.description || "");
    setStatut(todo.statut);
    setPriorite(todo.priorite || "NORMALE");
    setDateEcheance(todo.date_echeance || "");
  }, [todo]);

  const handleSave = async () => {
    if (!nom.trim()) return;

    await updateTodo.mutateAsync({
      id: todo.id,
      chantier_id: todo.chantier_id,
      nom: nom.trim(),
      description: description.trim() || null,
      statut,
      priorite: priorite as any,
      date_echeance: dateEcheance || null,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteTodo.mutateAsync({
      id: todo.id,
      chantier_id: todo.chantier_id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Détail du Todo</DialogTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce todo ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le todo sera définitivement supprimé.
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
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Titre *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A_FAIRE">À faire</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="TERMINE">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priorite} onValueChange={(v) => setPriorite(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASSE">Basse</SelectItem>
                  <SelectItem value="NORMALE">Normale</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_echeance">Échéance</Label>
            <Input
              id="date_echeance"
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!nom.trim() || updateTodo.isPending}>
              {updateTodo.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
