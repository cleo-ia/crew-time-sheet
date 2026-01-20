import ExcelJS from "exceljs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RecapChantierRow, VentilationEmployeeRow } from "@/hooks/useVentilationAnalytique";

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

// Export complet (3 feuilles)
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
