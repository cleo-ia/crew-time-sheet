import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateUtilisateur, useUpdateUtilisateur } from "@/hooks/useUtilisateurs";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { AgenceInterimCombobox } from "./AgenceInterimCombobox";

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
    agence_interim: "",
  });

  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const { toast } = useToast();

  // Remplir le formulaire si on édite un intérimaire
  useEffect(() => {
    if (editingInterimaire) {
      setFormData({
        nom: editingInterimaire.nom || "",
        prenom: editingInterimaire.prenom || "",
        agence_interim: editingInterimaire.agence_interim || "",
      });
    } else {
      setFormData({ nom: "", prenom: "", agence_interim: "" });
    }
  }, [editingInterimaire, open]);

  const handleSave = async () => {
    if (!formData.agence_interim.trim()) {
      toast({
        title: "Champ obligatoire",
        description: "L'agence d'intérim doit être renseignée",
        variant: "destructive",
      });
      return;
    }
    
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
      setFormData({ nom: "", prenom: "", agence_interim: "" });
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
            <Label>Agence d'intérim *</Label>
            <AgenceInterimCombobox
              value={formData.agence_interim}
              onChange={(val) => setFormData({ ...formData, agence_interim: val })}
            />
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Pensez à préciser la ville de l'agence
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!formData.agence_interim.trim() || createUtilisateur.isPending || updateUtilisateur.isPending}>
            {createUtilisateur.isPending ? "Création..." : (editingInterimaire ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
