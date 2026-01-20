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

const COLORS = {
  darkGreen: { r: 46, g: 125, b: 50 },      // #2E7D32
  lightGreen: { r: 200, g: 230, b: 201 },   // #C8E6C9
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  gray: { r: 245, g: 245, b: 245 },
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

const getEntrepriseLogo = (): string => {
  const slug = localStorage.getItem("entreprise_slug");
  const logos: Record<string, string> = {
    "limoge-revillon": logoLimogeRevillon,
    "sder": logoSder,
    "engo-bourgogne": logoEngoBourgogne,
  };
  return logos[slug || ""] || logoLimogeRevillon;
};

// Export complet PDF (3 sections)
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
  const headerHeight = 25;
  const footerHeight = 12;
  const contentWidth = pageWidth - 2 * margin;
  
  const periodeLabel = formatPeriodeLabel(periode);
  const entrepriseName = getEntrepriseName();
  const entrepriseLogo = getEntrepriseLogo();
  const generationDate = new Date();
  
  let currentY = margin + headerHeight;
  let pageNumber = 1;
  let totalPages = 3; // On sait qu'on aura 3 sections

  const drawText = (text: string, x: number, y: number, options?: { 
    bold?: boolean; 
    white?: boolean; 
    align?: "left" | "center" | "right";
    fontSize?: number;
    color?: { r: number; g: number; b: number };
  }) => {
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    if (options?.color) {
      pdf.setTextColor(options.color.r, options.color.g, options.color.b);
    } else if (options?.white) {
      pdf.setTextColor(255, 255, 255);
    } else {
      pdf.setTextColor(0, 0, 0);
    }
    
    if (options?.align === "center") {
      pdf.text(text, x, y, { align: "center" });
    } else if (options?.align === "right") {
      pdf.text(text, x, y, { align: "right" });
    } else {
      pdf.text(text, x, y);
    }
  };

  const drawPageHeader = (sectionTitle: string) => {
    // Barre verte en haut
    pdf.setFillColor(COLORS.darkGreen.r, COLORS.darkGreen.g, COLORS.darkGreen.b);
    pdf.rect(0, 0, pageWidth, 5, "F");

    // Logo à gauche
    try {
      pdf.addImage(entrepriseLogo, "PNG", margin, 7, 25, 12);
    } catch (error) {
      console.error("Erreur lors du chargement du logo:", error);
    }

    // Nom entreprise au centre
    drawText(entrepriseName, pageWidth / 2, 15, { 
      bold: true, 
      fontSize: 14, 
      align: "center",
      color: COLORS.black
    });

    // Titre section à droite
    drawText("VENTILATION ANALYTIQUE", pageWidth - margin, 11, { 
      bold: true, 
      fontSize: 11, 
      align: "right" 
    });
    drawText(`${sectionTitle} - ${periodeLabel}`, pageWidth - margin, 17, { 
      fontSize: 9, 
      align: "right" 
    });

    // Ligne séparatrice verte
    pdf.setDrawColor(COLORS.darkGreen.r, COLORS.darkGreen.g, COLORS.darkGreen.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 22, pageWidth - margin, 22);
    pdf.setLineWidth(0.2);
  };

  const drawPageFooter = () => {
    const footerY = pageHeight - footerHeight + 3;
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 2, pageWidth - margin, footerY - 2);
    pdf.setLineWidth(0.2);

    drawText(entrepriseName, margin, footerY + 4, { fontSize: 8 });

    const dateStr = format(generationDate, "dd/MM/yyyy");
    const timeStr = format(generationDate, "HH:mm");
    drawText(`Document généré le ${dateStr} à ${timeStr}`, pageWidth / 2, footerY + 4, { 
      fontSize: 8, 
      align: "center" 
    });

    drawText(`Page ${pageNumber}/${totalPages}`, pageWidth - margin, footerY + 4, { 
      fontSize: 8, 
      align: "right" 
    });
  };

  const drawTableHeader = (headers: string[], colWidths: number[], startX: number) => {
    let x = startX;
    const rowHeight = 8;
    
    headers.forEach((header, i) => {
      pdf.setFillColor(COLORS.darkGreen.r, COLORS.darkGreen.g, COLORS.darkGreen.b);
      pdf.rect(x, currentY, colWidths[i], rowHeight, "FD");
      drawText(header, x + colWidths[i] / 2, currentY + 5.5, { bold: true, white: true, align: "center" });
      x += colWidths[i];
    });
    
    currentY += rowHeight;
  };

  const drawTableRow = (values: string[], colWidths: number[], startX: number, isTotal: boolean, isAlternate: boolean) => {
    let x = startX;
    const rowHeight = 6;
    
    values.forEach((val, i) => {
      if (isTotal) {
        pdf.setFillColor(COLORS.lightGreen.r, COLORS.lightGreen.g, COLORS.lightGreen.b);
      } else if (isAlternate) {
        pdf.setFillColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      } else {
        pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      }
      pdf.rect(x, currentY, colWidths[i], rowHeight, "FD");
      
      const align = i === 1 ? "left" : "center";
      const textX = i === 1 ? x + 2 : x + colWidths[i] / 2;
      drawText(val, textX, currentY + 4.2, { bold: isTotal, align, fontSize: 8 });
      x += colWidths[i];
    });
    
    currentY += rowHeight;
  };

  // ===== SECTION 1: Ventilation par Chantier =====
  drawPageHeader("Ventil. Chantier");
  
  const colWidths1 = [35, 100, 30, 30, 30, 30];
  const headers1 = ["Code analytique", "Libellé", "INTERIM", "MO", "MOAPP", "TOTAL"];
  const tableStartX = margin + (contentWidth - colWidths1.reduce((a, b) => a + b, 0)) / 2;
  
  drawTableHeader(headers1, colWidths1, tableStartX);
  
  let totalInterim = 0, totalMO = 0, totalMOAPP = 0, grandTotal = 0;
  
  recap.forEach((row, idx) => {
    const values = [
      row.codeAnalytique,
      row.libelle,
      row.heuresInterim.toString(),
      row.heuresMO.toString(),
      row.heuresMOAPP.toString(),
      row.total.toString()
    ];
    drawTableRow(values, colWidths1, tableStartX, false, idx % 2 === 1);
    
    totalInterim += row.heuresInterim;
    totalMO += row.heuresMO;
    totalMOAPP += row.heuresMOAPP;
    grandTotal += row.total;
  });
  
  // Total row
  const totalValues1 = ["TOTAL", "", totalInterim.toString(), totalMO.toString(), totalMOAPP.toString(), grandTotal.toString()];
  drawTableRow(totalValues1, colWidths1, tableStartX, true, false);
  
  drawPageFooter();

  // ===== SECTION 2: Ventilation Ouvriers =====
  pdf.addPage();
  pageNumber = 2;
  currentY = margin + headerHeight;
  
  drawPageHeader("Ventil. Ouvriers");
  
  const colWidths2 = [50, 50, 60, 30, 30, 30];
  const headers2 = ["Nom", "Prénom", "Code analytique", "Type MO", "Quantité", "%"];
  const tableStartX2 = margin + (contentWidth - colWidths2.reduce((a, b) => a + b, 0)) / 2;
  
  drawTableHeader(headers2, colWidths2, tableStartX2);
  
  ouvrier.forEach((row, idx) => {
    const values = [
      row.nom,
      row.prenom,
      row.codeAnalytique,
      row.typeMO,
      row.quantite.toString(),
      row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`
    ];
    drawTableRow(values, colWidths2, tableStartX2, row.isTotal || false, idx % 2 === 1);
  });
  
  drawPageFooter();

  // ===== SECTION 3: Ventilation Intérim =====
  pdf.addPage();
  pageNumber = 3;
  currentY = margin + headerHeight;
  
  drawPageHeader("Ventil. Intérim");
  
  const colWidths3 = [45, 45, 50, 55, 30, 30];
  const headers3 = ["Nom", "Prénom", "Agence", "Code analytique", "Quantité", "%"];
  const tableStartX3 = margin + (contentWidth - colWidths3.reduce((a, b) => a + b, 0)) / 2;
  
  drawTableHeader(headers3, colWidths3, tableStartX3);
  
  interim.forEach((row, idx) => {
    const values = [
      row.nom,
      row.prenom,
      row.agenceInterim || "",
      row.codeAnalytique,
      row.quantite.toString(),
      row.isTotal ? "100%" : `${row.pourcentage.toFixed(2)}%`
    ];
    drawTableRow(values, colWidths3, tableStartX3, row.isTotal || false, idx % 2 === 1);
  });
  
  drawPageFooter();

  // Générer le fichier
  const fileName = `Ventilation-Analytique-${periode}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};
