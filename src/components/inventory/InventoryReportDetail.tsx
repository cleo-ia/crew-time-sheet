import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface InventoryReportDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  chantierNom: string;
  mois: string;
}

export const InventoryReportDetail = ({
  open,
  onOpenChange,
  reportId,
  chantierNom,
  mois,
}: InventoryReportDetailProps) => {
  const { data: items = [], isLoading } = useInventoryItems(reportId ?? undefined);

  // Group by category
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.categorie]) acc[item.categorie] = [];
    acc[item.categorie].push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Inventaire — {chantierNom}
            <span className="text-muted-foreground ml-2 text-sm font-normal">{mois}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun article dans cet inventaire.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([categorie, catItems]) => (
              <div key={categorie}>
                <h3 className="font-semibold text-sm text-primary mb-2">{categorie}</h3>
                <div className="space-y-2">
                  {catItems.map((item) => {
                    const deviationPercent = item.previous_total && item.previous_total > 0
                      ? ((item.total - item.previous_total) / item.previous_total) * 100
                      : 0;
                    const isCritical = item.previous_total !== null && item.previous_total > 0 && deviationPercent < -10;
                    const hasDeviation = item.previous_total !== null && item.total !== item.previous_total;

                    return (
                      <div key={item.id} className="border rounded-md p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{item.designation}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">Total: {item.total}</span>
                            {isCritical && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {deviationPercent.toFixed(0)}%
                              </Badge>
                            )}
                            {!isCritical && hasDeviation && (
                              <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200">
                                Mois-1: {item.previous_total}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="text-emerald-600">Bon: {item.quantity_good}</span>
                          <span className="text-orange-600">À réparer: {item.quantity_repair}</span>
                          <span className="text-destructive">Cassé: {item.quantity_broken}</span>
                        </div>
                        {item.photos && item.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.photos.map((url, idx) => (
                              <img key={idx} src={url} alt="" className="h-16 w-16 object-cover rounded-md border" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
