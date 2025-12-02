import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, MapPin, CalendarIcon, Building2, User, Users, FileText, Paperclip } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useChantiers, useCreateChantier, useUpdateChantier, useDeleteChantier } from "@/hooks/useChantiers";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { ChantierDocumentsUpload } from "./ChantierDocumentsUpload";

export const ChantiersManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [editingChantier, setEditingChantier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nom: "",
    code_chantier: "",
    client: "",
    ville: "",
    adresse: "",
    conducteur_id: "",
    chef_id: "",
    actif: true,
    description: "",
    date_debut: null as Date | null,
    date_fin: null as Date | null,
  });

  const { data: chantiers = [], isLoading } = useChantiers();
  const { data: conducteurs = [] } = useUtilisateursByRole("conducteur");
  const { data: chefs = [] } = useUtilisateursByRole("chef");
  const createChantier = useCreateChantier();
  const updateChantier = useUpdateChantier();
  const deleteChantier = useDeleteChantier();

  const handleSave = async () => {
    const payload = {
      ...formData,
      date_debut: formData.date_debut ? format(formData.date_debut, "yyyy-MM-dd") : null,
      date_fin: formData.date_fin ? format(formData.date_fin, "yyyy-MM-dd") : null,
    };

    if (editingChantier) {
      await updateChantier.mutateAsync({
        id: editingChantier.id,
        ...payload,
      });
    } else {
      await createChantier.mutateAsync(payload);
    }
    setShowDialog(false);
    setEditingChantier(null);
    setFormData({
      nom: "",
      code_chantier: "",
      client: "",
      ville: "",
      adresse: "",
      conducteur_id: "",
      chef_id: "",
      actif: true,
      description: "",
      date_debut: null,
      date_fin: null,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce chantier ?")) {
      await deleteChantier.mutateAsync(id);
    }
  };

  const handleEdit = (chantier: any) => {
    setEditingChantier(chantier);
    setFormData({
      nom: chantier.nom,
      code_chantier: chantier.code_chantier || "",
      client: chantier.client || "",
      ville: chantier.ville || "",
      adresse: chantier.adresse || "",
      conducteur_id: chantier.conducteur_id || "",
      chef_id: chantier.chef_id || "",
      actif: chantier.actif ?? true,
      description: chantier.description || "",
      date_debut: chantier.date_debut ? new Date(chantier.date_debut) : null,
      date_fin: chantier.date_fin ? new Date(chantier.date_fin) : null,
    });
    setShowDialog(true);
  };

  const filteredChantiers = chantiers.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.code_chantier || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ville || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Input
          placeholder="Rechercher un chantier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau chantier
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Conducteur</TableHead>
              <TableHead>Chef</TableHead>
              <TableHead>Statut</TableHead>
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
            ) : filteredChantiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucun chantier trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredChantiers.map((chantier) => (
                <TableRow 
                  key={chantier.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onDoubleClick={() => navigate(`/admin/chantiers/${chantier.id}`)}
                >
                  <TableCell className="font-medium">{chantier.nom}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{chantier.code_chantier || "-"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {chantier.ville || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {chantier.conducteur ? `${chantier.conducteur.prenom} ${chantier.conducteur.nom}` : "-"}
                  </TableCell>
                  <TableCell>
                    {chantier.chef ? `${chantier.chef.prenom} ${chantier.chef.nom}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        chantier.actif
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {chantier.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(chantier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(chantier.id)}
                      >
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingChantier ? "Modifier le chantier" : "Nouveau chantier"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du chantier
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-3">
            {/* Section Identification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Identification</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du chantier *</Label>
                  <Input 
                    placeholder="Ex: Résidence Les Érables" 
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code chantier</Label>
                  <Input 
                    placeholder="Ex: CHT-001" 
                    value={formData.code_chantier}
                    onChange={(e) => setFormData({ ...formData, code_chantier: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Input 
                  placeholder="Ex: Bouygues Immobilier" 
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                />
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section Localisation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Localisation</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input 
                    placeholder="Ex: Paris" 
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input 
                    placeholder="Ex: 12 Rue de la République" 
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section Équipe */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Équipe</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conducteur de travaux</Label>
                  <Select value={formData.conducteur_id} onValueChange={(value) => setFormData({ ...formData, conducteur_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {conducteurs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.prenom} {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chef d'équipe (optionnel)</Label>
                  <Select value={formData.chef_id} onValueChange={(value) => setFormData({ ...formData, chef_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chefs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.prenom} {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section Planning */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>Planning</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date_debut && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date_debut ? (
                          format(formData.date_debut, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date_debut || undefined}
                        onSelect={(date) => setFormData({ ...formData, date_debut: date || null })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date_fin && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date_fin ? (
                          format(formData.date_fin, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date_fin || undefined}
                        onSelect={(date) => setFormData({ ...formData, date_fin: date || null })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={formData.actif ? "true" : "false"} onValueChange={(value) => setFormData({ ...formData, actif: value === "true" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Actif</SelectItem>
                    <SelectItem value="false">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Section Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Informations complémentaires</span>
              </div>
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea 
                  placeholder="Description du chantier..." 
                  rows={3} 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Section Documents - only in edit mode */}
            {editingChantier && (
              <>
                <Separator className="bg-border/50" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    <span>Documents</span>
                  </div>
                  <ChantierDocumentsUpload chantierId={editingChantier.id} />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingChantier ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
