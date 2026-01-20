import { useState, useMemo } from "react";
import { Download, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useVentilationInterim, VentilationEmployeeRow } from "@/hooks/useVentilationAnalytique";
import { exportVentilationInterimPdf } from "@/lib/ventilationExport";
import { toast } from "sonner";

interface VentilationInterimProps {
  filters: {
    periode: string;
  };
}

export const VentilationInterim = ({ filters }: VentilationInterimProps) => {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useVentilationInterim(filters.periode);

  // Group data by employee
  const groupedData = useMemo(() => {
    if (!data) return [];
    
    const groups: { salarieId: string; nom: string; prenom: string; agenceInterim: string; rows: VentilationEmployeeRow[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;
    
    data.forEach(row => {
      if (!currentGroup || currentGroup.salarieId !== row.salarieId) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          salarieId: row.salarieId,
          nom: row.nom,
          prenom: row.prenom,
          agenceInterim: row.agenceInterim || "",
          rows: []
        };
      }
      currentGroup.rows.push(row);
    });
    if (currentGroup) groups.push(currentGroup);
    
    return groups;
  }, [data]);

  // Filter by search
  const filteredGroups = groupedData.filter(group =>
    `${group.nom} ${group.prenom} ${group.agenceInterim}`.toLowerCase().includes(search.toLowerCase())
  );

  // Count unique employees
  const employeeCount = filteredGroups.length;

  // Get unique agencies
  const agencies = [...new Set(filteredGroups.map(g => g.agenceInterim).filter(Boolean))];

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const fileName = await exportVentilationInterimPdf(data, filters.periode);
      toast.success(`Export généré : ${fileName}`);
    } catch (error) {
      console.error("Erreur export:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  if (!filters.periode || filters.periode === "all") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <UserCheck className="h-12 w-12 mb-4 opacity-50" />
        <p>Sélectionnez un mois pour afficher la ventilation intérimaires</p>
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
            placeholder="Rechercher un intérimaire ou agence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!data || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exporter PDF
        </Button>
      </div>

      {/* Agencies summary */}
      {agencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agencies.map(agency => (
            <Badge key={agency} variant="outline" className="text-xs">
              {agency}
            </Badge>
          ))}
        </div>
      )}

      {/* Table */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun intérimaire pour cette période</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Prénom</TableHead>
                <TableHead className="font-semibold">Agence</TableHead>
                <TableHead className="font-semibold">Code analytique</TableHead>
                <TableHead className="font-semibold text-right">Quantité</TableHead>
                <TableHead className="font-semibold text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group, groupIdx) => (
                group.rows.map((row, rowIdx) => (
                  <TableRow 
                    key={`${row.salarieId}-${row.codeAnalytique}`}
                    className={row.isTotal 
                      ? "bg-primary/10 font-semibold border-b-2" 
                      : groupIdx % 2 === 0 ? "bg-background" : "bg-muted/20"
                    }
                  >
                    <TableCell>{rowIdx === 0 ? row.nom : ""}</TableCell>
                    <TableCell>{rowIdx === 0 ? row.prenom : ""}</TableCell>
                    <TableCell>
                      {rowIdx === 0 && row.agenceInterim && (
                        <Badge variant="secondary" className="text-xs">
                          {row.agenceInterim}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.isTotal ? (
                        <span className="font-bold">TOTAL</span>
                      ) : (
                        row.codeAnalytique
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.quantite.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`}
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Stats */}
      {filteredGroups.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {employeeCount} intérimaire(s) • {agencies.length} agence(s)
        </div>
      )}
    </div>
  );
};
