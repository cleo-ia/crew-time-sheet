import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";

export const ConducteursManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingConducteur, setEditingConducteur] = useState<any>(null);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
  });

  const { data: conducteurs = [], isLoading } = useUtilisateursByRole("conducteur");
  const { data: chantiers = [] } = useChantiers();
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();

  const handleSave = async () => {
    if (editingConducteur) {
      await updateUtilisateur.mutateAsync({
        id: editingConducteur.id,
        ...formData,
      });
    } else {
      await createUtilisateur.mutateAsync({
        ...formData,
        role_metier: 'conducteur',
      });
    }
    setShowDialog(false);
    setEditingConducteur(null);
    setFormData({ nom: "", prenom: "", email: "" });
  };

  const handleEdit = (conducteur: any) => {
    setEditingConducteur(conducteur);
    setFormData({
      nom: conducteur.nom,
      prenom: conducteur.prenom,
      email: conducteur.email || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce conducteur ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
  };

  const getChantiersForConducteur = (conducteurId: string) => {
    return chantiers.filter((c) => c.conducteur_id === conducteurId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {conducteurs.length} conducteur{conducteurs.length > 1 ? "s" : ""} enregistré{conducteurs.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau conducteur
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Chantiers gérés</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : conducteurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun conducteur enregistré
                </TableCell>
              </TableRow>
            ) : (
              conducteurs.map((conducteur) => {
                const conducteurChantiers = getChantiersForConducteur(conducteur.id);
                return (
                  <TableRow key={conducteur.id}>
                    <TableCell className="font-medium">{conducteur.nom}</TableCell>
                    <TableCell>{conducteur.prenom}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {conducteur.email || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          {conducteurChantiers.length}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {conducteurChantiers.slice(0, 2).map(c => c.nom).join(", ")}
                          {conducteurChantiers.length > 2 && "..."}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(conducteur)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(conducteur.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConducteur ? "Modifier le conducteur" : "Nouveau conducteur"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du conducteur de travaux
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
              <Label>Email *</Label>
              <Input 
                type="email" 
                placeholder="jean.dupont@example.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={createUtilisateur.isPending || updateUtilisateur.isPending}>
              {createUtilisateur.isPending ? "Création..." : (editingConducteur ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
