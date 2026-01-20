import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RecapChantierRow, VentilationEmployeeRow } from "@/hooks/useVentilationAnalytique";
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoSder from "@/assets/logo-sder.png";
import logoEngoBourgogne from "@/assets/logo-engo-bourgogne.png";

const formatPeriodeLabel = (periode: string): string => {
  const [year, month] = periode.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, "MMMM yyyy", { locale: fr });
};

const applyHeaderStyle = (row: ExcelJS.Row, workbook: ExcelJS.Workbook) => {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" }
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });
};

const applyTotalRowStyle = (row: ExcelJS.Row) => {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E2F3" }
    };
    cell.font = { bold: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });
};

const applyCellBorder = (row: ExcelJS.Row) => {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });
};

// Export Récap Chantier
export const exportRecapChantierExcel = async (data: RecapChantierRow[], periode: string): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Récap Chantiers");
  
  // Title
  const periodeLabel = formatPeriodeLabel(periode);
  const titleRow = sheet.addRow([`Récapitulatif par chantier - ${periodeLabel}`]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([`Édition du ${format(new Date(), "dd/MM/yyyy à HH:mm")}`]);
  sheet.addRow([]);
  
  // Headers
  const headers = ["Code analytique", "Libellé", "INTERIM", "MO", "MOAPP", "TOTAL"];
  const headerRow = sheet.addRow(headers);
  applyHeaderStyle(headerRow, workbook);
  
  // Data rows
  let totalInterim = 0, totalMO = 0, totalMOAPP = 0, grandTotal = 0;
  
  data.forEach(row => {
    const dataRow = sheet.addRow([
      row.codeAnalytique,
      row.libelle,
      row.heuresInterim,
      row.heuresMO,
      row.heuresMOAPP,
      row.total
    ]);
    applyCellBorder(dataRow);
    
    totalInterim += row.heuresInterim;
    totalMO += row.heuresMO;
    totalMOAPP += row.heuresMOAPP;
    grandTotal += row.total;
  });
  
  // Total row
  const totalRow = sheet.addRow(["TOTAL", "", totalInterim, totalMO, totalMOAPP, grandTotal]);
  applyTotalRowStyle(totalRow);
  
  // Column widths
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 40;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `Recap-Chantiers-${periode}.xlsx`;
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  
  return fileName;
};

// Export Ventilation Ouvrier
export const exportVentilationOuvrierExcel = async (data: VentilationEmployeeRow[], periode: string): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ventilation Ouvriers");
  
  // Title
  const periodeLabel = formatPeriodeLabel(periode);
  const titleRow = sheet.addRow([`Ventilation analytique par ouvrier - ${periodeLabel}`]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([`Édition du ${format(new Date(), "dd/MM/yyyy à HH:mm")}`]);
  sheet.addRow([]);
  
  // Headers
  const headers = ["Nom", "Prénom", "Code analytique", "Type MO", "Quantité", "%"];
  const headerRow = sheet.addRow(headers);
  applyHeaderStyle(headerRow, workbook);
  
  // Data rows
  data.forEach(row => {
    const dataRow = sheet.addRow([
      row.nom,
      row.prenom,
      row.codeAnalytique,
      row.typeMO,
      row.quantite,
      row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`
    ]);
    
    if (row.isTotal) {
      applyTotalRowStyle(dataRow);
    } else {
      applyCellBorder(dataRow);
    }
  });
  
  // Column widths
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `Ventilation-Ouvriers-${periode}.xlsx`;
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  
  return fileName;
};

// Export Ventilation Intérim
export const exportVentilationInterimExcel = async (data: VentilationEmployeeRow[], periode: string): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ventilation Intérim");
  
  // Title
  const periodeLabel = formatPeriodeLabel(periode);
  const titleRow = sheet.addRow([`Ventilation analytique intérimaires - ${periodeLabel}`]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([`Édition du ${format(new Date(), "dd/MM/yyyy à HH:mm")}`]);
  sheet.addRow([]);
  
  // Headers
  const headers = ["Nom", "Prénom", "Agence", "Code analytique", "Quantité", "%"];
  const headerRow = sheet.addRow(headers);
  applyHeaderStyle(headerRow, workbook);
  
  // Data rows
  data.forEach(row => {
    const dataRow = sheet.addRow([
      row.nom,
      row.prenom,
      row.agenceInterim || "",
      row.codeAnalytique,
      row.quantite,
      row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`
    ]);
    
    if (row.isTotal) {
      applyTotalRowStyle(dataRow);
    } else {
      applyCellBorder(dataRow);
    }
  });
  
  // Column widths
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 25;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `Ventilation-Interim-${periode}.xlsx`;
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  
  return fileName;
};

