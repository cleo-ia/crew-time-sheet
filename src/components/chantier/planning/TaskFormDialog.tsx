import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTache } from "@/hooks/useCreateTache";
import { format, addDays } from "date-fns";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
}

export const TaskFormDialog = ({ open, onOpenChange, chantierId }: TaskFormDialogProps) => {
  const createTache = useCreateTache();
  const today = format(new Date(), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    date_debut: today,
    date_fin: nextWeek,
    heures_estimees: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) return;

    await createTache.mutateAsync({
      chantier_id: chantierId,
      nom: formData.nom.trim(),
      description: formData.description.trim() || undefined,
      date_debut: formData.date_debut,
      date_fin: formData.date_fin,
      heures_estimees: formData.heures_estimees ? parseInt(formData.heures_estimees) : undefined,
    });

    // Reset form and close
    setFormData({
      nom: "",
      description: "",
      date_debut: today,
      date_fin: nextWeek,
      heures_estimees: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la tâche *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Fondations"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description optionnelle..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date début *</Label>
              <Input
                id="date_debut"
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_fin">Date fin *</Label>
              <Input
                id="date_fin"
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                min={formData.date_debut}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heures_estimees">Heures estimées</Label>
            <Input
              id="heures_estimees"
              type="number"
              value={formData.heures_estimees}
              onChange={(e) => setFormData({ ...formData, heures_estimees: e.target.value })}
              placeholder="Ex: 40"
              min={0}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createTache.isPending}>
              {createTache.isPending ? "Création..." : "Créer la tâche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
