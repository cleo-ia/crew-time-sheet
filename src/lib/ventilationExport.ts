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

// Nouvelles couleurs conformes aux tableaux Excel de référence
const COLORS = {
  green: { r: 0, g: 128, b: 0 },           // #008000 - En-têtes colonnes (vert vif)
  yellow: { r: 255, g: 255, b: 0 },         // #FFFF00 - Lignes TOTAL (jaune)
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
};

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

// Export complet PDF (3 sections) - Nouveau design conforme Excel
export const exportVentilationCompletePdf = async (
  recap: RecapChantierRow[],
  ouvrier: VentilationEmployeeRow[],
  interim: VentilationEmployeeRow[],
  periode: string
): Promise<string> => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const headerHeight = 30;
  const footerHeight = 10;
  const contentWidth = pageWidth - 2 * margin;
  
  const entrepriseName = getEntrepriseName();
  const location = getEntrepriseLocation();
  const periodeDates = getPeriodeDates(periode);
  const generationDate = new Date();
  const dateStr = format(generationDate, "dd/MM/yyyy");
  
  let currentY = margin + headerHeight;
  let pageNumber = 1;
  const totalPages = 3;

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
    // Nom entreprise à gauche
    drawText(entrepriseName, margin, 12, { bold: true, fontSize: 11 });
    
    // Lieu et date à droite
    drawText(`${location}, le ${dateStr}`, pageWidth - margin, 12, { fontSize: 10, align: "right" });
    
    // Titre centré
    drawText(title, pageWidth / 2, 20, { bold: true, fontSize: 12, align: "center" });
    
    // Sous-titre période
    drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 27, { fontSize: 10, align: "center" });
  };

  const drawPageFooter = () => {
    drawText(`Page ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 5, { fontSize: 8, align: "center" });
  };

  const drawTableHeaderRow = (headers: string[], colWidths: number[], startX: number) => {
    let x = startX;
    const rowHeight = 7;
    
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], rowHeight, "FD");
      drawText(header, x + colWidths[i] / 2, currentY + 5, { bold: true, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    
    currentY += rowHeight;
  };

  const drawTableDataRow = (values: string[], colWidths: number[], startX: number, isTotal: boolean) => {
    let x = startX;
    const rowHeight = 6;
    
    values.forEach((val, i) => {
      if (isTotal) {
        pdf.setFillColor(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b);
      } else {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
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
  
  const colWidths1 = [35, 100, 30, 30, 30, 30];
  const headers1 = ["Code", "Libelle", "INTERIM", "MO", "MOAPP", "TOTAL"];
  const tableStartX = margin + (contentWidth - colWidths1.reduce((a, b) => a + b, 0)) / 2;
  
  drawTableHeaderRow(headers1, colWidths1, tableStartX);
  
  let totalInterim = 0, totalMO = 0, totalMOAPP = 0, grandTotal = 0;
  
  recap.forEach((row) => {
    const values = [
      row.codeAnalytique,
      row.libelle,
      row.heuresInterim.toFixed(2),
      row.heuresMO.toFixed(2),
      row.heuresMOAPP.toFixed(2),
      row.total.toFixed(2)
    ];
    drawTableDataRow(values, colWidths1, tableStartX, false);
    
    totalInterim += row.heuresInterim;
    totalMO += row.heuresMO;
    totalMOAPP += row.heuresMOAPP;
    grandTotal += row.total;
  });
  
  // Ligne TOTAL
  const totalValues1 = ["TOTAL", "", totalInterim.toFixed(2), totalMO.toFixed(2), totalMOAPP.toFixed(2), grandTotal.toFixed(2)];
  drawTableDataRow(totalValues1, colWidths1, tableStartX, true);
  
  drawPageFooter();

  // ===== SECTION 2: Ventilation Ouvriers =====
  pdf.addPage();
  pageNumber = 2;
  currentY = margin + headerHeight;
  
  drawPageHeader("VENTILATION ANALYTIQUE % par Ouvrier");
  
  const colWidths2 = [45, 45, 55, 30, 30, 30];
  const headers2 = ["Nom salarie", "Prenom salarie", "Analytique", "Type MO", "Quantite", "Pourcentage"];
  const tableStartX2 = margin + (contentWidth - colWidths2.reduce((a, b) => a + b, 0)) / 2;
  
  // Grouper par employé
  let currentEmployee = "";
  let employeeTotal = 0;
  
  ouvrier.forEach((row, idx) => {
    const employeeKey = `${row.nom}-${row.prenom}`;
    
    // Nouvel employé = répéter l'en-tête
    if (employeeKey !== currentEmployee && !row.isTotal) {
      if (currentEmployee !== "") {
        currentY += 2; // Espacement entre employés
      }
      currentEmployee = employeeKey;
      drawTableHeaderRow(headers2, colWidths2, tableStartX2);
    }
    
    const values = [
      row.nom,
      row.prenom,
      row.codeAnalytique,
      row.typeMO,
      row.quantite.toFixed(2),
      row.isTotal ? "100 %" : `${row.pourcentage.toFixed(2)} %`
    ];
    drawTableDataRow(values, colWidths2, tableStartX2, row.isTotal || false);
    
    if (row.isTotal) {
      employeeTotal += row.quantite;
      currentEmployee = "";
    }
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE
  currentY += 4;
  const grandTotalOuvrier = ouvrier.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  drawTableDataRow(["TOTAL ETABLISSEMENT", "", "", "", grandTotalOuvrier.toFixed(2), "100 %"], colWidths2, tableStartX2, true);
  drawTableDataRow(["TOTAL SOCIETE", "", "", "", grandTotalOuvrier.toFixed(2), "100 %"], colWidths2, tableStartX2, true);
  
  drawPageFooter();

  // ===== SECTION 3: Ventilation Intérim =====
  pdf.addPage();
  pageNumber = 3;
  currentY = margin + headerHeight;
  
  drawPageHeader("VENTILATION ANALYTIQUE % par Interimaire");
  
  const colWidths3 = [40, 40, 45, 55, 30, 30];
  const headers3 = ["Nom salarie", "Prenom salarie", "Agence", "Analytique", "Quantite", "Pourcentage"];
  const tableStartX3 = margin + (contentWidth - colWidths3.reduce((a, b) => a + b, 0)) / 2;
  
  // Grouper par employé
  currentEmployee = "";
  
  interim.forEach((row) => {
    const employeeKey = `${row.nom}-${row.prenom}`;
    
    // Nouvel employé = répéter l'en-tête
    if (employeeKey !== currentEmployee && !row.isTotal) {
      if (currentEmployee !== "") {
        currentY += 2;
      }
      currentEmployee = employeeKey;
      drawTableHeaderRow(headers3, colWidths3, tableStartX3);
    }
    
    const values = [
      row.nom,
      row.prenom,
      row.agenceInterim || "",
      row.codeAnalytique,
      row.quantite.toFixed(2),
      row.isTotal ? "100 %" : `${row.pourcentage.toFixed(2)} %`
    ];
    drawTableDataRow(values, colWidths3, tableStartX3, row.isTotal || false);
    
    if (row.isTotal) {
      currentEmployee = "";
    }
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE
  currentY += 4;
  const grandTotalInterim = interim.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  drawTableDataRow(["TOTAL ETABLISSEMENT", "", "", "", grandTotalInterim.toFixed(2), "100 %"], colWidths3, tableStartX3, true);
  drawTableDataRow(["TOTAL SOCIETE", "", "", "", grandTotalInterim.toFixed(2), "100 %"], colWidths3, tableStartX3, true);
  
  drawPageFooter();

  // Générer le fichier
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
  
  // Ligne TOTAL (jaune)
  x = tableStartX;
  const totalValues = ["TOTAL", "", totalInterim.toFixed(2), totalMO.toFixed(2), totalMOAPP.toFixed(2), grandTotal.toFixed(2)];
  totalValues.forEach((val, i) => {
    pdf.setFillColor(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b);
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
  drawText("VENTILATION ANALYTIQUE % par Ouvrier", pageWidth / 2, 20, { bold: true, fontSize: 12, align: "center" });
  drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 27, { fontSize: 10, align: "center" });

  // Table
  const colWidths = [45, 45, 55, 30, 30, 30];
  const headers = ["Nom salarie", "Prenom salarie", "Analytique", "Type MO", "Quantite", "Pourcentage"];
  const tableStartX = margin + (contentWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
  
  const drawHeaderRow = () => {
    let x = tableStartX;
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 7, "FD");
      drawText(header, x + colWidths[i] / 2, currentY + 5, { bold: true, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 7;
  };

  // Grouper par employé avec en-têtes répétés
  let currentEmployee = "";
  
  data.forEach((row) => {
    const employeeKey = `${row.nom}-${row.prenom}`;
    
    if (employeeKey !== currentEmployee && !row.isTotal) {
      if (currentEmployee !== "") {
        currentY += 2;
      }
      currentEmployee = employeeKey;
      drawHeaderRow();
    }
    
    let x = tableStartX;
    const isTotal = row.isTotal || false;
    const values = [row.nom, row.prenom, row.codeAnalytique, row.typeMO, row.quantite.toFixed(2), isTotal ? "100 %" : `${row.pourcentage.toFixed(2)} %`];
    
    values.forEach((val, i) => {
      if (isTotal) {
        pdf.setFillColor(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b);
      } else {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      }
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 6, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: isTotal, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 6;
    
    if (isTotal) {
      currentEmployee = "";
    }
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE
  currentY += 4;
  const grandTotal = data.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  
  [["TOTAL ETABLISSEMENT", grandTotal], ["TOTAL SOCIETE", grandTotal]].forEach(([label, total]) => {
    let x = tableStartX;
    const values = [label as string, "", "", "", (total as number).toFixed(2), "100 %"];
    values.forEach((val, i) => {
      pdf.setFillColor(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 6, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 6;
  });
  
  // Footer
  drawText("Page 1 de 1", pageWidth / 2, pageHeight - 5, { fontSize: 8, align: "center" });

  const fileName = `Ventil-Ouvriers-${periode}.pdf`;
  pdf.save(fileName);
  return fileName;
};

// Export PDF individuel - Ventilation Intérim (conforme Excel)
export const exportVentilationInterimPdf = async (data: VentilationEmployeeRow[], periode: string): Promise<string> => {
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
  drawText("VENTILATION ANALYTIQUE % par Interimaire", pageWidth / 2, 20, { bold: true, fontSize: 12, align: "center" });
  drawText(`Periode du ${periodeDates.debut} au ${periodeDates.fin}`, pageWidth / 2, 27, { fontSize: 10, align: "center" });

  // Table
  const colWidths = [40, 40, 45, 55, 30, 30];
  const headers = ["Nom salarie", "Prenom salarie", "Agence", "Analytique", "Quantite", "Pourcentage"];
  const tableStartX = margin + (contentWidth - colWidths.reduce((a, b) => a + b, 0)) / 2;
  
  const drawHeaderRow = () => {
    let x = tableStartX;
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 7, "FD");
      drawText(header, x + colWidths[i] / 2, currentY + 5, { bold: true, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 7;
  };

  // Grouper par employé avec en-têtes répétés
  let currentEmployee = "";
  
  data.forEach((row) => {
    const employeeKey = `${row.nom}-${row.prenom}`;
    
    if (employeeKey !== currentEmployee && !row.isTotal) {
      if (currentEmployee !== "") {
        currentY += 2;
      }
      currentEmployee = employeeKey;
      drawHeaderRow();
    }
    
    let x = tableStartX;
    const isTotal = row.isTotal || false;
    const values = [row.nom, row.prenom, row.agenceInterim || "", row.codeAnalytique, row.quantite.toFixed(2), isTotal ? "100 %" : `${row.pourcentage.toFixed(2)} %`];
    
    values.forEach((val, i) => {
      if (isTotal) {
        pdf.setFillColor(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b);
      } else {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      }
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 6, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: isTotal, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 6;
    
    if (isTotal) {
      currentEmployee = "";
    }
  });
  
  // TOTAL ETABLISSEMENT et TOTAL SOCIETE
  currentY += 4;
  const grandTotal = data.filter(r => r.isTotal).reduce((sum, r) => sum + r.quantite, 0);
  
  [["TOTAL ETABLISSEMENT", grandTotal], ["TOTAL SOCIETE", grandTotal]].forEach(([label, total]) => {
    let x = tableStartX;
    const values = [label as string, "", "", "", (total as number).toFixed(2), "100 %"];
    values.forEach((val, i) => {
      pdf.setFillColor(COLORS.yellow.r, COLORS.yellow.g, COLORS.yellow.b);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, currentY, colWidths[i], 6, "FD");
      drawText(val, x + colWidths[i] / 2, currentY + 4.2, { bold: true, align: "center", fontSize: 8 });
      x += colWidths[i];
    });
    currentY += 6;
  });
  
  // Footer
  drawText("Page 1 de 1", pageWidth / 2, pageHeight - 5, { fontSize: 8, align: "center" });

  const fileName = `Ventil-Interim-${periode}.pdf`;
  pdf.save(fileName);
  return fileName;
};
