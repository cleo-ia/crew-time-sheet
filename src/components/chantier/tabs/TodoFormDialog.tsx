import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTodo } from "@/hooks/useCreateTodo";

interface TodoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
}

export const TodoFormDialog = ({ open, onOpenChange, chantierId }: TodoFormDialogProps) => {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<"BASSE" | "NORMALE" | "HAUTE">("NORMALE");
  const [dateEcheance, setDateEcheance] = useState("");

  const createTodo = useCreateTodo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    await createTodo.mutateAsync({
      chantier_id: chantierId,
      nom: nom.trim(),
      description: description.trim() || undefined,
      priorite,
      date_echeance: dateEcheance || undefined,
    });

    // Reset form
    setNom("");
    setDescription("");
    setPriorite("NORMALE");
    setDateEcheance("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau Todo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Titre *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Commander matériaux"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails supplémentaires..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="date_echeance">Échéance</Label>
              <Input
                id="date_echeance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nom.trim() || createTodo.isPending}>
              {createTodo.isPending ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
