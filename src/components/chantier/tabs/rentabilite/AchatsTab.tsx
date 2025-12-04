import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAchatsChantier, useDeleteAchat, Achat } from "@/hooks/useAchatsChantier";
import { useTachesChantier } from "@/hooks/useTachesChantier";
import { AchatFormDialog } from "./AchatFormDialog";
import { supabase } from "@/integrations/supabase/client";

const TYPES_COUT = ["Tous", "Matériaux", "Fournitures", "Locations", "Sous traitants", "Autres"];

interface AchatsTabProps {
  chantierId: string;
}

export const AchatsTab = ({ chantierId }: AchatsTabProps) => {
  const { data: achats = [], isLoading } = useAchatsChantier(chantierId);
  const { data: taches = [] } = useTachesChantier(chantierId);
  const deleteAchat = useDeleteAchat();

  const [selectedType, setSelectedType] = useState("Tous");
  const [selectedTache, setSelectedTache] = useState("Toutes");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAchat, setEditingAchat] = useState<Achat | null>(null);

  // Filter achats
  const filteredAchats = achats.filter((achat) => {
    const matchType = selectedType === "Tous" || achat.type_cout === selectedType;
    const matchTache = selectedTache === "Toutes" || achat.tache_id === selectedTache;
    return matchType && matchTache;
  });

  // Calculate total
  const totalAchats = filteredAchats.reduce((sum, achat) => sum + achat.montant, 0);

  const getTacheName = (tacheId: string | null) => {
    if (!tacheId) return "-";
    const tache = taches.find((t) => t.id === tacheId);
    return tache?.nom || "-";
  };

  const handleEdit = (achat: Achat) => {
    setEditingAchat(achat);
    setIsFormOpen(true);
  };

  const handleDelete = async (achat: Achat) => {
    if (confirm("Supprimer cet achat ?")) {
      await deleteAchat.mutateAsync({ id: achat.id, chantierId, facturePath: achat.facture_path });
    }
  };

  const handleOpenFacture = async (achat: Achat) => {
    if (!achat.facture_path) return;
    
    const { data } = supabase.storage
      .from("chantiers-documents")
      .getPublicUrl(achat.facture_path);
    
    window.open(data.publicUrl, "_blank");
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingAchat(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type de coût" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {TYPES_COUT.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTache} onValueChange={setSelectedTache}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tâche" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="Toutes">Toutes les tâches</SelectItem>
            {taches.map((tache) => (
              <SelectItem key={tache.id} value={tache.id}>{tache.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un achat
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredAchats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun achat enregistré
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Achats</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAchats.map((achat) => (
                  <TableRow key={achat.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {achat.facture_path && (
                          <button
                            onClick={() => handleOpenFacture(achat)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {achat.facture_name?.toLowerCase().endsWith(".pdf") ? (
                              <FileText className="h-4 w-4 text-red-500" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-blue-500" />
                            )}
                          </button>
                        )}
                        {achat.nom}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(achat.date), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell>{achat.fournisseur || "-"}</TableCell>
                    <TableCell>{getTacheName(achat.tache_id)}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {achat.type_cout}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {achat.montant.toLocaleString("fr-FR")}€
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background">
                          <DropdownMenuItem onClick={() => handleEdit(achat)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(achat)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <div className="flex justify-end">
        <Card className="w-fit">
          <CardContent className="py-3 px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Total achats</span>
              <span className="text-xl font-bold">{totalAchats.toLocaleString("fr-FR")}€</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <AchatFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        chantierId={chantierId}
        achat={editingAchat}
      />
    </div>
  );
};
