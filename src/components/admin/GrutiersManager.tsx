import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { usePlanningAffectationsCurrentWeek } from "@/hooks/usePlanningAffectationsCurrentWeek";

export const GrutiersManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrutier, setEditingGrutier] = useState<any>(null);
  const [formData, setFormData] = useState({
    nom: "", prenom: "", matricule: "", echelon: "", niveau: "", degre: "", statut: "", libelle_emploi: "", type_contrat: "", base_horaire: "", horaire: "", taux_horaire: undefined as number | undefined, heures_supp_mensualisees: 0, forfait_jours: false, salaire: undefined as number | undefined,
  });

  useEffect(() => {
    const salaire = formData.salaire;
    const horaire = parseFloat(formData.horaire);
    if (salaire && horaire && horaire > 0) {
      const calculatedRate = Math.round((salaire / horaire) * 100) / 100;
      setFormData(prev => ({ ...prev, taux_horaire: calculatedRate }));
    }
  }, [formData.salaire, formData.horaire]);

  const { data: grutiers = [], isLoading } = useUtilisateursByRole("grutier");
  const { data: planningAffectations = {} } = usePlanningAffectationsCurrentWeek();
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();

  const handleSave = async () => {
    if (editingGrutier) {
      await updateUtilisateur.mutateAsync({ id: editingGrutier.id, ...formData, role_metier: 'grutier' });
    } else {
      await createUtilisateur.mutateAsync({ ...formData, role_metier: 'grutier' });
    }
    setShowDialog(false);
    setEditingGrutier(null);
    setFormData({ nom: "", prenom: "", matricule: "", echelon: "", niveau: "", degre: "", statut: "", libelle_emploi: "", type_contrat: "", base_horaire: "", horaire: "", taux_horaire: undefined, heures_supp_mensualisees: 0, forfait_jours: false, salaire: undefined });
  };

  const handleEdit = (grutier: any) => {
    setEditingGrutier(grutier);
    setFormData({ nom: grutier.nom, prenom: grutier.prenom, matricule: grutier.matricule || "", echelon: grutier.echelon || "", niveau: grutier.niveau || "", degre: grutier.degre || "", statut: grutier.statut || "", libelle_emploi: grutier.libelle_emploi || "", type_contrat: grutier.type_contrat || "", base_horaire: grutier.base_horaire || "", horaire: grutier.horaire || "", taux_horaire: grutier.taux_horaire || undefined, heures_supp_mensualisees: grutier.heures_supp_mensualisees || 0, forfait_jours: grutier.forfait_jours || false, salaire: grutier.salaire || undefined });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce grutier ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
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
              <TableHead>Chantier cette semaine</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Chargement...</TableCell></TableRow>
            ) : grutiers.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun grutier enregistré</TableCell></TableRow>
            ) : (
              grutiers.map((grutier) => {
                const planning = (planningAffectations as any)[grutier.id];
                return (
                  <TableRow key={grutier.id}>
                    <TableCell className="font-medium">{grutier.nom}</TableCell>
                    <TableCell>{grutier.prenom}</TableCell>
                    <TableCell>
                      {planning ? (
                        <div className="space-y-1">
                          <div className="font-medium">{planning.chantier_nom}</div>
                          <div className="text-xs text-muted-foreground">{planning.nb_jours}/5 jours planifiés</div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">Non planifié</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(grutier)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(grutier.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGrutier ? "Modifier le grutier" : "Nouveau grutier"}</DialogTitle>
            <DialogDescription>Renseignez les informations du grutier</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nom *</Label><Input placeholder="Dupont" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} /></div>
              <div className="space-y-2"><Label>Prénom *</Label><Input placeholder="Jean" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Matricule</Label><Input placeholder="Ex: G001" value={formData.matricule} onChange={(e) => setFormData({ ...formData, matricule: e.target.value })} /></div>
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-3">Informations contractuelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Échelon</Label><Input placeholder="Ex: I, II, III..." value={formData.echelon} onChange={(e) => setFormData({ ...formData, echelon: e.target.value })} /></div>
              <div className="space-y-2"><Label>Niveau</Label><Input placeholder="Ex: 1, 2, 3..." value={formData.niveau} onChange={(e) => setFormData({ ...formData, niveau: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Degré</Label><Input placeholder="Ex: 150, 185, 210..." value={formData.degre} onChange={(e) => setFormData({ ...formData, degre: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent><SelectItem value="ETAM">ETAM</SelectItem><SelectItem value="Ouvrier">Ouvrier</SelectItem><SelectItem value="Cadre">Cadre</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Libellé emploi</Label><Input placeholder="Ex: Grutier..." value={formData.libelle_emploi} onChange={(e) => setFormData({ ...formData, libelle_emploi: e.target.value })} /></div>
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-3">Contrat de travail</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de contrat</Label>
                <Select value={formData.type_contrat} onValueChange={(value) => setFormData({ ...formData, type_contrat: value })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent><SelectItem value="CDI">CDI</SelectItem><SelectItem value="CDD">CDD</SelectItem><SelectItem value="Intérim">Intérim</SelectItem><SelectItem value="Autres">Autres</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base horaire</Label>
                <Select value={formData.base_horaire} onValueChange={(value) => setFormData({ ...formData, base_horaire: value })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent><SelectItem value="35h">35h</SelectItem><SelectItem value="38h">38h</SelectItem><SelectItem value="39h">39h</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Horaire mensuel (heures)</Label><Input type="number" step="0.01" placeholder="Ex: 151.67" value={formData.horaire || ''} onChange={(e) => setFormData({ ...formData, horaire: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Taux horaire (€/h)</Label><Input type="number" step="0.01" placeholder="Taux horaire" value={formData.taux_horaire ?? ''} onChange={(e) => setFormData({ ...formData, taux_horaire: e.target.value ? parseFloat(e.target.value) : undefined })} /></div>
              <div className="space-y-2"><Label>Salaire de base</Label><Input type="number" step="0.01" placeholder="Salaire" value={formData.salaire ?? ''} onChange={(e) => setFormData({ ...formData, salaire: e.target.value ? parseFloat(e.target.value) : undefined })} /></div>
            </div>
            <div className="space-y-2"><Label>Heures supp mensualisées</Label><Input type="number" step="0.01" placeholder="Ex: 17.33" value={formData.heures_supp_mensualisees || ''} onChange={(e) => setFormData({ ...formData, heures_supp_mensualisees: e.target.value ? parseFloat(e.target.value) : 0 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={createUtilisateur.isPending || updateUtilisateur.isPending}>
              {createUtilisateur.isPending ? "Création..." : (editingGrutier ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
