import ExcelJS from "exceljs";
import { RHExportEmployee } from "@/hooks/useRHExport";
import { format, parseISO, startOfWeek, addDays, getISOWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface WeekData {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  days: {
    date: string;
    dayLabel: string;
    chantierCode: string;
    heures: number;
    panier: boolean;
    trajet: boolean;
    intemperie: number;
  }[];
}

/**
 * Groupe les jours d'un employé par semaine (lundi-vendredi)
 */
const groupByWeek = (detailJours: RHExportEmployee["detailJours"]): WeekData[] => {
  if (!detailJours || detailJours.length === 0) return [];

  const weeksMap = new Map<string, WeekData>();

  for (const jour of detailJours) {
    const date = parseISO(jour.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lundi
    const weekKey = format(weekStart, "yyyy-'W'II");
    const weekNumber = getISOWeek(date);
    const year = date.getFullYear();

    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, {
        weekNumber,
        year,
        startDate: weekStart,
        endDate: addDays(weekStart, 4), // Vendredi
        days: [],
      });
    }

    weeksMap.get(weekKey)!.days.push({
      date: jour.date,
      dayLabel: format(date, "dd/MM"),
      chantierCode: jour.chantierCode || "",
      heures: jour.heures,
      panier: jour.panier,
      trajet: !!jour.trajet || jour.trajetPerso,
      intemperie: jour.intemperie,
    });
  }

  // Trier par date
  return Array.from(weeksMap.values()).sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
};

/**
 * Récupère le nom de l'entreprise depuis localStorage ou config
 */
const getEntrepriseName = (): string => {
  const slug = localStorage.getItem("entreprise_slug");
  const names: Record<string, string> = {
    "limoge-revillon": "Limoge Revillon",
    "sder": "SDER",
    "engo-bourgogne": "Engo Bourgogne",
  };
  return names[slug || ""] || "Entreprise";
};

/**
 * Génère un fichier Excel simplifié pour agence d'intérim
 * Format: fiche de pointage hebdomadaire par intérimaire
 */
