import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check } from "lucide-react";
import { useInventoryTemplates, useCreateInventoryTemplate, useUpdateInventoryTemplate, useDeleteInventoryTemplate } from "@/hooks/useInventoryTemplates";

const DEFAULT_CATEGORIES = [
  "Consommables",
  "Electricité & Éclairage",
  "Électroportatif",
  "Engins & Gros Matériel",
  "EPI & Sécurité",
  "Gros Œuvre",
  "Manutention & Levage",
  "Petit Outillage",
  "Signalisation & Balisage",
  "Vêtements de travail",
];

const UNIT_OPTIONS = ["U", "Paire", "Ens", "m", "m²", "Kg", "L"];

export const InventoryTemplatesManager = () => {
  const { data: templates = [], isLoading } = useInventoryTemplates();
  const createTemplate = useCreateInventoryTemplate();
  const updateTemplate = useUpdateInventoryTemplate();
  const deleteTemplate = useDeleteInventoryTemplate();

  // New category dialog
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [catSearch, setCatSearch] = useState("");

  // Rename category dialog
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete category confirm
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Per-category inline add state
  const [addDesignation, setAddDesignation] = useState<Record<string, string>>({});
  const [addUnite, setAddUnite] = useState<Record<string, string>>({});
  const [openAddForm, setOpenAddForm] = useState<string | null>(null);

  // Group by category
  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    if (!acc[t.categorie]) acc[t.categorie] = [];
    acc[t.categorie].push(t);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

  // Merged suggestions: defaults + existing DB categories, deduplicated, sorted
  const categorySuggestions = useMemo(() => {
    const merged = new Set([...DEFAULT_CATEGORIES, ...categories]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b, "fr"));
  }, [categories]);

  const handleSelectCategory = (name: string) => {
    setNewCategoryName(name);
  };

  const handleCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddDesignation(prev => ({ ...prev, [name]: "" }));
    setAddUnite(prev => ({ ...prev, [name]: "U" }));
    setNewCategoryName("");
    setCatSearch("");
    setShowNewCatDialog(false);
    if (!grouped[name]) {
      setVirtualCategories(prev => [...prev.filter(c => c !== name), name]);
    }
  };

  // Virtual categories (created but no items yet)
  const [virtualCategories, setVirtualCategories] = useState<string[]>([]);
  const allCategories = [...new Set([...categories, ...virtualCategories])].sort();

  const handleAddItem = (cat: string) => {
    const designation = (addDesignation[cat] || "").trim();
    if (!designation) return;
    const highestOrder = (grouped[cat] || []).reduce((max, t) => Math.max(max, t.ordre), -1);
    createTemplate.mutate({
      categorie: cat,
      designation,
      unite: addUnite[cat] || "U",
      ordre: highestOrder + 1,
    }, {
      onSuccess: () => {
        setAddDesignation(prev => ({ ...prev, [cat]: "" }));
        setAddUnite(prev => ({ ...prev, [cat]: "U" }));
        setOpenAddForm(null);
        setVirtualCategories(prev => prev.filter(c => c !== cat));
      }
    });
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    const catTemplates = grouped[template.categorie] || [];
    const idx = catTemplates.findIndex(t => t.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= catTemplates.length) return;
    updateTemplate.mutate({ id, ordre: catTemplates[swapIdx].ordre });
    updateTemplate.mutate({ id: catTemplates[swapIdx].id, ordre: template.ordre });
  };

  const handleRenameCategory = () => {
    const newName = renameValue.trim();
    if (!newName || !renamingCategory) return;
    const items = grouped[renamingCategory] || [];
    items.forEach(t => {
      updateTemplate.mutate({ id: t.id, categorie: newName });
    });
    // Also rename in virtual if present
    setVirtualCategories(prev => prev.map(c => c === renamingCategory ? newName : c));
    setRenamingCategory(null);
    setRenameValue("");
  };

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;
    const items = grouped[deletingCategory] || [];
    items.forEach(t => deleteTemplate.mutate(t.id));
    setVirtualCategories(prev => prev.filter(c => c !== deletingCategory));
    setDeletingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Catalogue de matériel</h2>
          <p className="text-muted-foreground text-sm">
            Créez des catégories puis ajoutez les articles à l'intérieur.
          </p>
        </div>
        <Button onClick={() => setShowNewCatDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une catégorie
        </Button>
      </div>

      {allCategories.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune catégorie définie. Commencez par créer une catégorie ci-dessus.
        </Card>
      ) : (
        allCategories.map(cat => {
          const items = grouped[cat] || [];
          return (
            <Card key={cat} className="overflow-hidden">
              {/* Category header */}
              <div className="px-4 py-3 bg-primary/10 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm text-primary">{cat}</h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setRenamingCategory(cat); setRenameValue(cat); }}
                    title="Renommer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeletingCategory(cat)}
                    title="Supprimer la catégorie"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Items */}
              {items.length > 0 && (
                <Table>
                  <TableBody>
                    {items.map((t, idx) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.designation}</TableCell>
                        <TableCell className="w-20 text-muted-foreground">{t.unite}</TableCell>
                        <TableCell className="w-24 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(t.id, "up")} disabled={idx === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(t.id, "down")} disabled={idx === items.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Inline add form */}
              <div className="px-4 py-3 border-t bg-muted/30 flex flex-wrap gap-2 items-end">
                <Input
                  placeholder="Ex: Perceuse 18V"
                  value={addDesignation[cat] || ""}
                  onChange={e => setAddDesignation(prev => ({ ...prev, [cat]: e.target.value }))}
                  className="w-48 h-9"
                  onKeyDown={e => { if (e.key === "Enter") handleAddItem(cat); }}
                />
                <Select
                  value={addUnite[cat] || "U"}
                  onValueChange={v => setAddUnite(prev => ({ ...prev, [cat]: v }))}
                >
                  <SelectTrigger className="w-24 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddItem(cat)}
                  disabled={createTemplate.isPending || !(addDesignation[cat] || "").trim()}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter
                </Button>
              </div>
            </Card>
          );
        })
      )}

      {/* New category dialog with smart Combobox */}
      <Dialog open={showNewCatDialog} onOpenChange={(open) => { setShowNewCatDialog(open); if (!open) { setNewCategoryName(""); setCatSearch(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
          </DialogHeader>
          <Command className="border rounded-md" shouldFilter={true}>
            <CommandInput
              placeholder="Rechercher ou créer une catégorie..."
              value={catSearch}
              onValueChange={setCatSearch}
            />
            <CommandList>
              <CommandEmpty>
                {catSearch.trim() ? (
                  <button
                    className="w-full px-2 py-3 text-sm text-left cursor-pointer hover:bg-accent rounded-sm flex items-center gap-2"
                    onClick={() => { handleSelectCategory(catSearch.trim()); }}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    Créer « <span className="font-medium">{catSearch.trim()}</span> »
                  </button>
                ) : (
                  <span className="text-muted-foreground">Tapez un nom de catégorie</span>
                )}
              </CommandEmpty>
              <CommandGroup heading="Suggestions">
                {categorySuggestions.map(cat => {
                  const alreadyExists = allCategories.includes(cat);
                  return (
                    <CommandItem
                      key={cat}
                      value={cat}
                      disabled={alreadyExists}
                      onSelect={() => { if (!alreadyExists) handleSelectCategory(cat); }}
                      className={alreadyExists ? "opacity-50" : "cursor-pointer"}
                    >
                      <span className="flex-1">{cat}</span>
                      {alreadyExists && <span className="text-xs text-muted-foreground ml-2">(déjà créée)</span>}
                      {newCategoryName === cat && !alreadyExists && <Check className="h-4 w-4 text-primary ml-2" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {newCategoryName && (
            <p className="text-sm text-muted-foreground">
              Sélection : <span className="font-medium text-foreground">{newCategoryName}</span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCatDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename category dialog */}
      <Dialog open={!!renamingCategory} onOpenChange={open => { if (!open) setRenamingCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la catégorie</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleRenameCategory(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingCategory(null)}>Annuler</Button>
            <Button onClick={handleRenameCategory} disabled={!renameValue.trim()}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <AlertDialog open={!!deletingCategory} onOpenChange={open => { if (!open) setDeletingCategory(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie « {deletingCategory} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera la catégorie et ses {(grouped[deletingCategory || ""] || []).length} article(s). Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
