import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateUtilisateur, useUpdateUtilisateur } from "@/hooks/useUtilisateurs";

interface InterimaireFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInterimaire?: any;
  onSuccess?: (createdInterimaire?: any) => void;
}

export const InterimaireFormDialog = ({
  open,
  onOpenChange,
  editingInterimaire,
  onSuccess,
}: InterimaireFormDialogProps) => {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    agence_interim: "",
  });

  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();

  // Remplir le formulaire si on édite un intérimaire
  useEffect(() => {
    if (editingInterimaire) {
      setFormData({
        nom: editingInterimaire.nom || "",
        prenom: editingInterimaire.prenom || "",
        email: editingInterimaire.email || "",
        agence_interim: editingInterimaire.agence_interim || "",
      });
    } else {
      setFormData({ nom: "", prenom: "", email: "", agence_interim: "" });
    }
  }, [editingInterimaire, open]);

  const handleSave = async () => {
    try {
      if (editingInterimaire) {
        await updateUtilisateur.mutateAsync({
          id: editingInterimaire.id,
          ...formData,
        });
        onSuccess?.();
      } else {
        const result = await createUtilisateur.mutateAsync({
          ...formData,
        });
        onSuccess?.(result);
      }
      onOpenChange(false);
      setFormData({ nom: "", prenom: "", email: "", agence_interim: "" });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingInterimaire ? "Modifier l'intérimaire" : "Nouvel intérimaire"}
          </DialogTitle>
          <DialogDescription>
            Renseignez les informations de l'intérimaire et le contact de son agence
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                placeholder="Dupont"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input
                placeholder="Jean"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email de l'agence *</Label>
            <Input
              type="email"
              placeholder="contact@manpower-bordeaux.fr"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Agence d'intérim</Label>
            <Input
              placeholder="Ex: Manpower, Adecco, Randstad..."
              value={formData.agence_interim}
              onChange={(e) => setFormData({ ...formData, agence_interim: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            {editingInterimaire ? "Modifier" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
