import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Mail } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUtilisateursByRole, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";
import { useAffectations, useCreateAffectation } from "@/hooks/useAffectations";
import { usePlanningAffectationsCurrentWeek } from "@/hooks/usePlanningAffectationsCurrentWeek";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";

export const InterimairesManager = () => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingInterimaire, setEditingInterimaire] = useState<any>(null);
  const [showAffectDialog, setShowAffectDialog] = useState(false);
  const [affectTarget, setAffectTarget] = useState<any>(null);
  const [affectForm, setAffectForm] = useState({
    chantier_id: "",
    date_debut: new Date().toISOString().split("T")[0],
  });
  const { data: interimaires = [], isLoading } = useUtilisateursByRole("interimaire");
  const { data: chefs = [] } = useUtilisateursByRole("chef");
  const { data: chantiers = [] } = useChantiers();
  const { data: affectations = [] } = useAffectations();
  const { data: planningAffectations = {} } = usePlanningAffectationsCurrentWeek();
  const deleteUtilisateur = useDeleteUtilisateur();
  const createAffectation = useCreateAffectation();

  const handleEdit = (interimaire: any) => {
    setEditingInterimaire(interimaire);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet intérimaire ?")) {
      await deleteUtilisateur.mutateAsync(id);
    }
  };

  const getAffectationForInterimaire = (interimaireId: string) => {
    const planning = (planningAffectations as any)[interimaireId];
    if (planning) return planning;
    // fallback to legacy
    return affectations?.find((a) => a.macon_id === interimaireId && !a.date_fin);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {interimaires.length} intérimaire{interimaires.length > 1 ? "s" : ""} enregistré{interimaires.length > 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel intérimaire
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Agence</TableHead>
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
            ) : interimaires.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun intérimaire enregistré
                </TableCell>
              </TableRow>
            ) : (
              interimaires.map((interimaire) => {
                const affectation = getAffectationForInterimaire(interimaire.id);
                return (
                  <TableRow key={interimaire.id}>
                    <TableCell className="font-medium">{interimaire.nom}</TableCell>
                    <TableCell>{interimaire.prenom}</TableCell>
                    <TableCell>
                      {interimaire.agence_interim ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {interimaire.agence_interim}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non renseignée</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {affectation ? (
                        'chantier_nom' in affectation ? (
                          <div className="space-y-1">
                            <div className="font-medium">{(affectation as any).chantier_nom}</div>
                            <div className="text-xs text-muted-foreground">
                              {(affectation as any).nb_jours}/5 jours planifiés
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-medium">{(affectation as any).chantier_nom || "N/A"}</div>
                          </div>
                        )
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          Non planifié
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAffectTarget(interimaire);
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
                          onClick={() => handleEdit(interimaire)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(interimaire.id)}>
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

      {/* Dialog utilisant le composant réutilisable */}
      <InterimaireFormDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingInterimaire(null);
        }}
        editingInterimaire={editingInterimaire}
        onSuccess={() => {
          setEditingInterimaire(null);
        }}
      />

      {/* Affectation Dialog */}
      <Dialog open={showAffectDialog} onOpenChange={setShowAffectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affecter {affectTarget ? `${affectTarget.prenom} ${affectTarget.nom}` : "l'intérimaire"}</DialogTitle>
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