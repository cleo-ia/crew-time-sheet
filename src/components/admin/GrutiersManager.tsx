import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail, Building2, UserCog } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";
import { useAffectations, useCreateAffectation } from "@/hooks/useAffectations";

export const GrutiersManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrutier, setEditingGrutier] = useState<any>(null);
  const [showAffectDialog, setShowAffectDialog] = useState(false);
  const [affectTarget, setAffectTarget] = useState<any>(null);
  const [affectForm, setAffectForm] = useState({
    chantier_id: "",
    date_debut: new Date().toISOString().split("T")[0],
  });
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    matricule: "",
    echelon: "",
    niveau: "",
    degre: "",
    statut: "",
    libelle_emploi: "",
    type_contrat: "",
    base_horaire: "",
    horaire: "",
    taux_horaire: undefined as number | undefined,
    heures_supp_mensualisees: 0,
    forfait_jours: false,
    salaire: undefined as number | undefined,
  });

  // Calcul automatique du taux horaire
  useEffect(() => {
    const salaire = formData.salaire;
    const horaire = parseFloat(formData.horaire);
    
    if (salaire && horaire && horaire > 0) {
      const calculatedRate = Math.round((salaire / horaire) * 100) / 100;
      setFormData(prev => ({ ...prev, taux_horaire: calculatedRate }));
    }
  }, [formData.salaire, formData.horaire]);

  const { data: grutiers = [], isLoading } = useUtilisateursByRole("grutier");
  const { data: chefs = [] } = useUtilisateursByRole("chef");
  const { data: chantiers = [] } = useChantiers();
  const { data: affectations = [] } = useAffectations();
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();
  const createAffectation = useCreateAffectation();

  const handleSave = async () => {
    if (editingGrutier) {
      await updateUtilisateur.mutateAsync({
        id: editingGrutier.id,
        ...formData,
        role_metier: 'grutier',
      });
    } else {
      await createUtilisateur.mutateAsync({
        ...formData,
        role_metier: 'grutier',
      });
    }
    setShowDialog(false);
    setEditingGrutier(null);
    setFormData({ 
      nom: "", 
      prenom: "", 
      matricule: "",
      echelon: "",
      niveau: "",
      degre: "",
      statut: "",
      libelle_emploi: "",
      type_contrat: "",
      base_horaire: "",
      horaire: "",
      taux_horaire: undefined,
      heures_supp_mensualisees: 0,
      forfait_jours: false,
      salaire: undefined,
    });
  };

  const handleEdit = (grutier: any) => {
    setEditingGrutier(grutier);
    setFormData({
      nom: grutier.nom,
      prenom: grutier.prenom,
      matricule: grutier.matricule || "",
      echelon: grutier.echelon || "",
      niveau: grutier.niveau || "",
      degre: grutier.degre || "",
      statut: grutier.statut || "",
      libelle_emploi: grutier.libelle_emploi || "",
      type_contrat: grutier.type_contrat || "",
      base_horaire: grutier.base_horaire || "",
      horaire: grutier.horaire || "",
      taux_horaire: grutier.taux_horaire || undefined,
      heures_supp_mensualisees: grutier.heures_supp_mensualisees || 0,
      forfait_jours: grutier.forfait_jours || false,
      salaire: grutier.salaire || undefined,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce grutier ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
  };

  const getAffectationForGrutier = (grutierId: string) => {
    return affectations?.find((a) => a.macon_id === grutierId && !a.date_fin);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {grutiers.length} grutier{grutiers.length > 1 ? "s" : ""} enregistré{grutiers.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau grutier
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Affectation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : grutiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun grutier enregistré
                </TableCell>
              </TableRow>
            ) : (
              grutiers.map((grutier) => {
                const affectation = getAffectationForGrutier(grutier.id);
                return (
                  <TableRow key={grutier.id}>
                    <TableCell className="font-medium">{grutier.nom}</TableCell>
                    <TableCell>{grutier.prenom}</TableCell>
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
                            setAffectTarget(grutier);
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
                          onClick={() => handleEdit(grutier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(grutier.id)}>
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
              {editingGrutier ? "Modifier le grutier" : "Nouveau grutier"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du grutier
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
              <Label>Matricule</Label>
              <Input
                placeholder="Ex: G001"
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
                  placeholder="Ex: I, II, III..."
                  value={formData.echelon}
                  onChange={(e) => setFormData({ ...formData, echelon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Input
                  placeholder="Ex: 1, 2, 3..."
                  value={formData.niveau}
                  onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Degré</Label>
                <Input
                  placeholder="Ex: 150, 185, 210..."
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
                placeholder="Ex: Grutier, Chef de chantier..."
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
                    <SelectItem value="Autres">Autres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base horaire</Label>
                <Select value={formData.base_horaire} onValueChange={(value) => setFormData({ ...formData, base_horaire: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="35h">35h</SelectItem>
                    <SelectItem value="39h">39h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-2">
              <Label>Heures supp mensualisées</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 17.33"
                value={formData.heures_supp_mensualisees || ''}
                onChange={(e) => setFormData({ ...formData, heures_supp_mensualisees: e.target.value ? parseFloat(e.target.value) : 0 })}
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={createUtilisateur.isPending || updateUtilisateur.isPending}>
              {createUtilisateur.isPending ? "Création..." : (editingGrutier ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Affectation Dialog */}
      <Dialog open={showAffectDialog} onOpenChange={setShowAffectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affecter {affectTarget ? `${affectTarget.prenom} ${affectTarget.nom}` : "le grutier"}</DialogTitle>
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
                setAffectTarget(null);
                setAffectForm({
                  chantier_id: "",
                  date_debut: new Date().toISOString().split("T")[0],
                });
              }}
            >
              Affecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
