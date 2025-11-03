import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail, Building2, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";
import { useAffectations } from "@/hooks/useAffectations";

export const ChefsManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingChef, setEditingChef] = useState<any>(null);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
  });

  const { data: chefs = [], isLoading } = useUtilisateursByRole("chef");
  const { data: conducteurs = [] } = useUtilisateursByRole("conducteur");
  const { data: chantiers = [] } = useChantiers();
  const { data: affectations = [] } = useAffectations();
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();

  const handleSave = async () => {
    if (editingChef) {
      await updateUtilisateur.mutateAsync({
        id: editingChef.id,
        ...formData,
      });
    } else {
      await createUtilisateur.mutateAsync({
        ...formData,
        role: "chef",
      });
    }
    setShowDialog(false);
    setEditingChef(null);
    setFormData({ nom: "", prenom: "", email: "" });
  };

  const handleEdit = (chef: any) => {
    setEditingChef(chef);
    setFormData({
      nom: chef.nom,
      prenom: chef.prenom,
      email: chef.email || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce chef ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
  };

  const getChantierForChef = (chefId: string) => {
    return chantiers.find((c) => c.chef_id === chefId);
  };

  const getConducteurForChef = (chefId: string) => {
    const chantier = getChantierForChef(chefId);
    if (!chantier) return null;
    return conducteurs.find((c) => c.id === chantier.conducteur_id);
  };

  const getMaconsCount = (chefId: string) => {
    // Le chef est maintenant lié au chantier, pas directement à l'affectation
    const chantier = getChantierForChef(chefId);
    if (!chantier) return 0;
    return affectations.filter((a) => a.chantier_id === chantier.id && !a.date_fin).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {chefs.length} chef{chefs.length > 1 ? "s" : ""} d'équipe enregistré{chefs.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau chef
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Conducteur</TableHead>
              <TableHead>Chantier</TableHead>
              <TableHead>Maçons</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : chefs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucun chef enregistré
                </TableCell>
              </TableRow>
            ) : (
              chefs.map((chef) => {
                const chantier = getChantierForChef(chef.id);
                const conducteur = getConducteurForChef(chef.id);
                const nbMacons = getMaconsCount(chef.id);
                return (
                  <TableRow key={chef.id}>
                    <TableCell className="font-medium">{chef.nom}</TableCell>
                    <TableCell>{chef.prenom}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Mail className="h-3 w-3" />
                        {chef.email || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {conducteur ? `${conducteur.prenom} ${conducteur.nom}` : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {chantier?.nom || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{nbMacons}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(chef)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(chef.id)}>
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
              {editingChef ? "Modifier le chef" : "Nouveau chef d'équipe"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du chef d'équipe
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
            <Button onClick={handleSave}>
              {editingChef ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