// Export complet (3 feuilles) - Excel
export const exportVentilationCompleteExcel = async (
  recap: RecapChantierRow[],
  ouvrier: VentilationEmployeeRow[],
  interim: VentilationEmployeeRow[],
  periode: string
): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const periodeLabel = formatPeriodeLabel(periode);
  const editionDate = format(new Date(), "dd/MM/yyyy à HH:mm");
  
  // Sheet 1: Récap Chantiers
  const sheet1 = workbook.addWorksheet("Récap Chantiers");
  sheet1.addRow([`Récapitulatif par chantier - ${periodeLabel}`]).font = { bold: true, size: 14 };
  sheet1.addRow([`Édition du ${editionDate}`]);
  sheet1.addRow([]);
  
  const headers1 = ["Code analytique", "Libellé", "INTERIM", "MO", "MOAPP", "TOTAL"];
  applyHeaderStyle(sheet1.addRow(headers1), workbook);
  
  let totalInterim = 0, totalMO = 0, totalMOAPP = 0, grandTotal = 0;
  recap.forEach(row => {
    const dataRow = sheet1.addRow([row.codeAnalytique, row.libelle, row.heuresInterim, row.heuresMO, row.heuresMOAPP, row.total]);
    applyCellBorder(dataRow);
    totalInterim += row.heuresInterim;
    totalMO += row.heuresMO;
    totalMOAPP += row.heuresMOAPP;
    grandTotal += row.total;
  });
  applyTotalRowStyle(sheet1.addRow(["TOTAL", "", totalInterim, totalMO, totalMOAPP, grandTotal]));
  
  sheet1.getColumn(1).width = 20;
  sheet1.getColumn(2).width = 40;
  sheet1.getColumn(3).width = 12;
  sheet1.getColumn(4).width = 12;
  sheet1.getColumn(5).width = 12;
  sheet1.getColumn(6).width = 12;
  
  // Sheet 2: Ventilation Ouvriers
  const sheet2 = workbook.addWorksheet("Ventilation Ouvriers");
  sheet2.addRow([`Ventilation analytique par ouvrier - ${periodeLabel}`]).font = { bold: true, size: 14 };
  sheet2.addRow([`Édition du ${editionDate}`]);
  sheet2.addRow([]);
  
  const headers2 = ["Nom", "Prénom", "Code analytique", "Type MO", "Quantité", "%"];
  applyHeaderStyle(sheet2.addRow(headers2), workbook);
  
  ouvrier.forEach(row => {
    const dataRow = sheet2.addRow([row.nom, row.prenom, row.codeAnalytique, row.typeMO, row.quantite, row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`]);
    if (row.isTotal) applyTotalRowStyle(dataRow);
    else applyCellBorder(dataRow);
  });
  
  sheet2.getColumn(1).width = 20;
  sheet2.getColumn(2).width = 20;
  sheet2.getColumn(3).width = 20;
  sheet2.getColumn(4).width = 12;
  sheet2.getColumn(5).width = 12;
  sheet2.getColumn(6).width = 12;
  
  // Sheet 3: Ventilation Intérim
  const sheet3 = workbook.addWorksheet("Ventilation Intérim");
  sheet3.addRow([`Ventilation analytique intérimaires - ${periodeLabel}`]).font = { bold: true, size: 14 };
  sheet3.addRow([`Édition du ${editionDate}`]);
  sheet3.addRow([]);
  
  const headers3 = ["Nom", "Prénom", "Agence", "Code analytique", "Quantité", "%"];
  applyHeaderStyle(sheet3.addRow(headers3), workbook);
  
  interim.forEach(row => {
    const dataRow = sheet3.addRow([row.nom, row.prenom, row.agenceInterim || "", row.codeAnalytique, row.quantite, row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`]);
    if (row.isTotal) applyTotalRowStyle(dataRow);
    else applyCellBorder(dataRow);
  });
  
  sheet3.getColumn(1).width = 20;
  sheet3.getColumn(2).width = 20;
  sheet3.getColumn(3).width = 25;
  sheet3.getColumn(4).width = 20;
  sheet3.getColumn(5).width = 12;
  sheet3.getColumn(6).width = 12;
  
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `Ventilation-Analytique-${periode}.xlsx`;
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  
  return fileName;
};

