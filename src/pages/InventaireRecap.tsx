import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, BarChart3, Download, FileText } from "lucide-react";
import { useInventoryReportsAll } from "@/hooks/useInventoryReports";
import { useChantiers } from "@/hooks/useChantiers";
import { useInventoryItemsByReportIds } from "@/hooks/useInventoryItems";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";

interface MatrixItem {
  categorie: string;
  designation: string;
  unite: string;
  byChantierGood: Map<string, number>;
  byChantierRepair: Map<string, number>;
  byChantierBroken: Map<string, number>;
  totalGood: number;
  totalRepair: number;
  totalBroken: number;
  total: number;
  photos: string[];
}

const InventaireRecap = () => {
  const navigate = useNavigate();
  const config = useEnterpriseConfig();
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

  // Get sorted list of chantier IDs that have inventory data
  const chantierIds = useMemo(() => {
    const ids = new Set<string>();
    allItems.forEach(item => {
      const chantierId = reportToChantier.get(item.report_id);
      if (chantierId) ids.add(chantierId);
    });
    return Array.from(ids).sort((a, b) => {
      const ca = chantierMap.get(a);
      const cb = chantierMap.get(b);
      const nameA = ca?.code_chantier || ca?.nom || "";
      const nameB = cb?.code_chantier || cb?.nom || "";
      return nameA.localeCompare(nameB);
    });
  }, [allItems, reportToChantier, chantierMap]);

  const getChantierLabel = (id: string) => {
    const c = chantierMap.get(id);
    if (!c) return "—";
    return c.code_chantier || c.nom;
  };

  // Build matrix: aggregate items by categorie + designation + unite, with per-chantier breakdown
  const matrixItems = useMemo(() => {
    const map = new Map<string, MatrixItem>();

    allItems.forEach(item => {
      const chantierId = reportToChantier.get(item.report_id);
      if (!chantierId) return;

      const key = `${item.categorie}|||${item.designation}|||${item.unite}`;
      if (!map.has(key)) {
        map.set(key, {
          categorie: item.categorie,
          designation: item.designation,
          unite: item.unite,
          byChantier: new Map(),
          total: 0,
          photos: [],
        });
      }
      const entry = map.get(key)!;
      entry.byChantier.set(chantierId, (entry.byChantier.get(chantierId) || 0) + item.quantity_good);
      entry.total += item.quantity_good;
      if (item.photos && item.photos.length > 0) {
        entry.photos.push(...item.photos);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const catCmp = a.categorie.localeCompare(b.categorie);
      return catCmp !== 0 ? catCmp : a.designation.localeCompare(b.designation);
    });
  }, [allItems, reportToChantier]);

  const categories = useMemo(() => {
    const cats: string[] = [];
    matrixItems.forEach(item => {
      if (!cats.includes(item.categorie)) cats.push(item.categorie);
    });
    return cats;
  }, [matrixItems]);

  const isLoading = isLoadingReports || isLoadingItems;
  const totalColCount = 3 + chantierIds.length + 1 + 1; // designation + unite + chantiers + total + photos

  // ───── Excel export ─────
  const handleExportExcel = async () => {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = config.nom;
    wb.created = new Date();

    const ws = wb.addWorksheet("Récap Inventaires", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      headerFooter: { oddFooter: `&L${config.nom}&CPage &P / &N&R&D` },
    });

    const orange = "FFEA580C";
    const orangeLight = "FFFEF3E2";
    const grayLight = "FFF5F5F5";
    const borderThin = { style: "thin" as const, color: { argb: "FFD4D4D8" } };
    const borders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

    const nbCols = 2 + chantierIds.length + 1; // designation, unite, chantiers..., total

    // Title row
    ws.mergeCells(1, 1, 1, nbCols);
    const titleCell = ws.getCell("A1");
    titleCell.value = "RÉCAP GLOBAL INVENTAIRES";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1A1A1A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Subtitle row
    ws.mergeCells(2, 1, 2, nbCols);
    const subtitleCell = ws.getCell("A2");
    subtitleCell.value = `${config.nom} — Édité le ${new Date().toLocaleDateString("fr-FR")}`;
    subtitleCell.font = { size: 10, color: { argb: "FF666666" }, italic: true };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 20;

    ws.getRow(3).height = 8;

    // Column widths
    ws.getColumn(1).width = 35; // Désignation
    ws.getColumn(2).width = 12; // Unité
    chantierIds.forEach((_, i) => {
      ws.getColumn(3 + i).width = 16;
    });
    ws.getColumn(3 + chantierIds.length).width = 14; // Total

    // Header row (row 4)
    const headerRowNum = 4;
    const headers = ["Désignation", "Unité", ...chantierIds.map(id => getChantierLabel(id)), "TOTAL"];
    const headerRow = ws.getRow(headerRowNum);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: orange } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borders;
    });
    // Désignation left-aligned
    headerRow.getCell(1).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    headerRow.height = 28;

    // Data rows
    let currentRow = headerRowNum + 1;

    categories.forEach(cat => {
      const catItems = matrixItems.filter(i => i.categorie === cat);

      // Category separator
      const catRow = ws.getRow(currentRow);
      ws.mergeCells(currentRow, 1, currentRow, nbCols);
      const catCell = catRow.getCell(1);
      catCell.value = cat.toUpperCase();
      catCell.font = { bold: true, size: 10, color: { argb: "FF333333" } };
      catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5EA" } };
      catCell.alignment = { vertical: "middle" };
      catCell.border = borders;
      catRow.height = 20;
      currentRow++;

      catItems.forEach((item, idx) => {
        const row = ws.getRow(currentRow);
        row.getCell(1).value = item.designation;
        row.getCell(2).value = item.unite;

        chantierIds.forEach((cId, ci) => {
          const qty = item.byChantier.get(cId) || 0;
          row.getCell(3 + ci).value = qty || "";
        });

        row.getCell(nbCols).value = item.total;

        // Zebra + styling
        const bgColor = idx % 2 === 0 ? "FFFFFFFF" : grayLight;
        for (let c = 1; c <= nbCols; c++) {
          const cell = row.getCell(c);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.border = borders;
          cell.font = { size: 9, color: { argb: "FF333333" } };
          cell.alignment = { horizontal: c >= 2 ? "center" : "left", vertical: "middle" };
        }
        // Total col bold
        row.getCell(nbCols).font = { size: 9, bold: true, color: { argb: "FF1A1A1A" } };
        row.height = 18;
        currentRow++;
      });
    });

    // Total row
    currentRow++;
    const totalRow = ws.getRow(currentRow);
    ws.mergeCells(currentRow, 1, currentRow, 2);
    totalRow.getCell(1).value = "TOTAL GÉNÉRAL";
    totalRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    totalRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: orange } };
    totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    totalRow.getCell(1).border = borders;

    // Per-chantier totals
    chantierIds.forEach((cId, ci) => {
      const colTotal = matrixItems.reduce((sum, item) => sum + (item.byChantier.get(cId) || 0), 0);
      const cell = totalRow.getCell(3 + ci);
      cell.value = colTotal;
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: orange } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borders;
    });

    // Grand total
    const grandTotal = matrixItems.reduce((sum, i) => sum + i.total, 0);
    const gtCell = totalRow.getCell(nbCols);
    gtCell.value = grandTotal;
    gtCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    gtCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: orange } };
    gtCell.alignment = { horizontal: "center", vertical: "middle" };
    gtCell.border = borders;

    totalRow.height = 24;

    // Auto-filter & freeze
    ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum, column: nbCols } };
    ws.views = [{ state: "frozen", ySplit: headerRowNum }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recap-inventaires-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ───── PDF export (simple: Désignation, Unité, Quantité) ─────
  const handleExportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 15;
    const marginRight = 15;
    const tableWidth = pageWidth - marginLeft - marginRight;
    const accentR = 234, accentG = 88, accentB = 12;
    let y = 12;

    const loadLogo = (): Promise<{ base64: string; ratio: number } | null> => {
      return new Promise((resolve) => {
        if (!config.theme?.logo) { resolve(null); return; }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve({ base64: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight });
        };
        img.onerror = () => resolve(null);
        img.src = config.theme.logo;
      });
    };

    const logoData = await loadLogo();

    const drawPageHeader = (isFirstPage: boolean) => {
      const headerY = 12;
      if (logoData) {
        const logoH = 12;
        const logoW = logoH * logoData.ratio;
        doc.addImage(logoData.base64, "PNG", marginLeft, headerY - 5, logoW, logoH);
      }
      doc.setFontSize(isFirstPage ? 18 : 12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Récap global inventaires", pageWidth / 2, headerY + 2, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - marginRight, headerY + 2, { align: "right" });
      if (isFirstPage) {
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(config.nom, pageWidth / 2, headerY + 9, { align: "center" });
      }
      const lineY = isFirstPage ? headerY + 14 : headerY + 7;
      doc.setDrawColor(accentR, accentG, accentB);
      doc.setLineWidth(0.8);
      doc.line(marginLeft, lineY, pageWidth - marginRight, lineY);
      return lineY + 6;
    };

    y = drawPageHeader(true);

    const colDesignation = tableWidth * 0.55;
    const colUnite = tableWidth * 0.20;
    const colQte = tableWidth * 0.25;
    const rowHeight = 7;

    const drawTableHeader = () => {
      doc.setFillColor(accentR, accentG, accentB);
      doc.rect(marginLeft, y, tableWidth, rowHeight + 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Désignation", marginLeft + 4, y + 5.5);
      doc.text("Unité", marginLeft + colDesignation + colUnite / 2, y + 5.5, { align: "center" });
      doc.text("Quantité", marginLeft + colDesignation + colUnite + colQte / 2, y + 5.5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += rowHeight + 1;
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        drawFooter(doc.getNumberOfPages());
        doc.addPage();
        y = drawPageHeader(false);
        drawTableHeader();
      }
    };

    const drawFooter = (pageNum: number) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 160);
      doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      doc.text(config.nom, marginLeft, pageHeight - 8);
    };

    drawTableHeader();

    categories.forEach(cat => {
      const catItems = matrixItems.filter(i => i.categorie === cat);
      checkPageBreak(rowHeight * 2);
      doc.setFillColor(235, 235, 240);
      doc.rect(marginLeft, y, tableWidth, rowHeight + 0.5, "F");
      doc.setFillColor(accentR, accentG, accentB);
      doc.rect(marginLeft, y, 1.5, rowHeight + 0.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(cat.toUpperCase(), marginLeft + 5, y + 5.2);
      y += rowHeight + 0.5;

      catItems.forEach((item, idx) => {
        checkPageBreak(rowHeight);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(marginLeft, y, tableWidth, rowHeight, "F");
        }
        doc.setDrawColor(215, 215, 220);
        doc.setLineWidth(0.2);
        doc.line(marginLeft, y + rowHeight, pageWidth - marginRight, y + rowHeight);
        doc.line(marginLeft + colDesignation, y, marginLeft + colDesignation, y + rowHeight);
        doc.line(marginLeft + colDesignation + colUnite, y, marginLeft + colDesignation + colUnite, y + rowHeight);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(item.designation, marginLeft + 4, y + 5);
        doc.setTextColor(100, 100, 100);
        doc.text(item.unite, marginLeft + colDesignation + colUnite / 2, y + 5, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(String(item.total), marginLeft + colDesignation + colUnite + colQte / 2, y + 5, { align: "center" });
        y += rowHeight;
      });
      y += 1;
    });

    drawFooter(doc.getNumberOfPages());
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPdf} disabled={matrixItems.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleExportExcel} disabled={matrixItems.length === 0} style={{ backgroundColor: "#ea580c" }} className="text-white hover:opacity-90">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : matrixItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Aucun inventaire transmis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#ea580c", color: "#ffffff" }}>
                  <th className="border border-border px-3 py-2 text-left font-semibold">Catégorie</th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">Désignation</th>
                  <th className="border border-border px-3 py-2 text-center font-semibold w-24">Unité</th>
                  <th className="border border-border px-3 py-2 text-center font-semibold w-28">Quantité</th>
                  <th className="border border-border px-3 py-2 text-center font-semibold w-24">Photos</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const catItems = matrixItems.filter(i => i.categorie === cat);
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
