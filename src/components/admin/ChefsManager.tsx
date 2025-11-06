import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail, Building2, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    matricule: "",
    echelon: "",
    niveau: "",
    degre: "",
    statut: "",
    libelle_emploi: "",
    type_contrat: "",
    horaire: "",
    taux_horaire: undefined as number | undefined,
    heures_supp_mensualisees: 0,
    forfait_jours: false,
    salaire: undefined as number | undefined,
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
    setFormData({ 
      nom: "", 
      prenom: "", 
      email: "",
      matricule: "",
      echelon: "",
      niveau: "",
      degre: "",
      statut: "",
      libelle_emploi: "",
      type_contrat: "",
      horaire: "",
      taux_horaire: undefined,
      heures_supp_mensualisees: 0,
      forfait_jours: false,
      salaire: undefined,
    });
  };

  const handleEdit = (chef: any) => {
    setEditingChef(chef);
    setFormData({
      nom: chef.nom,
      prenom: chef.prenom,
      email: chef.email || "",
      matricule: chef.matricule || "",
      echelon: chef.echelon || "",
      niveau: chef.niveau || "",
      degre: chef.degre || "",
      statut: chef.statut || "",
      libelle_emploi: chef.libelle_emploi || "",
      type_contrat: chef.type_contrat || "",
      horaire: chef.horaire || "",
      taux_horaire: chef.taux_horaire || undefined,
      heures_supp_mensualisees: chef.heures_supp_mensualisees || 0,
      forfait_jours: chef.forfait_jours || false,
      salaire: chef.salaire || undefined,
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

            <div className="space-y-2">
              <Label>Matricule</Label>
              <Input
                placeholder="Ex: C001"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
              />
            </div>

            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-3">Informations contractuelles</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Échelon</Label>
                <Input
                  placeholder="Ex: A, B, C..."
                  value={formData.echelon}
                  onChange={(e) => setFormData({ ...formData, echelon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Input
                  placeholder="Ex: I, II, III..."
                  value={formData.niveau}
                  onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Degré</Label>
                <Input
                  placeholder="Ex: 1, 2, 3..."
                  value={formData.degre}
                  onChange={(e) => setFormData({ ...formData, degre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETAM">ETAM</SelectItem>
                    <SelectItem value="Ouvrier">Ouvrier</SelectItem>
                    <SelectItem value="Cadre">Cadre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Libellé emploi</Label>
              <Input
                placeholder="Ex: Chef de chantier, Chef d'équipe..."
                value={formData.libelle_emploi}
                onChange={(e) => setFormData({ ...formData, libelle_emploi: e.target.value })}
              />
            </div>

            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-3">Contrat de travail</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de contrat</Label>
                <Select value={formData.type_contrat} onValueChange={(value) => setFormData({ ...formData, type_contrat: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="Intérim">Intérim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horaire</Label>
                <Select value={formData.horaire} onValueChange={(value) => setFormData({ ...formData, horaire: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Horaire">Horaire</SelectItem>
                    <SelectItem value="Forfait jours">Forfait jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taux horaire (€/h)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Saisir le taux horaire"
                  value={formData.taux_horaire ?? ''}
                  onChange={(e) => setFormData({ ...formData, taux_horaire: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Heures supp mensualisées</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.heures_supp_mensualisees}
                  onChange={(e) => setFormData({ ...formData, heures_supp_mensualisees: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Salaire (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Saisir le salaire"
                  value={formData.salaire ?? ''}
                  onChange={(e) => setFormData({ ...formData, salaire: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
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
