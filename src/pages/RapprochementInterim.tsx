import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { FileSpreadsheet, Plus, Search, Eye, Download, Building2, ArrowLeft, User } from "lucide-react";
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";
import { InterimaireExportDialog } from "@/components/rh/InterimaireExportDialog";
import { RHEmployeeDetail } from "@/components/rh/RHEmployeeDetail";
import { buildRHConsolidation, EmployeeWithDetails } from "@/hooks/rhShared";
import { useQuery } from "@tanstack/react-query";

const RapprochementInterim = () => {
  const now = new Date();
  const [periode, setPeriode] = useState(format(now, "yyyy-MM"));
  const [agenceFilter, setAgenceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedSalarieId, setSelectedSalarieId] = useState<string | null>(null);
  const [selectedAgence, setSelectedAgence] = useState<string | null>(null);
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  const filters = {
    periode,
    typeSalarie: "interimaire",
  };

  // Filtres avec agence pour l'export PDF
  const filtersWithAgence = {
    ...filters,
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
    // Filtre par agence côté client
    if (agenceFilter !== "all" && emp.agence_interim !== agenceFilter) return false;
    if (!searchQuery) return true;
    const fullName = `${emp.prenom} ${emp.nom}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Extraire les agences uniques depuis les données chargées
  const uniqueAgences = useMemo(() => {
    const agences = [...new Set(employees.map((e) => e.agence_interim).filter(Boolean))] as string[];
    return agences.sort();
  }, [employees]);

  // Grouper par agence
  const groupedByAgence = useMemo(() => {
    const groups = new Map<string, EmployeeWithDetails[]>();
    
    filtered.forEach((emp) => {
      const agence = emp.agence_interim || "Sans agence";
      if (!groups.has(agence)) {
        groups.set(agence, []);
      }
      groups.get(agence)!.push(emp);
    });

    // Trier les groupes par nom d'agence, "Sans agence" en dernier
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Sans agence") return 1;
      if (b === "Sans agence") return -1;
      return a.localeCompare(b);
    });

    return sorted;
  }, [filtered]);

  // Calcul des sous-totaux pour un groupe
  const getGroupTotals = (emps: EmployeeWithDetails[]) => ({
    heuresNormales: Math.round(emps.reduce((s, e) => s + e.heuresNormales, 0) * 100) / 100,
    heuresSupp25: Math.round(emps.reduce((s, e) => s + e.heuresSupp25, 0) * 100) / 100,
    heuresSupp50: Math.round(emps.reduce((s, e) => s + e.heuresSupp50, 0) * 100) / 100,
    absences: emps.reduce((s, e) => s + e.absences, 0),
    paniers: emps.reduce((s, e) => s + e.paniers, 0),
    trajets: emps.reduce((s, e) => s + e.totalJoursTrajets, 0),
  });

  // Générer les options de période (12 derniers mois)
  const periodeOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    };
  });

  // Si un salarié est sélectionné, afficher le détail RH en lecture seule
  if (selectedSalarieId) {
    return (
      <PageLayout>
        <AppNav />
        <div className="container mx-auto px-4 py-6">
          <RHEmployeeDetail
            salarieId={selectedSalarieId}
            filters={filters}
            onBack={() => setSelectedSalarieId(null)}
            readOnly
          />
        </div>
      </PageLayout>
    );
  }

  // Si une agence est sélectionnée, afficher la vue détail agence
  if (selectedAgence) {
    const agenceEmployees = employees.filter(
      (emp) => (emp.agence_interim || "Sans agence") === selectedAgence
    );
    const agenceTotals = getGroupTotals(agenceEmployees);

    return (
      <PageLayout>
        <AppNav />
        <div className="container mx-auto px-4 py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-primary rounded-lg p-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedAgence(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{selectedAgence}</h1>
              <Badge variant="secondary">
                {agenceEmployees.length} intérimaire{agenceEmployees.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Récap agence */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3 text-center bg-card border border-border/50 shadow-md rounded-xl">
              <p className="text-xl font-bold text-primary">{agenceTotals.heuresNormales}h</p>
              <p className="text-xs text-muted-foreground">H. Normales</p>
            </Card>
            <Card className="p-3 text-center bg-card border border-border/50 shadow-md rounded-xl">
              <p className="text-xl font-bold text-foreground">{agenceTotals.heuresSupp25}h</p>
              <p className="text-xs text-muted-foreground">H. Supp 25%</p>
            </Card>
            <Card className="p-3 text-center bg-card border border-border/50 shadow-md rounded-xl">
              <p className="text-xl font-bold text-foreground">{agenceTotals.heuresSupp50}h</p>
              <p className="text-xs text-muted-foreground">H. Supp 50%</p>
            </Card>
            <Card className="p-3 text-center bg-card border border-border/50 shadow-md rounded-xl">
              <p className="text-xl font-bold text-foreground">{agenceTotals.paniers}</p>
              <p className="text-xs text-muted-foreground">Paniers</p>
            </Card>
            <Card className="p-3 text-center bg-card border border-border/50 shadow-md rounded-xl">
              <p className="text-xl font-bold text-foreground">{agenceTotals.trajets}</p>
              <p className="text-xs text-muted-foreground">Trajets</p>
            </Card>
          </div>

          {/* Accordéons intérimaires */}
          <Accordion type="multiple" className="space-y-3">
            {agenceEmployees.map((emp) => (
              <AccordionItem
                key={emp.id}
                value={emp.id}
                className="border border-border rounded-lg bg-card shadow-sm px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4 py-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {emp.prenom} {emp.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-1">
                        {emp.chantier_codes.map((code, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                            {code}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {emp.heuresNormales}h
                        {emp.heuresSupp > 0 && ` + ${emp.heuresSupp}h supp`}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <RHEmployeeDetail
                      salarieId={emp.id}
                      filters={filters}
                      onBack={() => {}}
                      readOnly
                      hideBackButton
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AppNav />
      <PageHeader
        title="Rapprochement Intérimaires"
        subtitle="Consolidation des heures intérimaires pour rapprochement factures"
        icon={FileSpreadsheet}
        theme="consultation-rh"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvel intérimaire
            </Button>
          </div>
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
              <Select value={agenceFilter} onValueChange={setAgenceFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Toutes les agences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les agences</SelectItem>
                  {uniqueAgences.map((agence) => (
                    <SelectItem key={agence} value={agence}>
                      {agence}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {uniqueAgences.length}
            </p>
            <p className="text-sm text-muted-foreground">Agences</p>
          </Card>
        </div>

        {/* Tableau groupé par agence */}
        {isLoading ? (
          <Card className="p-4"><Skeleton className="h-96 w-full" /></Card>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Intérimaire</TableHead>
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
                {groupedByAgence.map(([agenceName, emps]) => {
                  const totals = getGroupTotals(emps);
                  return (
                    <React.Fragment key={agenceName}>
                      {/* En-tête agence cliquable */}
                      <TableRow
                        key={`header-${agenceName}`}
                        className="bg-primary/10 border-t-2 border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors"
                        onClick={() => setSelectedAgence(agenceName)}
                      >
                        <TableCell colSpan={9} className="py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-primary">{agenceName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {emps.length} intérimaire{emps.length > 1 ? "s" : ""}
                            </Badge>
                            <Eye className="h-4 w-4 text-muted-foreground ml-auto" />
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Lignes intérimaires */}
                      {emps.map((emp) => (
                        <TableRow key={emp.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium pl-8">
                            {emp.prenom} {emp.nom}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {emp.chantier_codes.map((code, idx) => (
                                <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30 text-xs">
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
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSalarieId(emp.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Sous-total agence */}
                      <TableRow key={`total-${agenceName}`} className="bg-muted/40 border-b-2 border-border/50">
                        <TableCell className="font-bold text-sm pl-8 text-muted-foreground">
                          Sous-total {agenceName}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-center font-bold">{totals.heuresNormales}h</TableCell>
                        <TableCell className="text-center font-bold">
                          {totals.heuresSupp25 > 0 ? `${totals.heuresSupp25}h` : "-"}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {totals.heuresSupp50 > 0 ? `${totals.heuresSupp50}h` : "-"}
                        </TableCell>
                        <TableCell className="text-center font-bold">{totals.absences}j</TableCell>
                        <TableCell className="text-center font-bold">{totals.paniers}</TableCell>
                        <TableCell className="text-center font-bold">{totals.trajets}</TableCell>
                        <TableCell />
                      </TableRow>
                    </React.Fragment>
                  );
                })}
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

      <InterimaireFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <InterimaireExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        filters={filtersWithAgence}
      />
    </PageLayout>
  );
};

export default RapprochementInterim;
