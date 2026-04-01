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
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.designation} {item.unite ? `(${item.unite})` : ""}</span>
                        <span className="text-sm font-bold">Qté: {item.quantity_good}</span>
                      </div>
                      {item.photos && item.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className="h-16 w-16 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
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
    </Dialog>
  );
};
