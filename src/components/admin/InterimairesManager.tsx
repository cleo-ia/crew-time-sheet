import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUtilisateursByRole, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { usePlanningAffectationsCurrentWeek } from "@/hooks/usePlanningAffectationsCurrentWeek";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";

export const InterimairesManager = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingInterimaire, setEditingInterimaire] = useState<any>(null);
  const { data: interimaires = [], isLoading } = useUtilisateursByRole("interimaire");
  const { data: planningAffectations = {} } = usePlanningAffectationsCurrentWeek();
  const deleteUtilisateur = useDeleteUtilisateur();

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
    return (planningAffectations as any)[interimaireId] || null;
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
                        <div className="space-y-1">
                          <div className="font-medium">{affectation.chantier_nom}</div>
                          <div className="text-xs text-muted-foreground">
                            {affectation.nb_jours}/5 jours planifiés
                          </div>
                        </div>
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
    </div>
  );
};
