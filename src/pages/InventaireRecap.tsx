import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, BarChart3, Download, FileText } from "lucide-react";
import { useInventoryReportsAll } from "@/hooks/useInventoryReports";
import { useChantiers } from "@/hooks/useChantiers";
import { useInventoryItemsByReportIds } from "@/hooks/useInventoryItems";
import { PageLayout } from "@/components/layout/PageLayout";

interface ConsolidatedItem {
  categorie: string;
  designation: string;
  unite: string;
  total: number;
  photos: string[];
}

const InventaireRecap = () => {
  const navigate = useNavigate();
  const { data: reports = [], isLoading: isLoadingReports } = useInventoryReportsAll();
  const { data: chantiers = [] } = useChantiers();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const allReportIds = useMemo(() => reports.map(r => r.id), [reports]);
  const { data: allItems = [], isLoading: isLoadingItems } = useInventoryItemsByReportIds(allReportIds);

  const chantierMap = useMemo(() => {
    const map = new Map<string, { nom: string; code_chantier: string | null }>();
    chantiers.forEach(c => map.set(c.id, { nom: c.nom, code_chantier: c.code_chantier }));
    return map;
  }, [chantiers]);

  const reportToChantier = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach(r => map.set(r.id, r.chantier_id));
    return map;
  }, [reports]);

  // Aggregate items by categorie + designation + unite
  const consolidatedItems = useMemo(() => {
    const map = new Map<string, ConsolidatedItem>();

    allItems.forEach(item => {
      const key = `${item.categorie}|||${item.designation}|||${item.unite}`;
      if (!map.has(key)) {
        map.set(key, {
          categorie: item.categorie,
          designation: item.designation,
          unite: item.unite,
          total: 0,
          photos: [],
        });
      }
      const entry = map.get(key)!;
      entry.total += item.quantity_good;
      if (item.photos && item.photos.length > 0) {
        entry.photos.push(...item.photos);
      }
    });

    // Sort by categorie then designation
    return Array.from(map.values()).sort((a, b) => {
      const catCmp = a.categorie.localeCompare(b.categorie);
      return catCmp !== 0 ? catCmp : a.designation.localeCompare(b.designation);
    });
  }, [allItems]);

  // Group for display with category headers
  const categories = useMemo(() => {
    const cats: string[] = [];
    consolidatedItems.forEach(item => {
      if (!cats.includes(item.categorie)) cats.push(item.categorie);
    });
    return cats;
  }, [consolidatedItems]);

  const isLoading = isLoadingReports || isLoadingItems;

  const handleExportExcel = async () => {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Récap Inventaires");

    // Header row
    ws.columns = [
      { header: "Catégorie", key: "categorie", width: 25 },
      { header: "Désignation", key: "designation", width: 35 },
      { header: "Unité", key: "unite", width: 12 },
      { header: "Quantité totale", key: "total", width: 18 },
    ];

    // Style header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    headerRow.alignment = { horizontal: "center" };

    consolidatedItems.forEach(item => {
      ws.addRow({
        categorie: item.categorie,
        designation: item.designation,
        unite: item.unite,
        total: item.total,
      });
    });

    // Auto-filter
    ws.autoFilter = { from: "A1", to: "D1" };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recap-inventaires.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 15;
    const marginRight = 15;
    const tableWidth = pageWidth - marginLeft - marginRight;
    let y = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Récap global inventaires", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Column widths
    const colDesignation = tableWidth * 0.50;
    const colUnite = tableWidth * 0.20;
    const colQte = tableWidth * 0.30;
    const rowHeight = 7;

    const drawHeader = () => {
      doc.setFillColor(37, 99, 235);
      doc.rect(marginLeft, y, tableWidth, rowHeight, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Désignation", marginLeft + 2, y + 5);
      doc.text("Unité", marginLeft + colDesignation + 2, y + 5);
      doc.text("Quantité", marginLeft + colDesignation + colUnite + 2, y + 5);
      doc.setTextColor(0, 0, 0);
      y += rowHeight;
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 15) {
        doc.addPage();
        y = 15;
        drawHeader();
      }
    };

    drawHeader();

    categories.forEach(cat => {
      const catItems = consolidatedItems.filter(i => i.categorie === cat);

      // Category row
      checkPageBreak(rowHeight * 2);
      doc.setFillColor(230, 230, 230);
      doc.rect(marginLeft, y, tableWidth, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(cat.toUpperCase(), marginLeft + 2, y + 5);
      y += rowHeight;

      // Items
      catItems.forEach((item, idx) => {
        checkPageBreak(rowHeight);
        if (idx % 2 === 1) {
          doc.setFillColor(245, 245, 245);
          doc.rect(marginLeft, y, tableWidth, rowHeight, "F");
        }

        // Grid lines
        doc.setDrawColor(200, 200, 200);
        doc.rect(marginLeft, y, colDesignation, rowHeight);
        doc.rect(marginLeft + colDesignation, y, colUnite, rowHeight);
        doc.rect(marginLeft + colDesignation + colUnite, y, colQte, rowHeight);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(item.designation, marginLeft + 2, y + 5);
        doc.text(item.unite, marginLeft + colDesignation + 2, y + 5);
        doc.setFont("helvetica", "bold");
        doc.text(String(item.total), marginLeft + colDesignation + colUnite + 2, y + 5);

        y += rowHeight;
      });
    });

    doc.save("recap-inventaires.pdf");
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Récap global inventaires
            </h1>
          </div>
          <Button onClick={handleExportExcel} disabled={consolidatedItems.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : consolidatedItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Aucun inventaire transmis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <th className="border border-border px-3 py-2 text-left font-semibold">Catégorie</th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">Désignation</th>
                  <th className="border border-border px-3 py-2 text-center font-semibold w-24">Unité</th>
                  <th className="border border-border px-3 py-2 text-center font-semibold w-28">Quantité</th>
                  <th className="border border-border px-3 py-2 text-center font-semibold w-24">Photos</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const catItems = consolidatedItems.filter(i => i.categorie === cat);
                  return (
                    <React.Fragment key={cat}>
                      <tr className="bg-muted">
                        <td colSpan={5} className="border border-border px-3 py-2 font-bold text-primary uppercase tracking-wide text-sm">
                          {cat}
                        </td>
                      </tr>
                      {catItems.map((item, idx) => (
                        <tr
                          key={`${cat}-${item.designation}-${item.unite}`}
                          className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        >
                          <td className="border border-border px-3 py-1.5" />
                          <td className="border border-border px-3 py-1.5">{item.designation}</td>
                          <td className="border border-border px-3 py-1.5 text-center text-muted-foreground">{item.unite}</td>
                          <td className="border border-border px-3 py-1.5 text-center font-bold">{item.total}</td>
                          <td className="border border-border px-3 py-1.5 text-center">
                            {item.photos.length > 0 && (
                              <div className="flex gap-1 justify-center">
                                {item.photos.slice(0, 3).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className="h-7 w-7 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedPhoto(url)}
                                  />
                                ))}
                                {item.photos.length > 3 && (
                                  <span className="text-xs text-muted-foreground self-center">+{item.photos.length - 3}</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {selectedPhoto && (
            <img src={selectedPhoto} alt="" className="w-full h-full max-h-[80vh] object-contain rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default InventaireRecap;