// ============= PDF EXPORT =============

// Couleurs conformes aux tableaux Excel de référence
const COLORS = {
  green: { r: 0, g: 128, b: 0 },             // #008000 - En-têtes colonnes (vert vif)
  yellowPale: { r: 255, g: 255, b: 215 },    // #FFFFD7 - Lignes DONNÉES (jaune pâle)
  white: { r: 255, g: 255, b: 255 },         // Lignes TOTAL (blanc)
  black: { r: 0, g: 0, b: 0 },
};

// Helper pour formater les nombres au format FR (virgule décimale)
const formatNumberFR = (n: number): string => n.toFixed(2).replace(".", ",");
const formatPercentFR = (n: number): string => `${n.toFixed(2).replace(".", ",")} %`;

const getEntrepriseName = (): string => {
  const slug = localStorage.getItem("entreprise_slug");
  const names: Record<string, string> = {
    "limoge-revillon": "Limoge Revillon",
    "sder": "SDER",
    "engo-bourgogne": "Engo Bourgogne",
  };
  return names[slug || ""] || "Entreprise";
};

const getEntrepriseLocation = (): string => {
  const slug = localStorage.getItem("entreprise_slug");
  const locations: Record<string, string> = {
    "limoge-revillon": "Senozan",
    "sder": "Lyon",
    "engo-bourgogne": "Dijon",
  };
  return locations[slug || ""] || "";
};

// Helper pour calculer la période complète (du JJ/MM/AAAA au JJ/MM/AAAA)
const getPeriodeDates = (periode: string): { debut: string; fin: string } => {
  const [year, month] = periode.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    debut: format(firstDay, "dd/MM/yyyy"),
    fin: format(lastDay, "dd/MM/yyyy"),
  };
};

