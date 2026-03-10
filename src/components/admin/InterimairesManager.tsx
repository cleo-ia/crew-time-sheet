import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { useUtilisateursByRole, useDeleteUtilisateur } from "@/hooks/useUtilisateurs";
import { usePlanningAffectationsCurrentWeek } from "@/hooks/usePlanningAffectationsCurrentWeek";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";
import { useLogModification } from "@/hooks/useLogModification";
import { useCurrentUserInfo } from "@/hooks/useCurrentUserInfo";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

interface InterimairesManagerProps {
  showAffectation?: boolean;
  showCreateButton?: boolean;
}

export const InterimairesManager = ({ showAffectation = true, showCreateButton = true }: InterimairesManagerProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingInterimaire, setEditingInterimaire] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredInterimaires = interimaires.filter((i) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (i.nom?.toLowerCase() || "").includes(term) ||
      (i.prenom?.toLowerCase() || "").includes(term) ||
      (i.agence_interim?.toLowerCase() || "").includes(term)
    );
  });

  const colCount = showAffectation ? 6 : 5;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {interimaires.length} intérimaire{interimaires.length > 1 ? "s" : ""} enregistré{interimaires.length > 1 ? "s" : ""}
        </p>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un intérimaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {showCreateButton && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel intérimaire
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pr-1">Nom</TableHead>
              <TableHead className="pl-1">Prénom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Agence</TableHead>
              {showAffectation && <TableHead>Affectation</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredInterimaires.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-muted-foreground">
                  {searchTerm ? "Aucun résultat" : "Aucun intérimaire enregistré"}
                </TableCell>
              </TableRow>
            ) : (
              filteredInterimaires.map((interimaire) => {
                const affectation = getAffectationForInterimaire(interimaire.id);
                return (
                  <TableRow key={interimaire.id}>
                    <TableCell className="font-medium pr-1">{interimaire.nom}</TableCell>
                    <TableCell className="pl-1">{interimaire.prenom}</TableCell>
                    <TableCell>
                      <RoleBadge role="interimaire" size="sm" />
                    </TableCell>
                    <TableCell>
                      {interimaire.agence_interim ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {interimaire.agence_interim}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non renseignée</span>
                      )}
                    </TableCell>
                    {showAffectation && (
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
                    )}
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
