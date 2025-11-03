import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useVehiculesChefsMacons,
  useCreateVehiculeChefMacon,
  useUpdateVehiculeChefMacon,
  useDeleteVehiculeChefMacon,
  type VehiculeChefMacon,
} from "@/hooks/useVehiculesChefsMacons";

export const VehiculesChefsMaconsManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<VehiculeChefMacon | null>(null);
  const [deletingVehiculeId, setDeletingVehiculeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ immatriculation: "", actif: true });

  const { data: vehicules = [], isLoading } = useVehiculesChefsMacons();
  const createMutation = useCreateVehiculeChefMacon();
  const updateMutation = useUpdateVehiculeChefMacon();
  const deleteMutation = useDeleteVehiculeChefMacon();

  const handleOpenDialog = (vehicule?: VehiculeChefMacon) => {
    if (vehicule) {
      setEditingVehicule(vehicule);
      setFormData({ immatriculation: vehicule.immatriculation, actif: vehicule.actif });
    } else {
      setEditingVehicule(null);
      setFormData({ immatriculation: "", actif: true });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVehicule(null);
    setFormData({ immatriculation: "", actif: true });
  };

  const handleSubmit = async () => {
    if (editingVehicule) {
      await updateMutation.mutateAsync({ id: editingVehicule.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (deletingVehiculeId) {
      await deleteMutation.mutateAsync(deletingVehiculeId);
      setIsDeleteDialogOpen(false);
      setDeletingVehiculeId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Véhicules Chefs/Maçons</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un véhicule
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Immatriculation</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Aucun véhicule chefs/maçons trouvé
              </TableCell>
            </TableRow>
          ) : (
            vehicules.map((vehicule) => (
              <TableRow key={vehicule.id}>
                <TableCell className="font-mono">{vehicule.immatriculation}</TableCell>
                <TableCell>
                  {vehicule.actif ? (
                    <Badge variant="default">Actif</Badge>
                  ) : (
                    <Badge variant="secondary">Inactif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(vehicule)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingVehiculeId(vehicule.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicule ? "Modifier le véhicule" : "Ajouter un véhicule"}</DialogTitle>
            <DialogDescription>
              {editingVehicule
                ? "Modifiez les informations du véhicule chefs/maçons"
                : "Ajoutez un nouveau véhicule pour les chefs et maçons"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="immatriculation">Immatriculation</Label>
              <Input
                id="immatriculation"
                value={formData.immatriculation}
                onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                placeholder="AB-123-CD"
                className="font-mono"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="actif"
                checked={formData.actif}
                onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
              />
              <Label htmlFor="actif">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.immatriculation.trim()}>
              {editingVehicule ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce véhicule chefs/maçons ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
