import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, FileText, Package, FilePlus, BarChart3 } from "lucide-react";
import { useInventoryReportsAll } from "@/hooks/useInventoryReports";
import { useChantiers } from "@/hooks/useChantiers";
import { InventoryReportDetail } from "@/components/inventory/InventoryReportDetail";

export const InventoryDashboard = () => {
  const navigate = useNavigate();
  const { data: reports = [], isLoading: isLoadingReports } = useInventoryReportsAll();
  const { data: chantiers = [], isLoading: isLoadingChantiers } = useChantiers();
  const [selectedReport, setSelectedReport] = useState<{ id: string; chantierNom: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const activeChantiers = useMemo(() => chantiers.filter(c => c.actif), [chantiers]);

  const reportsByChantier = useMemo(() => {
    const map = new Map<string, typeof reports[0]>();
    reports.forEach(r => map.set(r.chantier_id, r));
    return map;
  }, [reports]);

  if (isLoadingReports || isLoadingChantiers) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const renderStatusBadge = (report: typeof reports[0] | undefined) => {
    if (!report) return <Badge variant="outline" className="text-muted-foreground">Aucun</Badge>;
    if (report.statut === "TRANSMIS") {
      return (
        <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Transmis
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <FileText className="h-3 w-3" />
        Brouillon
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventaires
          </h2>
          <p className="text-muted-foreground text-sm">
            État des inventaires par chantier actif.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/inventaire-parametrage")}>
          <Settings className="h-4 w-4 mr-2" />
          Paramétrer
        </Button>
      </div>

      <Button
        className="w-full h-14 text-base font-semibold gap-3 bg-orange-500 hover:bg-orange-600 text-white"
        size="lg"
        onClick={() => navigate("/inventaire-recap")}
      >
        <BarChart3 className="h-5 w-5" />
        Récap global inventaires
      </Button>

      <div className="grid gap-3">
        {activeChantiers.map(chantier => {
          const report = reportsByChantier.get(chantier.id);
          return (
            <Card
              key={chantier.id}
              className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${!report ? "opacity-70" : ""}`}
              onClick={() => {
                if (report) {
                  setSelectedReport({ id: report.id, chantierNom: chantier.nom });
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    {chantier.code_chantier && <span className="text-muted-foreground mr-1">{chantier.code_chantier}</span>}
                    {chantier.nom}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(report)}
                </div>
              </div>
            </Card>
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
      />

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {selectedPhoto && (
            <img src={selectedPhoto} alt="" className="w-full h-full max-h-[80vh] object-contain rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
