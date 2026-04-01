import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useInventoryTemplates, useCreateInventoryTemplate, useUpdateInventoryTemplate, useDeleteInventoryTemplate } from "@/hooks/useInventoryTemplates";

export const InventoryTemplatesManager = () => {
  const { data: templates = [], isLoading } = useInventoryTemplates();
  const createTemplate = useCreateInventoryTemplate();
  const updateTemplate = useUpdateInventoryTemplate();
  const deleteTemplate = useDeleteInventoryTemplate();

  const [newCategorie, setNewCategorie] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newUnite, setNewUnite] = useState("U");

  // Group by category
  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    if (!acc[t.categorie]) acc[t.categorie] = [];
    acc[t.categorie].push(t);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  const handleAdd = () => {
    if (!newCategorie.trim() || !newDesignation.trim()) return;
    createTemplate.mutate({
      categorie: newCategorie.trim(),
      designation: newDesignation.trim(),
      unite: newUnite.trim() || "U",
      ordre: templates.filter(t => t.categorie === newCategorie.trim()).length,
    });
    setNewDesignation("");
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
      <div>
        <h2 className="text-xl font-semibold">Catalogue de matériel</h2>
        <p className="text-muted-foreground text-sm">
          Définissez les catégories et articles qui apparaîtront dans les inventaires mensuels.
        </p>
      </div>

      {/* Add form */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium">Catégorie</label>
            <Input
              placeholder="ex: EPI"
              value={newCategorie}
              onChange={(e) => setNewCategorie(e.target.value)}
              className="w-40"
              list="categories-list"
            />
            <datalist id="categories-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Désignation</label>
            <Input
              placeholder="ex: Casques"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Unité</label>
            <Input
              placeholder="U"
              value={newUnite}
              onChange={(e) => setNewUnite(e.target.value)}
              className="w-20"
            />
          </div>
          <Button onClick={handleAdd} disabled={createTemplate.isPending || !newCategorie.trim() || !newDesignation.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </Card>

      {/* Templates table */}
      {categories.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucun article défini. Commencez par ajouter des catégories et articles ci-dessus.
        </Card>
      ) : (
        categories.map(cat => (
          <Card key={cat} className="overflow-hidden">
            <div className="px-4 py-2 bg-primary/10 border-b">
              <h3 className="font-semibold text-sm text-primary">{cat}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead className="w-20">Unité</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grouped[cat] || []).map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.designation}</TableCell>
                    <TableCell>{t.unite}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(t.id, "up")} disabled={idx === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(t.id, "down")} disabled={idx === (grouped[cat] || []).length - 1}>
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
          </Card>
        ))
      )}
    </div>
  );
};
