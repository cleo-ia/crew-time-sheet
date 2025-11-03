import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail, Building2, UserCog } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";
import { useAffectations, useCreateAffectation } from "@/hooks/useAffectations";

export const MaconsManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingMacon, setEditingMacon] = useState<any>(null);
  const [showAffectDialog, setShowAffectDialog] = useState(false);
  const [affectTarget, setAffectTarget] = useState<any>(null);
  const [affectForm, setAffectForm] = useState({
    chantier_id: "",
    date_debut: new Date().toISOString().split("T")[0],
  });
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
  });

  const { data: macons = [], isLoading } = useUtilisateursByRole("macon");
  const { data: chefs = [] } = useUtilisateursByRole("chef");
  const { data: chantiers = [] } = useChantiers();
  const { data: affectations = [] } = useAffectations();
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();
  const createAffectation = useCreateAffectation();

  const handleSave = async () => {
    if (editingMacon) {
      await updateUtilisateur.mutateAsync({
        id: editingMacon.id,
        ...formData,
        role_metier: 'macon',
      });
    } else {
      await createUtilisateur.mutateAsync({
        ...formData,
        role_metier: 'macon',
      });
    }
    setShowDialog(false);
    setEditingMacon(null);
    setFormData({ nom: "", prenom: "", email: "" });
  };

  const handleEdit = (macon: any) => {
    setEditingMacon(macon);
    setFormData({
      nom: macon.nom,
      prenom: macon.prenom,
      email: macon.email || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce maçon ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
  };

  const getAffectationForMacon = (maconId: string) => {
    return affectations?.find((a) => a.macon_id === maconId && !a.date_fin);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {macons.length} maçon{macons.length > 1 ? "s" : ""} enregistré{macons.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau maçon
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Affectation</TableHead>
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
            ) : macons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun maçon enregistré
                </TableCell>
              </TableRow>
            ) : (
              macons.map((macon) => {
                const affectation = getAffectationForMacon(macon.id);
                return (
                  <TableRow key={macon.id}>
                    <TableCell className="font-medium">{macon.nom}</TableCell>
                    <TableCell>{macon.prenom}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Mail className="h-3 w-3" />
                        {macon.email || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {affectation ? (
                        <div className="space-y-1">
                          <div className="font-medium">{affectation.chantier_nom || "N/A"}</div>
                          <div className="text-xs text-muted-foreground">
                            Chef: {affectation.chef_prenom && affectation.chef_nom
                              ? `${affectation.chef_prenom} ${affectation.chef_nom}`
                              : "Non assigné"}
                          </div>
                          {affectation.date_debut && (
                            <div className="text-xs text-muted-foreground">
                              Depuis le {new Date(affectation.date_debut).toLocaleDateString("fr-FR")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">
                          Non affecté
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAffectTarget(macon);
                            setAffectForm({
                              chantier_id: "",
                              date_debut: new Date().toISOString().split("T")[0],
                            });
                            setShowAffectDialog(true);
                          }}
                        >
                          Affecter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(macon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(macon.id)}>
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
              {editingMacon ? "Modifier le maçon" : "Nouveau maçon"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du maçon
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
              {editingMacon ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Affectation Dialog */}
      <Dialog open={showAffectDialog} onOpenChange={setShowAffectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affecter {affectTarget ? `${affectTarget.prenom} ${affectTarget.nom}` : "le maçon"}</DialogTitle>
            <DialogDescription>
              Sélectionnez un chantier. Le chef d'équipe sera automatiquement celui assigné au chantier.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Chantier</Label>
              <Select 
                value={affectForm.chantier_id || undefined} 
                onValueChange={(v) => setAffectForm({ ...affectForm, chantier_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un chantier..." />
                </SelectTrigger>
                <SelectContent>
                  {chantiers
                    .filter(c => c.chef_id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom}
                        {c.chef && ` • Chef: ${c.chef.prenom} ${c.chef.nom}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {chantiers.filter(c => c.chef_id).length === 0 && (
                <p className="text-xs text-destructive">
                  Aucun chantier avec un chef assigné. Veuillez d'abord assigner un chef aux chantiers.
                </p>
              )}
              {affectForm.chantier_id && (
                <p className="text-xs text-muted-foreground">
                  Le chef sera automatiquement celui du chantier sélectionné
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input 
                type="date" 
                value={affectForm.date_debut} 
                onChange={(e) => setAffectForm({ ...affectForm, date_debut: e.target.value })} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAffectDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!affectTarget || !affectForm.chantier_id) {
                  toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un chantier",
                    variant: "destructive"
                  });
                  return;
                }
                
                await createAffectation.mutateAsync({
                  macon_id: affectTarget.id,
                  chantier_id: affectForm.chantier_id,
                  date_debut: affectForm.date_debut,
                  date_fin: null,
                });
                
                setShowAffectDialog(false);
              }}
              disabled={!affectForm.chantier_id}
            >
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
