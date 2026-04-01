import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, FileText, Package, Settings, BarChart3, ArrowLeft } from "lucide-react";
import { useInventoryReportsAll } from "@/hooks/useInventoryReports";
import { useChantiers } from "@/hooks/useChantiers";
import { useInventoryItemsByReportIds } from "@/hooks/useInventoryItems";
import { InventoryReportDetail } from "@/components/inventory/InventoryReportDetail";

export const InventoryDashboard = () => {
  const navigate = useNavigate();
  const { data: reports = [], isLoading: isLoadingReports } = useInventoryReportsAll();
  const { data: chantiers = [], isLoading: isLoadingChantiers } = useChantiers();
  const [selectedReport, setSelectedReport] = useState<{ id: string; chantierNom: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showConsolide, setShowConsolide] = useState(false);

  const activeChantiers = useMemo(() => chantiers.filter(c => c.actif), [chantiers]);

  const reportsByChantier = useMemo(() => {
    const map = new Map<string, typeof reports[0]>();
    reports.forEach(r => map.set(r.chantier_id, r));
    return map;
  }, [reports]);

  // Load all items for consolidation
  const allReportIds = useMemo(() => reports.map(r => r.id), [reports]);
  const { data: allItems = [], isLoading: isLoadingItems } = useInventoryItemsByReportIds(allReportIds);

  // Chantier name map
  const chantierMap = useMemo(() => {
    const map = new Map<string, { nom: string; code_chantier: string | null }>();
    chantiers.forEach(c => map.set(c.id, { nom: c.nom, code_chantier: c.code_chantier }));
    return map;
  }, [chantiers]);

  // Consolidated data: group by categorie → designation+unite, aggregate totals, track per-chantier
  const consolidatedData = useMemo(() => {
    // Map report_id → chantier_id
    const reportToChantier = new Map<string, string>();
    reports.forEach(r => reportToChantier.set(r.id, r.chantier_id));

    const grouped = new Map<string, Map<string, { total: number; unite: string; perChantier: Map<string, number>; photos: string[] }>>();

    allItems.forEach(item => {
      const chantierId = reportToChantier.get(item.report_id);
      if (!chantierId) return;

      if (!grouped.has(item.categorie)) grouped.set(item.categorie, new Map());
      const catMap = grouped.get(item.categorie)!;

      const key = `${item.designation}|||${item.unite}`;
      if (!catMap.has(key)) {
        catMap.set(key, { total: 0, unite: item.unite, perChantier: new Map(), photos: [] });
      }
      const entry = catMap.get(key)!;
      entry.total += item.quantity_good;

      const chantierInfo = chantierMap.get(chantierId);
      const chantierLabel = chantierInfo
        ? `${chantierInfo.code_chantier ? chantierInfo.code_chantier + " " : ""}${chantierInfo.nom}`
        : chantierId;
      entry.perChantier.set(chantierLabel, (entry.perChantier.get(chantierLabel) || 0) + item.quantity_good);

      if (item.photos && item.photos.length > 0) {
        entry.photos.push(...item.photos);
      }
    });

    return grouped;
  }, [allItems, reports, chantierMap]);

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

  // ── Consolidated full-page view ──
  if (showConsolide) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowConsolide(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Récap global inventaires
          </h2>
        </div>

        {isLoadingItems ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : consolidatedData.size === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Aucun inventaire transmis.</p>
        ) : (
          Array.from(consolidatedData.entries()).map(([categorie, items]) => (
            <div key={categorie}>
              <h3 className="font-semibold text-sm text-primary mb-2 uppercase tracking-wide">{categorie}</h3>
              <div className="space-y-3">
                {Array.from(items.entries()).map(([key, data]) => {
                  const designation = key.split("|||")[0];
                  return (
                    <Card key={key} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {designation} {data.unite ? `(${data.unite})` : ""}
                        </span>
                        <Badge variant="secondary" className="font-bold">
                          Total: {data.total}
                        </Badge>
                      </div>
                      {data.photos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {data.photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className="h-10 w-10 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedPhoto(url)}
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            {selectedPhoto && (
              <img src={selectedPhoto} alt="" className="w-full h-full max-h-[80vh] object-contain rounded-md" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Default: chantier list view ──
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
        className="w-full h-14 text-base font-semibold gap-3"
        size="lg"
        onClick={() => setShowConsolide(true)}
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
