import { useState } from "react";
import { Download, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecapChantier, RecapChantierRow } from "@/hooks/useVentilationAnalytique";
import { exportRecapChantierExcel } from "@/lib/ventilationExport";
import { toast } from "sonner";

interface VentilationRecapChantierProps {
  filters: {
    periode: string;
  };
}

export const VentilationRecapChantier = ({ filters }: VentilationRecapChantierProps) => {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useRecapChantier(filters.periode);

  const filteredData = data?.filter(row =>
    row.codeAnalytique.toLowerCase().includes(search.toLowerCase()) ||
    row.libelle.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Calculate totals
  const totals = filteredData.reduce(
    (acc, row) => ({
      heuresInterim: acc.heuresInterim + row.heuresInterim,
      heuresMO: acc.heuresMO + row.heuresMO,
      heuresMOAPP: acc.heuresMOAPP + row.heuresMOAPP,
      total: acc.total + row.total
    }),
    { heuresInterim: 0, heuresMO: 0, heuresMOAPP: 0, total: 0 }
  );

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const fileName = await exportRecapChantierExcel(data, filters.periode);
      toast.success(`Export généré : ${fileName}`);
    } catch (error) {
      console.error("Erreur export:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  if (!filters.periode || filters.periode === "all") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4 opacity-50" />
        <p>Sélectionnez un mois pour afficher le récapitulatif par chantier</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Erreur lors du chargement des données
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un chantier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!data || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exporter Excel
        </Button>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune donnée pour cette période</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Code analytique</TableHead>
                <TableHead className="font-semibold">Libellé</TableHead>
                <TableHead className="font-semibold text-right">INTERIM</TableHead>
                <TableHead className="font-semibold text-right">MO</TableHead>
                <TableHead className="font-semibold text-right">MOAPP</TableHead>
                <TableHead className="font-semibold text-right">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, idx) => (
                <TableRow key={row.codeAnalytique} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <TableCell className="font-mono text-sm">{row.codeAnalytique}</TableCell>
                  <TableCell>{row.libelle}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.heuresInterim.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.heuresMO.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.heuresMOAPP.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell>TOTAL</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right tabular-nums">{totals.heuresInterim.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.heuresMO.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.heuresMOAPP.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.total.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Stats */}
      {filteredData.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {filteredData.length} chantier(s) • Total: {totals.total.toFixed(2)}h
        </div>
      )}
    </div>
  );
};
