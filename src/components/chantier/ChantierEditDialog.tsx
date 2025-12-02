import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Building2, MapPin, User, FileText, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useUpdateChantier } from "@/hooks/useChantiers";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { ChantierCoverImageUpload } from "./ChantierCoverImageUpload";
import { ChantierDocumentsUpload } from "@/components/admin/ChantierDocumentsUpload";
import { ChantierDetail } from "@/hooks/useChantierDetail";

interface ChantierEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantier: ChantierDetail;
}

export const ChantierEditDialog = ({
  open,
  onOpenChange,
  chantier,
}: ChantierEditDialogProps) => {
  const updateChantier = useUpdateChantier();
  const { data: conducteurs = [] } = useUtilisateursByRole("conducteur");
  const { data: chefs = [] } = useUtilisateursByRole("chef");

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

  // Initialize form when chantier changes
  useEffect(() => {
    if (chantier) {
      setFormData({
        nom: chantier.nom || "",
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
    }
  }, [chantier]);

  const handleSave = async () => {
    const payload = {
      id: chantier.id,
      nom: formData.nom,
      code_chantier: formData.code_chantier || null,
      client: formData.client || null,
      ville: formData.ville || null,
      adresse: formData.adresse || null,
      conducteur_id: formData.conducteur_id || null,
      chef_id: formData.chef_id || null,
      actif: formData.actif,
      description: formData.description || null,
      date_debut: formData.date_debut ? format(formData.date_debut, "yyyy-MM-dd") : null,
      date_fin: formData.date_fin ? format(formData.date_fin, "yyyy-MM-dd") : null,
    };

    await updateChantier.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">Modifier le chantier</DialogTitle>
            <Badge variant={formData.actif ? "default" : "secondary"}>
              {formData.actif ? "En cours" : "Terminé"}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="recap" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="recap" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Récap</span>
            </TabsTrigger>
            <TabsTrigger value="adresse" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Adresse</span>
            </TabsTrigger>
            <TabsTrigger value="client" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Client</span>
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Note</span>
            </TabsTrigger>
            <TabsTrigger value="fichiers" className="gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Fichiers</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Récap Tab */}
            <TabsContent value="recap" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Form fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom du chantier *</Label>
                    <Input
                      placeholder="Ex: Résidence Les Érables"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    />
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
                              format(formData.date_debut, "dd/MM/yyyy", { locale: fr })
                            ) : (
                              <span>Sélectionner</span>
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
                              format(formData.date_fin, "dd/MM/yyyy", { locale: fr })
                            ) : (
                              <span>Sélectionner</span>
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
                    <Label>Conducteur de travaux</Label>
                    <Select
                      value={formData.conducteur_id}
                      onValueChange={(value) => setFormData({ ...formData, conducteur_id: value })}
                    >
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
                    <Label>Chef d'équipe</Label>
                    <Select
                      value={formData.chef_id}
                      onValueChange={(value) => setFormData({ ...formData, chef_id: value })}
                    >
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
                    <p className="text-xs text-muted-foreground">Optionnel</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={formData.actif ? "true" : "false"}
                      onValueChange={(value) => setFormData({ ...formData, actif: value === "true" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">En cours</SelectItem>
                        <SelectItem value="false">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right column - Image */}
                <div className="space-y-2">
                  <Label>Image de couverture</Label>
                  <ChantierCoverImageUpload
                    chantierId={chantier.id}
                    currentImageUrl={chantier.cover_image}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Adresse Tab */}
            <TabsContent value="adresse" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input
                  placeholder="Ex: Paris"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse complète</Label>
                <Textarea
                  placeholder="Ex: 12 Rue de la République, 75001 Paris"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Client Tab */}
            <TabsContent value="client" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input
                  placeholder="Ex: Bouygues Immobilier"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Code chantier</Label>
                <Input
                  placeholder="Ex: CHT-001"
                  value={formData.code_chantier}
                  onChange={(e) => setFormData({ ...formData, code_chantier: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Identifiant unique pour le suivi administratif
                </p>
              </div>
            </TabsContent>

            {/* Note Tab */}
            <TabsContent value="note" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Description / Notes</Label>
                <Textarea
                  placeholder="Informations complémentaires sur le chantier..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                />
              </div>
            </TabsContent>

            {/* Fichiers Tab */}
            <TabsContent value="fichiers" className="mt-0">
              <ChantierDocumentsUpload chantierId={chantier.id} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex-shrink-0 pt-4 border-t">
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={!formData.nom || updateChantier.isPending}
          >
            {updateChantier.isPending ? "Enregistrement..." : "Valider les modifications"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
