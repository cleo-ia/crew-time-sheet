import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useCreateUtilisateur, useUpdateUtilisateur, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { useInviteUser } from "@/hooks/useInviteUser";
import { getCurrentEntrepriseId } from "@/lib/entreprise";

export const RHAdminManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRH, setEditingRH] = useState<any>(null);
  const [sendInvitation, setSendInvitation] = useState(true);
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

  const { data: rhUsers = [], isLoading } = useUtilisateursByRole("rh");
  const createUtilisateur = useCreateUtilisateur();
  const updateUtilisateur = useUpdateUtilisateur();
  const deleteUtilisateur = useDeleteUtilisateur();
  const inviteUser = useInviteUser();

  const handleSave = async () => {
    try {
      if (editingRH) {
        await updateUtilisateur.mutateAsync({
          id: editingRH.id,
          ...formData,
        });
        toast({
          title: "RH modifié",
          description: "Les informations ont été mises à jour.",
        });
      } else {
        // Créer l'entrée dans utilisateurs (sans role_metier car RH n'est pas un métier)
        await createUtilisateur.mutateAsync({
          ...formData,
          role_metier: null,
        });

        // Envoyer une invitation si demandé et email fourni
        if (sendInvitation && formData.email) {
          const entrepriseId = await getCurrentEntrepriseId();
          await inviteUser.mutateAsync({
            email: formData.email,
            role: "rh",
            entreprise_id: entrepriseId,
          });
          toast({
            title: "RH créé et invitation envoyée",
            description: `Une invitation a été envoyée à ${formData.email}`,
          });
        } else {
          toast({
            title: "RH créé",
            description: "L'utilisateur RH a été créé.",
          });
        }
      }
      
      setShowDialog(false);
      setEditingRH(null);
      setSendInvitation(true);
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
    } catch (error) {
      console.error("Error saving RH:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rh: any) => {
    setEditingRH(rh);
    setFormData({
      nom: rh.nom,
      prenom: rh.prenom,
      email: rh.email || "",
      matricule: rh.matricule || "",
      echelon: rh.echelon || "",
      niveau: rh.niveau || "",
      degre: rh.degre || "",
      statut: rh.statut || "",
      libelle_emploi: rh.libelle_emploi || "",
      type_contrat: rh.type_contrat || "",
      horaire: rh.horaire || "",
      taux_horaire: rh.taux_horaire || undefined,
      heures_supp_mensualisees: rh.heures_supp_mensualisees || 0,
      forfait_jours: rh.forfait_jours || false,
      salaire: rh.salaire || undefined,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur RH ?")) {
      await deleteUtilisateur.mutateAsync(id);
      toast({
        title: "RH supprimé",
        description: "L'utilisateur a été supprimé.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {rhUsers.length} utilisateur{rhUsers.length > 1 ? "s" : ""} RH enregistré{rhUsers.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau RH
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : rhUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucun utilisateur RH enregistré
                </TableCell>
              </TableRow>
            ) : (
              rhUsers.map((rh) => (
                <TableRow key={rh.id}>
                  <TableCell className="font-medium">{rh.nom}</TableCell>
                  <TableCell>{rh.prenom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Mail className="h-3 w-3" />
                      {rh.email || "-"}
                    </div>
                  </TableCell>
                  <TableCell>{rh.matricule || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rh.statut || "Non défini"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rh)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rh.id)}>
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

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRH ? "Modifier l'utilisateur RH" : "Nouvel utilisateur RH"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de l'utilisateur RH
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
                placeholder="jean.dupont@groupe-engo.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Matricule</Label>
              <Input
                placeholder="Ex: RH001"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
              />
            </div>

            {!editingRH && (
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="send-invitation"
                  checked={sendInvitation}
                  onCheckedChange={(checked) => setSendInvitation(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="send-invitation" className="text-sm cursor-pointer">
                    Envoyer une invitation par email
                  </Label>
                </div>
              </div>
            )}

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
                placeholder="Ex: Gestionnaire RH, Assistant RH..."
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
            <Button onClick={handleSave} disabled={!formData.nom || !formData.prenom || !formData.email}>
              {editingRH ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