export const generateInterimaireSimplifiedExcel = async (
  employees: RHExportEmployee[],
  mois: string,
  agenceName: string,
  semaine?: string
): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pointage");

  // Styles
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" }, // Vert foncé
  };

  const lightGreenFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC8E6C9" }, // Vert clair
  };

  const yellowFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF9C4" }, // Jaune clair
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  // Largeur des colonnes
  worksheet.columns = [
    { width: 12 }, // Label (Code, HNORM, PA, T)
    { width: 10 }, // Jour 1
    { width: 10 }, // Jour 2
    { width: 10 }, // Jour 3
    { width: 10 }, // Jour 4
    { width: 10 }, // Jour 5
    { width: 10 }, // Total
  ];

  let currentRow = 1;
  const entrepriseName = getEntrepriseName();

  // Grouper les employés par semaine pour déterminer les périodes
  const allWeeks = new Set<string>();
  employees.forEach((emp) => {
    const weeks = groupByWeek(emp.detailJours);
    weeks.forEach((w) => allWeeks.add(`${w.year}-W${w.weekNumber}`));
  });

  // Pour chaque semaine, créer un bloc
  const sortedWeeks = Array.from(allWeeks).sort();

  for (const weekKey of sortedWeeks) {
    // Trouver les données de cette semaine
    const weekEmployees = employees
      .map((emp) => {
        const weeks = groupByWeek(emp.detailJours);
        const weekData = weeks.find(
          (w) => `${w.year}-W${w.weekNumber}` === weekKey
        );
        return weekData ? { employee: emp, weekData } : null;
      })
      .filter(Boolean) as { employee: RHExportEmployee; weekData: WeekData }[];

    if (weekEmployees.length === 0) continue;

    const firstWeekData = weekEmployees[0].weekData;
    const periodeStart = format(firstWeekData.startDate, "dd/MM/yyyy");
    const periodeEnd = format(firstWeekData.endDate, "dd/MM/yyyy");
    const weekLabel = `S${firstWeekData.weekNumber}`;

    // === EN-TÊTE DE SEMAINE ===
    // Ligne 1: Nom entreprise + Période
    const headerRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    headerRow.getCell(1).value = entrepriseName;
    headerRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.getCell(1).fill = headerFill;
    headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    headerRow.getCell(1).border = borderStyle;

    worksheet.mergeCells(currentRow, 4, currentRow, 7);
    headerRow.getCell(4).value = `${weekLabel} — Période du ${periodeStart} au ${periodeEnd}`;
    headerRow.getCell(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.getCell(4).fill = headerFill;
    headerRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    headerRow.getCell(4).border = borderStyle;
    currentRow++;

    // Ligne 2: Signature + Cachet
    const signatureRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    signatureRow.getCell(1).value = "Signature du responsable";
    signatureRow.getCell(1).font = { italic: true };
    signatureRow.getCell(1).fill = lightGreenFill;
    signatureRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    signatureRow.getCell(1).border = borderStyle;

    worksheet.mergeCells(currentRow, 4, currentRow, 7);
    signatureRow.getCell(4).value = "Cachet du client";
    signatureRow.getCell(4).font = { italic: true };
    signatureRow.getCell(4).fill = lightGreenFill;
    signatureRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    signatureRow.getCell(4).border = borderStyle;
    currentRow++;

    // Ligne 3: Zones vides pour signatures
    const emptySignRow = worksheet.getRow(currentRow);
    emptySignRow.height = 40;
    worksheet.mergeCells(currentRow, 1, currentRow, 3);
    emptySignRow.getCell(1).border = borderStyle;
    worksheet.mergeCells(currentRow, 4, currentRow, 7);
    emptySignRow.getCell(4).border = borderStyle;
    currentRow++;

    // Ligne 4: Légende
    const legendRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    legendRow.getCell(1).value =
      "HNORM = heure normale   HI = intempérie   T = trajet   PA = panier";
    legendRow.getCell(1).font = { size: 9, italic: true };
    legendRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    legendRow.getCell(1).fill = yellowFill;
    legendRow.getCell(1).border = borderStyle;
    currentRow++;

    // Ligne vide
    currentRow++;

    // === BLOC PAR EMPLOYÉ ===
    for (const { employee, weekData } of weekEmployees) {
      // Préparer les 5 jours (Lundi-Vendredi)
      const daysData: {
        label: string;
        code: string;
        heures: number;
        panier: number;
        trajet: number;
        intemperie: number;
      }[] = [];

      for (let i = 0; i < 5; i++) {
        const dayDate = addDays(weekData.startDate, i);
        const dayStr = format(dayDate, "yyyy-MM-dd");
        const dayInfo = weekData.days.find((d) => d.date === dayStr);

        daysData.push({
          label: format(dayDate, "dd/MM"),
          code: dayInfo?.chantierCode || "",
          heures: dayInfo?.heures || 0,
          panier: dayInfo?.panier ? 1 : 0,
          trajet: dayInfo?.trajet ? 1 : 0,
          intemperie: dayInfo?.intemperie || 0,
        });
      }

      // Totaux
      const totalHeures = daysData.reduce((sum, d) => sum + d.heures, 0);
      const totalPanier = daysData.reduce((sum, d) => sum + d.panier, 0);
      const totalTrajet = daysData.reduce((sum, d) => sum + d.trajet, 0);
      const totalIntemperie = daysData.reduce((sum, d) => sum + d.intemperie, 0);

      // Ligne titre employé
      const empTitleRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(currentRow, 1, currentRow, 7);
      const matriculeInfo = employee.matricule ? ` (${employee.matricule})` : "";
      empTitleRow.getCell(1).value = `${employee.nom.toUpperCase()} ${employee.prenom}${matriculeInfo} — ${agenceName}`;
      empTitleRow.getCell(1).font = { bold: true };
      empTitleRow.getCell(1).fill = headerFill;
      empTitleRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      empTitleRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      empTitleRow.getCell(1).border = borderStyle;
      currentRow++;

      // Ligne en-tête jours
      const daysHeaderRow = worksheet.getRow(currentRow);
      daysHeaderRow.getCell(1).value = "";
      daysHeaderRow.getCell(1).fill = lightGreenFill;
      daysHeaderRow.getCell(1).border = borderStyle;
      for (let i = 0; i < 5; i++) {
        daysHeaderRow.getCell(i + 2).value = daysData[i].label;
        daysHeaderRow.getCell(i + 2).font = { bold: true };
        daysHeaderRow.getCell(i + 2).fill = lightGreenFill;
        daysHeaderRow.getCell(i + 2).alignment = { horizontal: "center" };
        daysHeaderRow.getCell(i + 2).border = borderStyle;
      }
      daysHeaderRow.getCell(7).value = "Total";
      daysHeaderRow.getCell(7).font = { bold: true };
      daysHeaderRow.getCell(7).fill = lightGreenFill;
      daysHeaderRow.getCell(7).alignment = { horizontal: "center" };
      daysHeaderRow.getCell(7).border = borderStyle;
      currentRow++;

      // Ligne Code chantier
      const codeRow = worksheet.getRow(currentRow);
      codeRow.getCell(1).value = "Code";
      codeRow.getCell(1).font = { bold: true };
      codeRow.getCell(1).fill = yellowFill;
      codeRow.getCell(1).border = borderStyle;
      for (let i = 0; i < 5; i++) {
        codeRow.getCell(i + 2).value = daysData[i].code;
        codeRow.getCell(i + 2).alignment = { horizontal: "center" };
        codeRow.getCell(i + 2).border = borderStyle;
      }
      codeRow.getCell(7).value = "";
      codeRow.getCell(7).border = borderStyle;
      currentRow++;

      // Ligne HNORM
      const hnormRow = worksheet.getRow(currentRow);
      hnormRow.getCell(1).value = "HNORM";
      hnormRow.getCell(1).font = { bold: true };
      hnormRow.getCell(1).fill = yellowFill;
      hnormRow.getCell(1).border = borderStyle;
      for (let i = 0; i < 5; i++) {
        hnormRow.getCell(i + 2).value = daysData[i].heures > 0 ? daysData[i].heures.toFixed(2).replace(".", ",") : "";
        hnormRow.getCell(i + 2).alignment = { horizontal: "center" };
        hnormRow.getCell(i + 2).border = borderStyle;
      }
      hnormRow.getCell(7).value = totalHeures > 0 ? totalHeures.toFixed(2).replace(".", ",") : "";
      hnormRow.getCell(7).font = { bold: true };
      hnormRow.getCell(7).alignment = { horizontal: "center" };
      hnormRow.getCell(7).border = borderStyle;
      currentRow++;

      // Ligne HI (intempéries) - seulement si il y a des intempéries
      if (totalIntemperie > 0) {
        const hiRow = worksheet.getRow(currentRow);
        hiRow.getCell(1).value = "HI";
        hiRow.getCell(1).font = { bold: true };
        hiRow.getCell(1).fill = yellowFill;
        hiRow.getCell(1).border = borderStyle;
        for (let i = 0; i < 5; i++) {
          hiRow.getCell(i + 2).value = daysData[i].intemperie > 0 ? daysData[i].intemperie.toFixed(2).replace(".", ",") : "";
          hiRow.getCell(i + 2).alignment = { horizontal: "center" };
          hiRow.getCell(i + 2).border = borderStyle;
        }
        hiRow.getCell(7).value = totalIntemperie > 0 ? totalIntemperie.toFixed(2).replace(".", ",") : "";
        hiRow.getCell(7).font = { bold: true };
        hiRow.getCell(7).alignment = { horizontal: "center" };
        hiRow.getCell(7).border = borderStyle;
        currentRow++;
      }

      // Ligne PA
      const paRow = worksheet.getRow(currentRow);
      paRow.getCell(1).value = "PA";
      paRow.getCell(1).font = { bold: true };
      paRow.getCell(1).fill = yellowFill;
      paRow.getCell(1).border = borderStyle;
      for (let i = 0; i < 5; i++) {
        paRow.getCell(i + 2).value = daysData[i].panier > 0 ? daysData[i].panier.toFixed(2).replace(".", ",") : "";
        paRow.getCell(i + 2).alignment = { horizontal: "center" };
        paRow.getCell(i + 2).border = borderStyle;
      }
      paRow.getCell(7).value = totalPanier > 0 ? totalPanier.toFixed(2).replace(".", ",") : "";
      paRow.getCell(7).font = { bold: true };
      paRow.getCell(7).alignment = { horizontal: "center" };
      paRow.getCell(7).border = borderStyle;
      currentRow++;

      // Ligne T
      const tRow = worksheet.getRow(currentRow);
      tRow.getCell(1).value = "T";
      tRow.getCell(1).font = { bold: true };
      tRow.getCell(1).fill = yellowFill;
      tRow.getCell(1).border = borderStyle;
      for (let i = 0; i < 5; i++) {
        tRow.getCell(i + 2).value = daysData[i].trajet > 0 ? daysData[i].trajet.toFixed(2).replace(".", ",") : "";
        tRow.getCell(i + 2).alignment = { horizontal: "center" };
        tRow.getCell(i + 2).border = borderStyle;
      }
      tRow.getCell(7).value = totalTrajet > 0 ? totalTrajet.toFixed(2).replace(".", ",") : "";
      tRow.getCell(7).font = { bold: true };
      tRow.getCell(7).alignment = { horizontal: "center" };
      tRow.getCell(7).border = borderStyle;
      currentRow++;

      // Espacement entre employés
      currentRow++;
    }

    // Espacement entre semaines
    currentRow += 2;
  }

  // Générer le fichier
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Nom du fichier (inclut la semaine si spécifiée)
  const fileName = semaine 
    ? `Pointage-${agenceName.replace(/\s+/g, "-")}-${semaine}.xlsx`
    : `Pointage-${agenceName.replace(/\s+/g, "-")}-${mois}.xlsx`;

  // Télécharger
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
};
