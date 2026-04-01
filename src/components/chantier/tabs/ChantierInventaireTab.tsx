import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Send, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useInventoryTemplates } from "@/hooks/useInventoryTemplates";
import { useInventoryReport, useCreateInventoryReport, useTransmitInventoryReport } from "@/hooks/useInventoryReports";
import { useInventoryItems, useUpsertInventoryItems } from "@/hooks/useInventoryItems";
import { useUploadInventoryPhoto, useDeleteInventoryPhoto } from "@/hooks/useInventoryPhotos";
import { InventoryItemRow } from "@/components/inventory/InventoryItemRow";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { useAuth } from "@/contexts/AuthProvider";

interface LocalItem {
  template_id: string | null;
  categorie: string;
  designation: string;
  unite: string;
  quantity_good: number;
  quantity_repair: number;
  quantity_broken: number;
  photos: string[];
}

interface ChantierInventaireTabProps {
  chantierId: string;
  readOnly?: boolean;
}

export const ChantierInventaireTab = ({ chantierId, readOnly = false }: ChantierInventaireTabProps) => {
  const { user } = useAuth();

  const { data: templates = [], isLoading: isLoadingTemplates } = useInventoryTemplates();
  const { data: currentReport, isLoading: isLoadingReport } = useInventoryReport(chantierId);
  const { data: currentItems = [], isLoading: isLoadingItems } = useInventoryItems(currentReport?.id);

  const createReport = useCreateInventoryReport();
  const upsertItems = useUpsertInventoryItems();
  const transmitReport = useTransmitInventoryReport();
  const uploadPhoto = useUploadInventoryPhoto();
  const deletePhoto = useDeleteInventoryPhoto();

  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const isTransmitted = currentReport?.statut === "TRANSMIS";
  const isEditable = !readOnly && !isTransmitted;

  // Initialize local items
  useEffect(() => {
    if (initialized) return;
    if (isLoadingReport || isLoadingTemplates || isLoadingItems) return;

    if (currentItems.length > 0) {
      setLocalItems(currentItems.map(item => ({
        template_id: item.template_id,
        categorie: item.categorie,
        designation: item.designation,
        unite: item.unite,
        quantity_good: item.quantity_good,
        quantity_repair: item.quantity_repair,
        quantity_broken: item.quantity_broken,
        photos: item.photos || [],
      })));
      setInitialized(true);
    } else if (templates.length > 0) {
      setLocalItems(templates.map(t => ({
        template_id: t.id,
        categorie: t.categorie,
        designation: t.designation,
        unite: t.unite,
        quantity_good: 0,
        quantity_repair: 0,
        quantity_broken: 0,
        photos: [],
      })));
      setInitialized(true);
    }
  }, [currentItems, templates, isLoadingReport, isLoadingTemplates, isLoadingItems, initialized]);

  // Group items by category
  const grouped = useMemo(() => {
    const map: Record<string, LocalItem[]> = {};
    localItems.forEach((item, idx) => {
      if (!map[item.categorie]) map[item.categorie] = [];
      map[item.categorie].push({ ...item, _idx: idx } as any);
    });
    return map;
  }, [localItems]);

  const handleQuantityChange = useCallback((idx: number, field: "quantity_good" | "quantity_repair" | "quantity_broken", value: number) => {
    setLocalItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }, []);

  const handlePhotoAdd = useCallback(async (idx: number, file: File) => {
    let reportId = currentReport?.id;

    if (!reportId) {
      const report = await createReport.mutateAsync({ chantierId });
      reportId = report.id;
    }

    const url = await uploadPhoto.mutateAsync({ reportId, file });
    setLocalItems(prev => prev.map((item, i) => 
      i === idx ? { ...item, photos: [...item.photos, url] } : item
    ));
  }, [currentReport, uploadPhoto, createReport, chantierId]);

  const handlePhotoRemove = useCallback(async (idx: number, url: string) => {
    await deletePhoto.mutateAsync(url);
    setLocalItems(prev => prev.map((item, i) => 
      i === idx ? { ...item, photos: item.photos.filter(p => p !== url) } : item
    ));
  }, [deletePhoto]);

  const handleSave = async () => {
    let reportId = currentReport?.id;

    if (!reportId) {
      const report = await createReport.mutateAsync({ chantierId });
      reportId = report.id;
    }

    await upsertItems.mutateAsync({
      reportId,
      items: localItems.map(item => ({
        ...item,
        previous_total: null,
      })),
    });
  };

  const handleTransmit = () => {
    setShowSignature(true);
  };

  const handleSignatureSave = async (signatureData: string) => {
    await handleSave();
    
    if (!currentReport?.id) return;
    
    await transmitReport.mutateAsync({
      reportId: currentReport.id,
      signatureData,
    });
    setShowSignature(false);
  };

  const isLoading = isLoadingReport || isLoadingTemplates || isLoadingItems;
  const isSaving = createReport.isPending || upsertItems.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (templates.length === 0 && currentItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Aucun catalogue défini</h3>
        <p className="text-muted-foreground text-sm">
          Le conducteur de travaux doit d'abord configurer le catalogue de matériel dans l'Administration.
        </p>
      </Card>
    );
  }

  if (showSignature) {
    return (
      <SignaturePad
        employeeName={user?.email || "Chef de chantier"}
        onSave={handleSignatureSave}
        onCancel={() => setShowSignature(false)}
      />
    );
  }

  return (
    <div className={`space-y-4 ${isEditable ? "pb-20" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventaire
          </h2>
          {isTransmitted && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              ✅ Inventaire transmis le {currentReport?.transmitted_at ? format(new Date(currentReport.transmitted_at), "dd/MM/yyyy à HH:mm") : ""}
            </p>
          )}
        </div>
      </div>

      {/* Items by category */}
      <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-2">
        {Object.entries(grouped).map(([categorie, catItems]) => (
          <AccordionItem key={categorie} value={categorie} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50">
              <span className="font-semibold text-sm">{categorie}</span>
              <span className="text-xs text-muted-foreground ml-2">({catItems.length} articles)</span>
            </AccordionTrigger>
            <AccordionContent className="p-3 space-y-2">
              {catItems.map((item: any) => (
                <InventoryItemRow
                  key={`${item.categorie}-${item.designation}`}
                  designation={item.designation}
                  unite={item.unite}
                  quantityGood={item.quantity_good}
                  quantityRepair={item.quantity_repair}
                  quantityBroken={item.quantity_broken}
                  photos={item.photos}
                  readOnly={!isEditable}
                  onQuantityChange={(field, value) => handleQuantityChange(item._idx, field, value)}
                  onPhotoAdd={(file) => handlePhotoAdd(item._idx, file)}
                  onPhotoRemove={(url) => handlePhotoRemove(item._idx, url)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Action buttons */}
      {isEditable && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder brouillon
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleTransmit}
            disabled={isSaving || localItems.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Transmettre
          </Button>
        </div>
      )}
    </div>
  );
};
