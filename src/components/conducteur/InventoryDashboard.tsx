import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, FileText, Package, Settings } from "lucide-react";
import { useInventoryReportsAll } from "@/hooks/useInventoryReports";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import { useChantiers } from "@/hooks/useChantiers";
import { InventoryReportDetail } from "@/components/inventory/InventoryReportDetail";
import { format } from "date-fns";

export const InventoryDashboard = () => {
  const currentMois = format(new Date(), "yyyy-MM");
  const { data: reports = [], isLoading: isLoadingReports } = useInventoryReportsAll();
  const { data: chantiers = [], isLoading: isLoadingChantiers } = useChantiers();
  const [selectedReport, setSelectedReport] = useState<{ id: string; chantierNom: string; mois: string } | null>(null);

  const activeChantiers = useMemo(() => chantiers.filter(c => c.actif), [chantiers]);

  // Map reports by chantier for current month
  const reportsByChantier = useMemo(() => {
    const map = new Map<string, typeof reports[0]>();
    reports
      .filter(r => r.mois === currentMois)
      .forEach(r => map.set(r.chantier_id, r));
    return map;
  }, [reports, currentMois]);

  if (isLoadingReports || isLoadingChantiers) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventaires — {currentMois}
        </h2>
        <p className="text-muted-foreground text-sm">
          État des inventaires mensuels par chantier actif.
        </p>
      </div>

      <div className="grid gap-3">
        {activeChantiers.map(chantier => {
          const report = reportsByChantier.get(chantier.id);
          return (
            <ChantierInventoryCard
              key={chantier.id}
              chantierNom={chantier.nom}
              codeChantier={chantier.code_chantier}
              report={report}
              onClick={() => {
                if (report) {
                  setSelectedReport({
                    id: report.id,
                    chantierNom: chantier.nom,
                    mois: report.mois,
                  });
                }
              }}
            />
          );
        })}
        {activeChantiers.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Aucun chantier actif.
          </Card>
        )}
      </div>

      <InventoryReportDetail
        open={!!selectedReport}
        onOpenChange={() => setSelectedReport(null)}
        reportId={selectedReport?.id ?? null}
        chantierNom={selectedReport?.chantierNom ?? ""}
        mois={selectedReport?.mois ?? ""}
      />
    </div>
  );
};

const ChantierInventoryCard = ({
  chantierNom,
  codeChantier,
  report,
  onClick,
}: {
  chantierNom: string;
  codeChantier: string | null;
  report: any;
  onClick: () => void;
}) => {
  // Load items to check deviations
  const { data: items = [] } = useInventoryItems(report?.id);
  
  const hasCriticalDrop = items.some(item => {
    if (!item.previous_total || item.previous_total <= 0) return false;
    const percent = ((item.total - item.previous_total) / item.previous_total) * 100;
    return percent < -10;
  });

  const hasDeviation = items.some(item => 
    item.previous_total !== null && item.total !== item.previous_total
  );

  return (
    <Card
      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${!report ? "opacity-70" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-muted-foreground" />
          <div>
            <span className="font-medium">
              {codeChantier && <span className="text-muted-foreground mr-1">{codeChantier}</span>}
              {chantierNom}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasCriticalDrop && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-medium">
              <AlertTriangle className="h-3 w-3" />
              Perte &gt;10%
            </span>
          )}
          {!hasCriticalDrop && hasDeviation && (
            <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium">
              Écart
            </span>
          )}
          {!report ? (
            <Badge variant="outline" className="text-muted-foreground">Aucun</Badge>
          ) : report.statut === "TRANSMIS" ? (
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Transmis
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              Brouillon
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
