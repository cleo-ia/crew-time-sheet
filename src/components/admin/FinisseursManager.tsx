import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";

export const FinisseursManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingFinisseur, setEditingFinisseur] = useState<any>(null);
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

  const { data: finisseurs = [], isLoading } = useUtilisateursByRole("finisseur");
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();

  const handleSave = async () => {
    if (editingFinisseur) {
      await updateUtilisateur.mutateAsync({
        id: editingFinisseur.id,
        ...formData,
        role_metier: 'finisseur',
      });
    } else {
      await createUtilisateur.mutateAsync({
        ...formData,
        role_metier: 'finisseur',
      });
    }
    setShowDialog(false);
    setEditingFinisseur(null);
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

  const handleEdit = (finisseur: any) => {
    setEditingFinisseur(finisseur);
    setFormData({
      nom: finisseur.nom,
      prenom: finisseur.prenom,
      email: finisseur.email || "",
      matricule: finisseur.matricule || "",
      echelon: finisseur.echelon || "",
      niveau: finisseur.niveau || "",
      degre: finisseur.degre || "",
      statut: finisseur.statut || "",
      libelle_emploi: finisseur.libelle_emploi || "",
      type_contrat: finisseur.type_contrat || "",
      horaire: finisseur.horaire || "",
      taux_horaire: finisseur.taux_horaire || undefined,
      heures_supp_mensualisees: finisseur.heures_supp_mensualisees || 0,
      forfait_jours: finisseur.forfait_jours || false,
      salaire: finisseur.salaire || undefined,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce finisseur ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {finisseurs.length} finisseur{finisseurs.length > 1 ? "s" : ""} enregistré{finisseurs.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau finisseur
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Email</TableHead>
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
            ) : finisseurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun finisseur enregistré
                </TableCell>
              </TableRow>
            ) : (
              finisseurs.map((finisseur) => (
                  <TableRow key={finisseur.id}>
                    <TableCell className="font-medium">{finisseur.nom}</TableCell>
                    <TableCell>{finisseur.prenom}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Mail className="h-3 w-3" />
                        {finisseur.email || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(finisseur)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(finisseur.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog CRUD */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFinisseur ? "Modifier le finisseur" : "Nouveau finisseur"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du finisseur
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
                placeholder="Ex: F001"
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
                placeholder="Ex: Finisseur, Chef d'équipe..."
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
                <Label>Horaire mensuel (heures)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 151.67"
                  value={formData.horaire || ''}
                  onChange={(e) => setFormData({ ...formData, horaire: e.target.value })}
                />
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
                <Label>Salaire de base</Label>
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
              {editingFinisseur ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
