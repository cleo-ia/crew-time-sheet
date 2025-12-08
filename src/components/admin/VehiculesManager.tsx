import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  useVehicules,
  useCreateVehicule,
  useUpdateVehicule,
  useDeleteVehicule,
  type Vehicule,
} from "@/hooks/useVehicules";

export const VehiculesManager = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<string | null>(null);
  const [deletingVehicule, setDeletingVehicule] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    actif: true,
  });

  const { data: vehicules, isLoading } = useVehicules();
  const createVehicule = useCreateVehicule();
  const updateVehicule = useUpdateVehicule();
  const deleteVehicule = useDeleteVehicule();

  const handleOpenDialog = (vehicule?: Vehicule) => {
    if (vehicule) {
      setEditingVehicule(vehicule.id);
      setFormData({
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque || "",
        modele: vehicule.modele || "",
        actif: vehicule.actif,
      });
    } else {
      setEditingVehicule(null);
      setFormData({ immatriculation: "", marque: "", modele: "", actif: true });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingVehicule(null);
    setFormData({ immatriculation: "", marque: "", modele: "", actif: true });
  };

  const handleSubmit = async () => {
    if (editingVehicule) {
      await updateVehicule.mutateAsync({
        id: editingVehicule,
        ...formData,
      });
    } else {
      await createVehicule.mutateAsync(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (deletingVehicule) {
      await deleteVehicule.mutateAsync(deletingVehicule);
      setDeletingVehicule(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des véhicules</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un véhicule
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicules?.map((vehicule) => (
              <TableRow key={vehicule.id}>
                <TableCell className="font-medium">
                  {vehicule.immatriculation}
                </TableCell>
                <TableCell>{vehicule.marque || "-"}</TableCell>
                <TableCell>{vehicule.modele || "-"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      vehicule.actif
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {vehicule.actif ? "Actif" : "Inactif"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(vehicule)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingVehicule(vehicule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicule ? "Modifier le véhicule" : "Ajouter un véhicule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="immatriculation">Immatriculation *</Label>
              <Input
                id="immatriculation"
                value={formData.immatriculation}
                onChange={(e) =>
                  setFormData({ ...formData, immatriculation: e.target.value })
                }
                placeholder="Ex: AB-123-CD"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marque">Marque</Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) =>
                  setFormData({ ...formData, marque: e.target.value })
                }
                placeholder="Ex: Renault"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modele">Modèle</Label>
              <Input
                id="modele"
                value={formData.modele}
                onChange={(e) =>
                  setFormData({ ...formData, modele: e.target.value })
                }
                placeholder="Ex: Kangoo"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="actif"
                checked={formData.actif}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, actif: checked })
                }
              />
              <Label htmlFor="actif">Véhicule actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {editingVehicule ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingVehicule}
        onOpenChange={() => setDeletingVehicule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
