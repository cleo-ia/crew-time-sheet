import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, ImageIcon, Package, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAchatsChantier, useDeleteAchat, Achat } from "@/hooks/useAchatsChantier";
import { useTachesChantier } from "@/hooks/useTachesChantier";
import { AchatFormDialog } from "./AchatFormDialog";
import { supabase } from "@/integrations/supabase/client";

const TYPES_COUT = ["Tous", "Matériaux", "Fournitures", "Locations", "Sous traitants", "Autres"];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Matériaux": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  "Fournitures": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  "Locations": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  "Sous traitants": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  "Autres": { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30" },
};

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
    if (!tacheId) return null;
    const tache = taches.find((t) => t.id === tacheId);
    return tache?.nom || null;
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

  const getTypeStyle = (type: string) => {
    return TYPE_COLORS[type] || TYPE_COLORS["Autres"];
  };

  return (
    <div className="space-y-6">
      {/* Filters and actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 p-1 bg-muted/50 rounded-lg">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[160px] border-0 bg-background shadow-sm">
              <SelectValue placeholder="Type de coût" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {TYPES_COUT.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTache} onValueChange={setSelectedTache}>
            <SelectTrigger className="w-[180px] border-0 bg-background shadow-sm">
              <SelectValue placeholder="Tâche" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="Toutes">Toutes les tâches</SelectItem>
              {taches.map((tache) => (
                <SelectItem key={tache.id} value={tache.id}>{tache.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button className="gap-2 shadow-md" onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un achat
        </Button>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/50">
          <div className="grid grid-cols-[minmax(120px,1.2fr)_110px_1fr_80px_100px_70px_100px_120px_110px_44px] gap-3 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div>Nom</div>
            <div className="text-center">Date</div>
            <div className="text-center">Fournisseur</div>
            <div className="text-center">Qté</div>
            <div className="text-center">Prix unit.</div>
            <div className="text-center">Unité</div>
            <div className="text-center">Tâche</div>
            <div className="text-center">Type</div>
            <div className="text-right">Montant</div>
            <div></div>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <Package className="h-8 w-8 opacity-50" />
                <span>Chargement...</span>
              </div>
            </div>
          ) : filteredAchats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 opacity-40" />
                </div>
                <div>
                  <p className="font-medium">Aucun achat enregistré</p>
                  <p className="text-sm opacity-70">Commencez par ajouter votre premier achat</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredAchats.map((achat, index) => {
                const typeStyle = getTypeStyle(achat.type_cout);
                const tacheName = getTacheName(achat.tache_id);
                
                return (
                  <div 
                    key={achat.id}
                    onClick={() => handleEdit(achat)}
                    className={`grid grid-cols-[minmax(120px,1.2fr)_110px_1fr_80px_100px_70px_100px_120px_110px_44px] gap-3 px-6 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    }`}
                  >
                    {/* Nom */}
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{achat.nom}</span>
                    </div>

                    {/* Date */}
                    <div className="text-sm text-muted-foreground text-center">
                      {format(new Date(achat.date), "dd MMM yyyy", { locale: fr })}
                    </div>

                    {/* Fournisseur */}
                    <div className="text-sm truncate text-center">
                      {achat.fournisseur || <span className="text-muted-foreground/50">—</span>}
                    </div>

                    {/* Quantité */}
                    <div className="text-center font-medium tabular-nums">
                      {achat.quantite ?? 1}
                    </div>

                    {/* Prix unitaire */}
                    <div className="text-center text-sm tabular-nums">
                      {achat.prix_unitaire?.toLocaleString("fr-FR") ?? "—"}€
                    </div>

                    {/* Unité */}
                    <div className="text-sm text-muted-foreground text-center">
                      {achat.unite || <span className="opacity-50">—</span>}
                    </div>

                    {/* Tâche */}
                    <div className="min-w-0 flex justify-center">
                      {tacheName ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-muted truncate max-w-full">
                          {tacheName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>

                    {/* Type */}
                    <div className="flex justify-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                        {achat.type_cout}
                      </span>
                    </div>

                    {/* Montant */}
                    <div className="text-right font-semibold tabular-nums text-primary">
                      {achat.montant.toLocaleString("fr-FR")}€
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Card */}
      {filteredAchats.length > 0 && (
        <div className="flex justify-end">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-sm font-medium">Total achats</span>
                </div>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {totalAchats.toLocaleString("fr-FR")}€
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
