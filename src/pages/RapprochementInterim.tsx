import { useState } from "react";
import { format } from "date-fns";
import { FileSpreadsheet, Plus, Search, Eye } from "lucide-react";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgenceInterimCombobox } from "@/components/shared/AgenceInterimCombobox";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";
import { useRHConsolidated } from "@/hooks/useRHData";
import { buildRHConsolidation, EmployeeWithDetails } from "@/hooks/rhShared";
import { useQuery } from "@tanstack/react-query";

const RapprochementInterim = () => {
  const now = new Date();
  const [periode, setPeriode] = useState(format(now, "yyyy-MM"));
  const [agenceFilter, setAgenceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);

  const entrepriseId = localStorage.getItem("current_entreprise_id");

  const filters = {
    periode,
    typeSalarie: "interimaire",
    agenceInterim: agenceFilter !== "all" ? agenceFilter : undefined,
  };

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["rapprochement-interim", filters, entrepriseId],
    queryFn: async () => {
      const data = await buildRHConsolidation(filters);
      return data;
    },
  });

  // Filtrer par recherche nom
  const filtered = employees.filter((emp) => {
    if (!searchQuery) return true;
    const fullName = `${emp.prenom} ${emp.nom}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Générer les options de période (12 derniers mois)
  const periodeOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    };
  });

  return (
    <PageLayout>
      <AppNav />
      <PageHeader
        title="Rapprochement Intérimaires"
        subtitle="Consolidation des heures intérimaires pour rapprochement factures"
        icon={FileSpreadsheet}
        theme="consultation-rh"
        actions={
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvel intérimaire
          </Button>
        }
      />

      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Filtres */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Période</label>
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Agence</label>
              <AgenceInterimCombobox
                value={agenceFilter}
                onChange={setAgenceFilter}
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un intérimaire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Résumé */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-sm text-muted-foreground">Intérimaires</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">
              {Math.round(filtered.reduce((s, e) => s + e.heuresNormales, 0) * 100) / 100}h
            </p>
            <p className="text-sm text-muted-foreground">Heures normales</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">
              {Math.round(filtered.reduce((s, e) => s + e.heuresSupp, 0) * 100) / 100}h
            </p>
            <p className="text-sm text-muted-foreground">Heures supp</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">
              {[...new Set(filtered.map((e) => e.agence_interim).filter(Boolean))].length}
            </p>
            <p className="text-sm text-muted-foreground">Agences</p>
          </Card>
        </div>

        {/* Tableau */}
        {isLoading ? (
          <Card className="p-4"><Skeleton className="h-96 w-full" /></Card>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Intérimaire</TableHead>
                  <TableHead className="text-center">Agence</TableHead>
                  <TableHead className="text-center">Chantiers</TableHead>
                  <TableHead className="text-center">H. Normales</TableHead>
                  <TableHead className="text-center">H. Supp 25%</TableHead>
                  <TableHead className="text-center">H. Supp 50%</TableHead>
                  <TableHead className="text-center">Absences</TableHead>
                  <TableHead className="text-center">Paniers</TableHead>
                  <TableHead className="text-center">Trajets</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      {emp.prenom} {emp.nom}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.agence_interim ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30">
                          {emp.agence_interim}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {emp.chantier_codes.map((code, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{emp.heuresNormales}h</TableCell>
                    <TableCell className="text-center">
                      {emp.heuresSupp25 > 0 ? `${emp.heuresSupp25}h` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.heuresSupp50 > 0 ? `${emp.heuresSupp50}h` : "-"}
                    </TableCell>
                    <TableCell className="text-center">{emp.absences}j</TableCell>
                    <TableCell className="text-center">{emp.paniers}</TableCell>
                    <TableCell className="text-center">{emp.totalJoursTrajets}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(emp)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">Aucun intérimaire trouvé</p>
            <p className="text-sm mt-2">Aucune donnée pour cette période et ces filtres</p>
          </div>
        )}
      </div>

      {/* Dialog détail jour par jour */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Détail – {selectedEmployee?.prenom} {selectedEmployee?.nom}
              {selectedEmployee?.agence_interim && (
                <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30">
                  {selectedEmployee.agence_interim}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="rounded-lg border border-border/50 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Chantier</TableHead>
                    <TableHead className="text-center">Heures</TableHead>
                    <TableHead className="text-center">Intempérie</TableHead>
                    <TableHead className="text-center">Panier</TableHead>
                    <TableHead className="text-center">Trajet</TableHead>
                    <TableHead className="text-center">Absence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEmployee.detailJours
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((jour, idx) => (
                      <TableRow key={idx} className={jour.isAbsent ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                        <TableCell className="text-sm">
                          {new Date(jour.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-sm">{jour.chantierCode || "-"}</TableCell>
                        <TableCell className="text-center">{jour.heures}h</TableCell>
                        <TableCell className="text-center">{jour.intemperie > 0 ? `${jour.intemperie}h` : "-"}</TableCell>
                        <TableCell className="text-center">{jour.panier ? "✓" : "-"}</TableCell>
                        <TableCell className="text-center">{jour.trajet || "-"}</TableCell>
                        <TableCell className="text-center">
                          {jour.isAbsent ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300">
                              {jour.typeAbsence || "Absent"}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InterimaireFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </PageLayout>
  );
};

export default RapprochementInterim;
