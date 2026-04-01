import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryReportDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  chantierNom: string;
}

export const InventoryReportDetail = ({
  open,
  onOpenChange,
  reportId,
  chantierNom,
}: InventoryReportDetailProps) => {
  const { data: items = [], isLoading } = useInventoryItems(reportId ?? undefined);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
                  {catItems.map((item) => (
                    <div key={item.id} className="border rounded-md p-3 bg-muted/30">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-medium text-sm">{item.designation} {item.unite ? `(${item.unite})` : ""}</span>
                        <div className="flex gap-2 text-xs">
                          {item.quantity_good > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Bon: {item.quantity_good}
                            </span>
                          )}
                          {item.quantity_repair > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-orange-500" />
                              Nettoyer: {item.quantity_repair}
                            </span>
                          )}
                          {item.quantity_broken > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Réparer: {item.quantity_broken}
                            </span>
                          )}
                          {item.quantity_good === 0 && item.quantity_repair === 0 && item.quantity_broken === 0 && (
                            <span className="text-muted-foreground">Qté: 0</span>
                          )}
                        </div>
                      </div>
                      {item.photos && item.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className="h-10 w-10 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedPhoto(url)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt=""
              className="w-full h-full max-h-[80vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