// Export complet PDF (3 sections) - Portrait A4 avec pagination robuste
export const exportVentilationCompletePdf = async (
  recap: RecapChantierRow[],
  ouvrier: VentilationEmployeeRow[],
  interim: VentilationEmployeeRow[],
  periode: string
): Promise<string> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 10;
  const headerHeight = 32;
  const footerReserved = 20; // Augmenté pour éviter coupure bas de page
  const rowHeight = 6;
  const headerRowHeight = 7;
  const maxY = pageHeight - footerReserved;
  const contentWidth = pageWidth - 2 * margin;
  
  const entrepriseName = getEntrepriseName();
  const location = getEntrepriseLocation();
  const periodeDates = getPeriodeDates(periode);
  const dateStr = format(new Date(), "dd/MM/yyyy");
  
  let currentY = margin + headerHeight;
  let currentTitle = "";

  const drawText = (text: string, x: number, y: number, options?: { 
    bold?: boolean; 
    align?: "left" | "center" | "right";
    fontSize?: number;
    color?: { r: number; g: number; b: number };
  }) => {
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    const color = options?.color || COLORS.black;
    pdf.setTextColor(color.r, color.g, color.b);
    
    if (options?.align === "center") {
      pdf.text(text, x, y, { align: "center" });
    } else if (options?.align === "right") {
      pdf.text(text, x, y, { align: "right" });
    } else {
      pdf.text(text, x, y);
    }
  };

  const drawPageHeader = (title: string) => {
    currentTitle = title;
    drawText(entrepriseName, margin, 12, { bold: true, fontSize: 11 });
    drawText(`${location}, le ${dateStr}`, pageWidth - margin, 12, { fontSize: 10, align: "right" });
    drawText(title, pageWidth / 2, 22, { bold: true, fontSize: 12, align: "center" });
    drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 29, { fontSize: 10, align: "center" });
  };

  const drawTableHeaderRow = (headers: string[], colWidths: number[], startX: number) => {
    let x = startX;
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], headerRowHeight, "FD");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(header, x + colWidths[i] / 2, currentY + 5, { align: "center" });
      x += colWidths[i];
    });
    pdf.setTextColor(0, 0, 0);
    currentY += headerRowHeight;
  };

  const drawTableDataRow = (values: string[], colWidths: number[], startX: number, isTotal: boolean) => {
    let x = startX;
    values.forEach((val, i) => {
      // Conforme Excel : données = jaune pâle, TOTAL = blanc
      if (isTotal) {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        pdf.setFillColor(COLORS.yellowPale.r, COLORS.yellowPale.g, COLORS.yellowPale.b);
      }
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], rowHeight, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: isTotal, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += rowHeight;
  };

  // ===== SECTION 1: Récap Chantier =====
  drawPageHeader("RECAP HEURES par Chantier par type main d'oeuvre");
  
  const colWidths1 = [30, 75, 22, 22, 22, 22]; // Total ~193mm pour portrait
  const headers1 = ["Code", "Libelle", "INTERIM", "MO", "MOAPP", "TOTAL"];
  const tableStartX1 = margin + (contentWidth - colWidths1.reduce((a, b) => a + b, 0)) / 2;
  
  let currentHeaders1 = headers1;
  let currentColWidths1 = colWidths1;
  let currentStartX1 = tableStartX1;
  
  const checkPageBreak1 = () => {
    if (currentY + rowHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader(currentTitle);
      drawTableHeaderRow(currentHeaders1, currentColWidths1, currentStartX1);
    }
  };
  
  drawTableHeaderRow(headers1, colWidths1, tableStartX1);
  
  let totalInterim = 0, totalMO = 0, totalMOAPP = 0, grandTotal = 0;
  
  recap.forEach((row) => {
    checkPageBreak1();
    const values = [
      row.codeAnalytique,
      row.libelle,
      formatNumberFR(row.heuresInterim),
      formatNumberFR(row.heuresMO),
      formatNumberFR(row.heuresMOAPP),
      formatNumberFR(row.total)
    ];
    drawTableDataRow(values, colWidths1, tableStartX1, false);
    
    totalInterim += row.heuresInterim;
    totalMO += row.heuresMO;
    totalMOAPP += row.heuresMOAPP;
    grandTotal += row.total;
  });
  
  checkPageBreak1();
  const totalValues1 = ["TOTAL", "", formatNumberFR(totalInterim), formatNumberFR(totalMO), formatNumberFR(totalMOAPP), formatNumberFR(grandTotal)];
  drawTableDataRow(totalValues1, colWidths1, tableStartX1, true);

  // ===== SECTION 2: Ventilation Ouvriers =====
  pdf.addPage();
  currentY = margin + headerHeight;
  
  drawPageHeader("VENTILATION ANALYTIQUE % par Ouvrier");
  
  const colWidths2 = [35, 35, 50, 22, 24, 24]; // 190mm pour portrait
  const headers2 = ["Nom salarie", "Prenom salarie", "Analytique", "Type MO", "Quantite", "Pourcentage"];
  const tableStartX2 = margin + (contentWidth - colWidths2.reduce((a, b) => a + b, 0)) / 2;
  
  currentHeaders1 = headers2;
  currentColWidths1 = colWidths2;
  currentStartX1 = tableStartX2;
  
  drawTableHeaderRow(headers2, colWidths2, tableStartX2);
  
  ouvrier.forEach((row) => {
    const isTotal = row.isTotal || false;
    const neededHeight = isTotal ? rowHeight + 2 : rowHeight;
    if (currentY + neededHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader(currentTitle);
      drawTableHeaderRow(headers2, colWidths2, tableStartX2);
    }
    
    // Conforme Excel : TOTAL = blanc avec "TOTAL" dans Type MO
    const values = isTotal
      ? ["", "", "", "TOTAL", formatNumberFR(row.quantite), "100,00 %"]
      : [row.nom, row.prenom, row.codeAnalytique, row.typeMO, formatNumberFR(row.quantite), formatPercentFR(row.pourcentage)];
    drawTableDataRow(values, colWidths2, tableStartX2, isTotal);
    
    if (isTotal) currentY += 2;
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE
  currentY += 2;
  const grandTotalOuvrier = ouvrier.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  
  [["TOTAL ETABLISSEMENT", grandTotalOuvrier], ["TOTAL SOCIETE", grandTotalOuvrier]].forEach(([label, total]) => {
    if (currentY + rowHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader(currentTitle);
      drawTableHeaderRow(headers2, colWidths2, tableStartX2);
    }
    drawTableDataRow([label as string, "", "", "", formatNumberFR(total as number), ""], colWidths2, tableStartX2, true);
  });

  // ===== SECTION 3: Ventilation Intérim =====
  pdf.addPage();
  currentY = margin + headerHeight;
  
  drawPageHeader("VENTILATION ANALYTIQUE % par Interimaire");
  
  const colWidths3 = [30, 30, 40, 45, 22, 23]; // 190mm pour portrait
  const headers3 = ["Nom salarie", "Prenom salarie", "Agence", "Analytique", "Quantite", "Pourcentage"];
  const tableStartX3 = margin + (contentWidth - colWidths3.reduce((a, b) => a + b, 0)) / 2;
  
  drawTableHeaderRow(headers3, colWidths3, tableStartX3);
  
  interim.forEach((row) => {
    const isTotal = row.isTotal || false;
    const neededHeight = isTotal ? rowHeight + 2 : rowHeight;
    if (currentY + neededHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader(currentTitle);
      drawTableHeaderRow(headers3, colWidths3, tableStartX3);
    }
    
    // Conforme Excel : TOTAL = blanc avec "TOTAL" dans Analytique
    const values = isTotal
      ? ["", "", "", "TOTAL", formatNumberFR(row.quantite), "100,00 %"]
      : [row.nom, row.prenom, row.agenceInterim || "", row.codeAnalytique, formatNumberFR(row.quantite), formatPercentFR(row.pourcentage)];
    drawTableDataRow(values, colWidths3, tableStartX3, isTotal);
    
    if (isTotal) currentY += 2;
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE
  currentY += 2;
  const grandTotalInterim = interim.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  
  [["TOTAL ETABLISSEMENT", grandTotalInterim], ["TOTAL SOCIETE", grandTotalInterim]].forEach(([label, total]) => {
    if (currentY + rowHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader(currentTitle);
      drawTableHeaderRow(headers3, colWidths3, tableStartX3);
    }
    drawTableDataRow([label as string, "", "", "", formatNumberFR(total as number), ""], colWidths3, tableStartX3, true);
  });
  
  // Pagination 2-pass : dessiner les footers sur toutes les pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawText(`Page ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { fontSize: 8, align: "right" });
  }

  const fileName = `Ventilation-Analytique-${periode}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};

// ============= EXPORTS PDF INDIVIDUELS =============

// Export PDF individuel - Récap Chantier (conforme Excel)
export const exportRecapChantierPdf = async (data: RecapChantierRow[], periode: string): Promise<string> => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 30;
  const contentWidth = pageWidth - 2 * margin;
  
  const entrepriseName = getEntrepriseName();
  const location = getEntrepriseLocation();
  const periodeDates = getPeriodeDates(periode);
  const generationDate = new Date();
  const dateStr = format(generationDate, "dd/MM/yyyy");
  
  let currentY = margin + headerHeight;

  const drawText = (text: string, x: number, y: number, options?: { 
    bold?: boolean; 
    align?: "left" | "center" | "right";
    fontSize?: number;
  }) => {
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setTextColor(0, 0, 0);
    
    if (options?.align === "center") {
      pdf.text(text, x, y, { align: "center" });
    } else if (options?.align === "right") {
      pdf.text(text, x, y, { align: "right" });
    } else {
      pdf.text(text, x, y);
    }
  };

  // En-tête conforme Excel
  drawText(entrepriseName, margin, 12, { bold: true, fontSize: 11 });
  drawText(`${location}, le ${dateStr}`, pageWidth - margin, 12, { fontSize: 10, align: "right" });
  drawText("RECAP HEURES par Chantier par type main d'oeuvre", pageWidth / 2, 20, { bold: true, fontSize: 12, align: "center" });
  drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 27, { fontSize: 10, align: "center" });

  // Table
  const colWidths = [35, 100, 30, 30, 30, 30];
  const headers = ["Code", "Libelle", "INTERIM", "MO", "MOAPP", "TOTAL"];
  const tableStartX = margin + (contentWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
  
  // En-tête colonnes (vert vif)
  let x = tableStartX;
  headers.forEach((header, i) => {
    pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(x, currentY, colWidths[i], 7, "FD");
    drawText(header, x + colWidths[i] / 2, currentY + 5, { bold: true, align: "center", fontSize: 8 });
    x += colWidths[i];
  });
  currentY += 7;
  
  let totalInterim = 0, totalMO = 0, totalMOAPP = 0, grandTotal = 0;
  
  data.forEach((row) => {
    x = tableStartX;
    const values = [row.codeAnalytique, row.libelle, row.heuresInterim.toFixed(2), row.heuresMO.toFixed(2), row.heuresMOAPP.toFixed(2), row.total.toFixed(2)];
    
    values.forEach((val, i) => {
      pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 6, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 6;
    
    totalInterim += row.heuresInterim;
    totalMO += row.heuresMO;
    totalMOAPP += row.heuresMOAPP;
    grandTotal += row.total;
  });
  
  // Ligne TOTAL (blanc, conforme Excel)
  x = tableStartX;
  const totalValues = ["TOTAL", "", formatNumberFR(totalInterim), formatNumberFR(totalMO), formatNumberFR(totalMOAPP), formatNumberFR(grandTotal)];
  totalValues.forEach((val, i) => {
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(x, currentY, colWidths[i], 6, "FD");
    drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    x += colWidths[i];
  });
  
  // Footer
  drawText("Page 1 de 1", pageWidth / 2, pageHeight - 5, { fontSize: 8, align: "center" });

  const fileName = `Ventil-Chantier-${periode}.pdf`;
  pdf.save(fileName);
  return fileName;
};

// Export PDF individuel - Ventilation Ouvriers (conforme Excel)
export const exportVentilationOuvrierPdf = async (data: VentilationEmployeeRow[], periode: string): Promise<string> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm en portrait
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm en portrait
  const margin = 10;
  const headerHeight = 32;
  const rowHeight = 6;
  const headerRowHeight = 7;
  const footerReserved = 20; // Augmenté pour éviter coupure bas de page
  const maxY = pageHeight - footerReserved;
  const contentWidth = pageWidth - 2 * margin;
  
  const entrepriseName = getEntrepriseName();
  const location = getEntrepriseLocation();
  const periodeDates = getPeriodeDates(periode);
  const dateStr = format(new Date(), "dd/MM/yyyy");
  
  let currentY = margin + headerHeight;

  const drawText = (text: string, x: number, y: number, options?: { 
    bold?: boolean; 
    align?: "left" | "center" | "right";
    fontSize?: number;
  }) => {
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setTextColor(0, 0, 0);
    
    if (options?.align === "center") {
      pdf.text(text, x, y, { align: "center" });
    } else if (options?.align === "right") {
      pdf.text(text, x, y, { align: "right" });
    } else {
      pdf.text(text, x, y);
    }
  };

  const drawPageHeader = () => {
    drawText(entrepriseName, margin, 12, { bold: true, fontSize: 11 });
    drawText(`${location}, le ${dateStr}`, pageWidth - margin, 12, { fontSize: 10, align: "right" });
    drawText("VENTILATION ANALYTIQUE % par Ouvrier", pageWidth / 2, 22, { bold: true, fontSize: 12, align: "center" });
    drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 29, { fontSize: 10, align: "center" });
  };

  // Colonnes ajustées pour portrait A4 (largeur 210mm - 20mm marges = 190mm)
  const colWidths = [35, 35, 50, 22, 24, 24]; // Total = 190mm
  const headers = ["Nom salarie", "Prenom salarie", "Analytique", "Type MO", "Quantite", "Pourcentage"];
  const tableStartX = margin + (contentWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
  
  const drawHeaderRow = () => {
    let x = tableStartX;
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], headerRowHeight, "FD");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(header, x + colWidths[i] / 2, currentY + 5, { align: "center" });
      x += colWidths[i];
    });
    pdf.setTextColor(0, 0, 0);
    currentY += headerRowHeight;
  };

  const checkPageBreak = (requiredHeight: number = rowHeight) => {
    if (currentY + requiredHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader();
      drawHeaderRow();
    }
  };

  // Dessiner première page
  drawPageHeader();
  drawHeaderRow();

  // Données - Structure EXACTE conforme Excel:
  // - En-tête vert répété AVANT chaque nouvel employé (comme l'original)
  // - Lignes données = jaune pâle (#FFFFD7) avec Nom, Prénom, Analytique, Type MO, Quantité, %
  // - Lignes TOTAL = blanc avec Nom/Prénom/Analytique vides, "TOTAL" dans Type MO
  let previousEmployeeKey = "";
  
  data.forEach((row) => {
    const isTotal = row.isTotal || false;
    const currentEmployeeKey = `${row.nom}-${row.prenom}`;
    const isNewEmployee = !isTotal && currentEmployeeKey !== previousEmployeeKey;
    
    // Répéter l'en-tête vert avant chaque nouvel employé (sauf le premier)
    if (isNewEmployee && previousEmployeeKey !== "") {
      checkPageBreak(headerRowHeight + rowHeight);
      drawHeaderRow();
    }
    
    const neededHeight = isTotal ? rowHeight + 2 : rowHeight;
    checkPageBreak(neededHeight);
    
    let x = tableStartX;
    
    // Conforme Excel : TOTAL = blanc avec "TOTAL" dans colonne Type MO (index 3)
    // Données = jaune pâle avec toutes les infos
    const values = isTotal
      ? ["", "", "", "TOTAL", formatNumberFR(row.quantite), "100,00 %"]
      : [row.nom, row.prenom, row.codeAnalytique, row.typeMO, formatNumberFR(row.quantite), formatPercentFR(row.pourcentage)];
    
    values.forEach((val, i) => {
      // Conforme Excel : données = jaune pâle, TOTAL = blanc
      if (isTotal) {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        pdf.setFillColor(COLORS.yellowPale.r, COLORS.yellowPale.g, COLORS.yellowPale.b);
      }
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], rowHeight, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: isTotal, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += rowHeight;
    
    // Mémoriser l'employé pour détecter le changement
    if (!isTotal) {
      previousEmployeeKey = currentEmployeeKey;
    }
    
    // Espacement visuel après chaque bloc employé (ligne TOTAL)
    if (isTotal) {
      currentY += 2;
    }
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE (blanc)
  // S'assurer qu'il y a assez d'espace pour les 2 lignes finales
  currentY += 4;
  checkPageBreak(rowHeight * 2 + 10);
  
  const grandTotal = data.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  
  [["TOTAL ETABLISSEMENT", grandTotal], ["TOTAL SOCIETE", grandTotal]].forEach(([label, total]) => {
    let x = tableStartX;
    // Fusion visuelle: dessiner cellules vides puis centrer le label sur les 4 premières colonnes
    const mergedWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    
    // Cellule fusionnée (blanc)
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(x, currentY, mergedWidth, rowHeight, "FD");
    drawText(label as string, x + mergedWidth / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    x += mergedWidth;
    
    // Colonne Quantité
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.rect(x, currentY, colWidths[4], rowHeight, "FD");
    drawText(formatNumberFR(total as number), x + colWidths[4] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    x += colWidths[4];
    
    // Colonne Pourcentage (vide)
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.rect(x, currentY, colWidths[5], rowHeight, "FD");
    drawText("", x + colWidths[5] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    
    currentY += rowHeight;
  });
  
  // Pagination 2-pass : dessiner les footers sur toutes les pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawText(`Page ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { fontSize: 8, align: "right" });
  }

  const fileName = `Ventil-Ouvriers-${periode}.pdf`;
  pdf.save(fileName);
  return fileName;
};

// Export PDF individuel - Ventilation Intérim (conforme Excel)
export const exportVentilationInterimPdf = async (data: VentilationEmployeeRow[], periode: string): Promise<string> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 32;
  const rowHeight = 6;
  const headerRowHeight = 7;
  const footerReserved = 20; // Augmenté pour éviter coupure bas de page
  const maxY = pageHeight - footerReserved;
  const contentWidth = pageWidth - 2 * margin;
  
  const entrepriseName = getEntrepriseName();
  const location = getEntrepriseLocation();
  const periodeDates = getPeriodeDates(periode);
  const dateStr = format(new Date(), "dd/MM/yyyy");
  
  let currentY = margin + headerHeight;

  const drawText = (text: string, x: number, y: number, options?: { 
    bold?: boolean; 
    align?: "left" | "center" | "right";
    fontSize?: number;
  }) => {
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setTextColor(0, 0, 0);
    
    if (options?.align === "center") {
      pdf.text(text, x, y, { align: "center" });
    } else if (options?.align === "right") {
      pdf.text(text, x, y, { align: "right" });
    } else {
      pdf.text(text, x, y);
    }
  };

  const drawPageHeader = () => {
    drawText(entrepriseName, margin, 12, { bold: true, fontSize: 11 });
    drawText(`${location}, le ${dateStr}`, pageWidth - margin, 12, { fontSize: 10, align: "right" });
    drawText("VENTILATION ANALYTIQUE % par Interimaire", pageWidth / 2, 22, { bold: true, fontSize: 12, align: "center" });
    drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 29, { fontSize: 10, align: "center" });
  };

  // Colonnes ajustées pour portrait A4 (190mm disponible)
  const colWidths = [30, 30, 40, 45, 22, 23]; // Total = 190mm
  const headers = ["Nom salarie", "Prenom salarie", "Agence", "Analytique", "Quantite", "Pourcentage"];
  const tableStartX = margin + (contentWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
  
  const drawHeaderRow = () => {
    let x = tableStartX;
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], headerRowHeight, "FD");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(header, x + colWidths[i] / 2, currentY + 5, { align: "center" });
      x += colWidths[i];
    });
    pdf.setTextColor(0, 0, 0);
    currentY += headerRowHeight;
  };

  const checkPageBreak = (requiredHeight: number = rowHeight) => {
    if (currentY + requiredHeight > maxY) {
      pdf.addPage();
      currentY = margin + headerHeight;
      drawPageHeader();
      drawHeaderRow();
    }
  };

  drawPageHeader();
  drawHeaderRow();

  // Données - Structure EXACTE conforme Excel:
  // - En-tête vert répété AVANT chaque nouvel employé
  // - Lignes données = jaune pâle (#FFFFD7)
  // - Lignes TOTAL = blanc avec "TOTAL" dans colonne Analytique (index 3)
  let previousEmployeeKey = "";
  
  data.forEach((row) => {
    const isTotal = row.isTotal || false;
    const currentEmployeeKey = `${row.nom}-${row.prenom}`;
    const isNewEmployee = !isTotal && currentEmployeeKey !== previousEmployeeKey;
    
    // Répéter l'en-tête vert avant chaque nouvel employé (sauf le premier)
    if (isNewEmployee && previousEmployeeKey !== "") {
      checkPageBreak(headerRowHeight + rowHeight);
      drawHeaderRow();
    }
    
    const neededHeight = isTotal ? rowHeight + 2 : rowHeight;
    checkPageBreak(neededHeight);
    
    let x = tableStartX;
    
    // Conforme Excel : TOTAL = blanc avec "TOTAL" dans colonne Analytique
    const values = isTotal
      ? ["", "", "", "TOTAL", formatNumberFR(row.quantite), "100,00 %"]
      : [row.nom, row.prenom, row.agenceInterim || "", row.codeAnalytique, formatNumberFR(row.quantite), formatPercentFR(row.pourcentage)];
    
    values.forEach((val, i) => {
      // Conforme Excel : données = jaune pâle, TOTAL = blanc
      if (isTotal) {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        pdf.setFillColor(COLORS.yellowPale.r, COLORS.yellowPale.g, COLORS.yellowPale.b);
      }
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], rowHeight, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: isTotal, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += rowHeight;
    
    // Mémoriser l'employé pour détecter le changement
    if (!isTotal) {
      previousEmployeeKey = currentEmployeeKey;
    }
    
    // Espacement visuel après chaque bloc employé
    if (isTotal) {
      currentY += 2;
    }
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE (blanc)
  // S'assurer qu'il y a assez d'espace pour les 2 lignes finales
  currentY += 4;
  checkPageBreak(rowHeight * 2 + 10);
  
  const grandTotal = data.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  
  [["TOTAL ETABLISSEMENT", grandTotal], ["TOTAL SOCIETE", grandTotal]].forEach(([label, total]) => {
    let x = tableStartX;
    // Fusion visuelle: dessiner cellules vides puis centrer le label sur les 4 premières colonnes
    const mergedWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    
    // Cellule fusionnée (blanc)
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(x, currentY, mergedWidth, rowHeight, "FD");
    drawText(label as string, x + mergedWidth / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    x += mergedWidth;
    
    // Colonne Quantité
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.rect(x, currentY, colWidths[4], rowHeight, "FD");
    drawText(formatNumberFR(total as number), x + colWidths[4] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    x += colWidths[4];
    
    // Colonne Pourcentage (vide)
    pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    pdf.rect(x, currentY, colWidths[5], rowHeight, "FD");
    drawText("", x + colWidths[5] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
    
    currentY += rowHeight;
  });
  
  // Pagination 2-pass : dessiner les footers sur toutes les pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawText(`Page ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { fontSize: 8, align: "right" });
  }

  const fileName = `Ventil-Interim-${periode}.pdf`;
  pdf.save(fileName);
  return fileName;
};
