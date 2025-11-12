import { Workbook } from "exceljs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RHExportEmployee } from "@/hooks/useRHExport";

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  CP: "CP",
  RTT: "RTT",
  AM: "AM",
  MP: "MP",
  AT: "AT",
  CONGE_PARENTAL: "Congé parental",
  HI: "Intempéries",
  CPSS: "CPSS",
  ABS_INJ: "ABS INJ",
};

// Schéma de couleurs pastel par groupe de colonnes
const COLOR_SCHEME = {
  // Données contractuelles (A-M)
  CONTRACTUAL_HEADER: "D3D3D3", // Gris clair
  CONTRACTUAL_EVEN: "F5F5F5", // Gris très clair
  CONTRACTUAL_ODD: "ECECEC", // Gris clair alterné

  // Absences en heures (N-W)
  ABSENCES_HEADER: "FED8B1", // Orange pêche pastel
  ABSENCES_EVEN: "FEF5E7", // Orange très clair
  ABSENCES_ODD: "FDEBD0", // Orange pêche très clair alterné

  // Heures supplémentaires (X-Y)
  OVERTIME_HEADER: "E8DAEF", // Violet/lavande pastel
  OVERTIME_EVEN: "F4ECF7", // Violet très clair
  OVERTIME_ODD: "EBDEF0", // Violet clair alterné

  // Repas (Z)
  MEALS_HEADER: "D5F4E6", // Vert menthe pastel
  MEALS_EVEN: "E8F8F5", // Vert très clair
  MEALS_ODD: "D5F4E6", // Vert menthe clair

  // Trajets (AA-AU)
  TRANSPORT_HEADER: "FCE4D6", // Beige/crème pastel
  TRANSPORT_EVEN: "FEF9E7", // Beige très clair
  TRANSPORT_ODD: "FCF3CF", // Crème clair alterné

  // Colonnes administratives (AV+)
  ADMIN_HEADER: "E8F8F5", // Bleu aqua très clair
  ADMIN_EVEN: "EBF5FB", // Bleu très clair
  ADMIN_ODD: "D6EAF8", // Bleu clair alterné
};

/**
 * Calcule les heures d'absence en fonction du jour de la semaine
 * @param dateString Date au format ISO (YYYY-MM-DD)
 * @returns 7h si vendredi, 8h pour les autres jours de semaine
 */
const getAbsenceHoursByDay = (dateString: string): number => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0=Dimanche, 1=Lundi, ..., 5=Vendredi, 6=Samedi
  
  // Vendredi = 7h, tous les autres jours = 8h
  return dayOfWeek === 5 ? 7 : 8;
};

/**
 * Calcule les heures d'absence par type pour un employé
 */
const calculateAbsencesByType = (emp: RHExportEmployee) => {
  const absences: Record<string, number> = {
    CP: 0,
    RTT: 0,
    AM: 0,
    MP: 0,
    AT: 0,
    CONGE_PARENTAL: 0,
    HI: 0,
    CPSS: 0,
    ABS_INJ: 0,
  };

  const dateRanges: Record<string, string[]> = {};

  if (emp.detailJours) {
    emp.detailJours.forEach((jour) => {
      // PRIORITÉ 1 : Heures d'intempéries numériques (valeurs réelles saisies par le chef)
      if (jour.intemperie > 0) {
        absences.HI += jour.intemperie;
      }
      
      // PRIORITÉ 2 : Absence de type "HI" (uniquement si pas d'intemperie numérique pour éviter double comptage)
      if (jour.isAbsent && jour.typeAbsence === "HI" && !jour.intemperie) {
        absences.HI += getAbsenceHoursByDay(jour.date);
        if (!dateRanges.HI) dateRanges.HI = [];
        dateRanges.HI.push(jour.date);
      }
      
      // Autres types d'absences (CP, RTT, AM, MP, AT, etc.)
      if (jour.isAbsent && jour.typeAbsence && jour.typeAbsence !== "HI") {
        const type = jour.typeAbsence;
        const heuresAbsence = getAbsenceHoursByDay(jour.date);
        absences[type] = (absences[type] || 0) + heuresAbsence;

        // Collecter les dates pour afficher les plages
        if (!dateRanges[type]) dateRanges[type] = [];
        dateRanges[type].push(jour.date);
      }
    });
  }

  // Générer le texte DATE (ex: "AM du 20 au 24/10/25")
  let dateText = "";
  Object.entries(dateRanges).forEach(([type, dates]) => {
    if (dates.length > 0) {
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      if (dates.length === 1) {
        dateText += `${ABSENCE_TYPE_LABELS[type]} le ${format(new Date(firstDate), "dd/MM/yy", { locale: fr })} `;
      } else {
        dateText += `${ABSENCE_TYPE_LABELS[type]} du ${format(new Date(firstDate), "dd/MM/yy", { locale: fr })} au ${format(new Date(lastDate), "dd/MM/yy", { locale: fr })} `;
      }
    }
  });

  return { absences, dateText: dateText.trim() };
};

const colToLetter = (col: number) => {
  let temp = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    n = Math.floor((n - 1) / 26);
  }
  return temp;
};

const applyBorder = (cell: any) => {
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
};

const setHeaderFill = (cell: any, rgb: string) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${rgb}` },
  };
  // Couleur du texte blanc pour les fonds sombres (noir)
  const textColor = rgb === "000000" ? "FFFFFFFF" : "FF000000";
  cell.font = { bold: true, size: 9, color: { argb: textColor } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  applyBorder(cell);
};

const setDataFill = (cell: any, rgb: string, align: "left" | "right") => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${rgb}` },
  };
  cell.alignment = { vertical: "middle", horizontal: align };
  cell.font = { size: 10 };
  cell.border = {
    top: { style: "thin", color: { argb: "FFD3D3D3" } },
    bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
    left: { style: "thin", color: { argb: "FFD3D3D3" } },
    right: { style: "thin", color: { argb: "FFD3D3D3" } },
  };
};

export const generateRHExcel = async (data: RHExportEmployee[], mois: string): Promise<string> => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Synthèse mensuelle", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 4, topLeftCell: "D5" }],
  });

  const totalCols = 57;

  // En-tête du document (lignes 1-2)
  const [year, month] = mois.split("-").map(Number);
  const dateObj = new Date(year, month - 1);

  // Ligne 1 : Dossier + DONNEES MDE
  const headerRow1 = Array(totalCols).fill("");
  headerRow1[0] = "Dossier C093195 / LIMOGE REVILLON";
  headerRow1[14] = "DONNEES MDE";
  sheet.addRow(headerRow1);

  // Ligne 2 : vide
  sheet.addRow(Array(totalCols).fill(""));

  // Ligne 3 : En-têtes principaux des groupes
  const headerRow3 = [
    "Matricule",
    "Nom",
    "Prénom",
    "Echelon",
    "Niveau",
    "Degré",
    "Statut",
    "Libéllé emploi",
    "Type\nde contrat",
    "Horaire\nmensuel",
    "Heures suppl\nmensualisées",
    "Forfait jours",
    "Salaire de base\ny compris heures structurelles",
    "Heures réelles\neffectuées",
    "ABSENCES EN HEURES",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "HEURES SUPP",
    "",
    "REPAS",
    "TRAJETS",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Acomptes et prêts",
    "",
    "",
    "SAISIES SUR SALAIRES",
    "",
    "",
    "REGULARISATION M-1",
    "Autres éléments",
  ];
  sheet.addRow(headerRow3);

  // Ligne 4 : Sous-en-têtes détaillés
  const headerRow4 = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "DATE",
    "CP",
    "RTT",
    "AM",
    "MP",
    "AT",
    "Congé parental",
    "Intempéries",
    "CPSS",
    "ABS INJ",
    "h supp à 25%",
    "h supp à 50%",
    "NB PANIERS",
    "TOTAL",
    "T Perso",
    "T1",
    "T2",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9",
    "T10",
    "T11",
    "T12",
    "T13",
    "T14",
    "T15",
    "T16",
    "T17",
    "T31",
    "T35",
    "GD",
    "ACOMPTES",
    "PRETS",
    "COMMENTAIRES",
    "TOTAL SAISIE",
    "SAISIE DU MOIS",
    "COMMENTAIRES",
    "",
    "",
  ];
  sheet.addRow(headerRow4);

  // Données
  let totalTrajets = 0;

  data.forEach((emp) => {
    const { absences, dateText } = calculateAbsencesByType(emp);
    // Pour l'instant, on met toutes les heures supp dans la colonne 25%
    const heuresSupp25 = emp.heuresSupp;
    const heuresSupp50 = 0;

    const row = [
      emp.matricule,
      emp.nom,
      emp.prenom,
      emp.echelon,
      emp.niveau,
      emp.degre,
      emp.statut,
      emp.libelle_emploi,
      emp.type_contrat,
      emp.horaire,
      emp.heures_supp_mensualisees || "-",
      emp.forfait_jours ? "Oui" : "-",
      emp.salaire,
      emp.heuresNormales,
      // ABSENCES EN HEURES
      dateText || "",
      absences.CP || 0,
      absences.RTT || 0,
      absences.AM || 0,
      absences.MP || 0,
      absences.AT || 0,
      absences.CONGE_PARENTAL || 0,
      absences.HI || 0,
      absences.CPSS || 0,
      absences.ABS_INJ || 0,
      // HEURES SUPP
      heuresSupp25,
      heuresSupp50,
      // REPAS
      emp.indemnitesRepas,
      // TRAJETS (TOTAL + T Perso + T1-T19,T31,T35 + GD)
      emp.indemnitesTrajet + emp.indemnitesTrajetPerso, // TOTAL
      emp.indemnitesTrajetPerso, // T Perso
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      emp.indemnitesTrajet + emp.indemnitesTrajetPerso, // GD (total)
      // Colonnes administratives (vides pour l'instant)
      "", // ACOMPTES
      "", // PRETS
      "", // COMMENTAIRES
      "", // TOTAL SAISIE
      "", // SAISIE DU MOIS
      "", // COMMENTAIRES
      // Concaténer les notes de régularisation M-1 de tous les jours
      emp.detailJours
        ?.map(j => j.regularisationM1)
        .filter(Boolean)
        .join(" | ") || "",
      // Concaténer les autres éléments de tous les jours
      emp.detailJours
        ?.map(j => j.autresElements)
        .filter(Boolean)
        .join(" | ") || "",
    ];

    // Garantir la longueur exacte
    while (row.length < totalCols) row.push("");
    sheet.addRow(row);

    totalTrajets += emp.indemnitesTrajet || 0;
  });

  // Ligne vide avant les totaux GD
  sheet.addRow(Array(totalCols).fill(""));

  // Lignes de résumé GD (structure uniquement)
  const gdRow20 = Array(totalCols).fill("");
  gdRow20[47] = "20 GD"; // Colonne 48 (GD)
  sheet.addRow(gdRow20);

  const gdRow23 = Array(totalCols).fill("");
  gdRow23[47] = "23 GD"; // Colonne 48 (GD)
  sheet.addRow(gdRow23);

  // Largeurs de colonnes
  const colWidths = [
    10,
    15,
    15,
    8,
    7,
    7,
    10,
    15,
    12,
    10,
    12,
    10,
    15, // A-M
    10, // N (Heures réelles effectuées)
    20,
    6,
    6,
    6,
    6,
    6,
    12,
    10,
    6,
    6, // N-W (absences)
    10,
    10, // X-Y (heures supp)
    10, // Z (paniers)
    8,
    8,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6, // AA-AV (trajets)
    10,
    10,
    15, // AV-AX (acomptes et prêts)
    10,
    10,
    15, // AY-BA (saisies)
    15,
    15,
    15, // BB-BC (régularisation et autres)
  ];
  sheet.columns = colWidths.map((w) => ({ width: w }));

  // Merges
  // Ligne 1
  sheet.mergeCells(`A1:${colToLetter(14)}1`); // A1:N1
  sheet.mergeCells(`${colToLetter(15)}1:${colToLetter(57)}1`); // O1:BE1

  // Lignes 3-4: colonnes individuelles
  const singles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 27, 56, 57];
  singles.forEach((c) => sheet.mergeCells(3, c, 4, c));

  // Groupes
  sheet.mergeCells(3, 15, 3, 24); // ABSENCES EN HEURES (O3:X3)
  sheet.mergeCells(3, 25, 3, 26); // HEURES SUPP (Y3:Z3)
  sheet.mergeCells(3, 28, 3, 49); // TRAJETS (AB3:AW3)
  sheet.mergeCells(3, 50, 3, 52); // Acomptes et prêts (AX3:AZ3)
  sheet.mergeCells(3, 53, 3, 55); // SAISIES (BA3:BC3)

  // Hauteurs de lignes
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 10;
  sheet.getRow(3).height = 30;
  sheet.getRow(4).height = 30;

  // Styles en-têtes
  const headerRows = [3, 4];
  headerRows.forEach((rIdx) => {
    const row = sheet.getRow(rIdx);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      // Couleur par groupe
      let bg = "E0E0E0";
      if (c >= 1 && c <= 13) bg = COLOR_SCHEME.CONTRACTUAL_HEADER;
      else if (c === 14) bg = COLOR_SCHEME.CONTRACTUAL_HEADER;
      else if (c >= 15 && c <= 24) bg = COLOR_SCHEME.ABSENCES_HEADER;
      else if (c >= 25 && c <= 26) bg = COLOR_SCHEME.OVERTIME_HEADER;
      else if (c === 27) bg = COLOR_SCHEME.MEALS_HEADER;
      else if (c >= 28 && c <= 49) bg = COLOR_SCHEME.TRANSPORT_HEADER;
      else if (c >= 50 && c <= 52) bg = "A9D08E"; // Vert pour Acomptes et prêts
      else if (c >= 53 && c <= 55) bg = "000000"; // Noir pour SAISIES SUR SALAIRES
      else if (c === 56) bg = "C9A0DC"; // Violet pour REGULARISATION M-1
      else if (c === 57) bg = "E8DAEF"; // Mauve clair pour Autres éléments

      setHeaderFill(cell, bg);
    }
  });

  // Styles ligne 1
  const r1 = sheet.getRow(1);
  const cA1 = r1.getCell(1);
  cA1.font = { bold: true, size: 12 };
  cA1.alignment = { vertical: "middle", horizontal: "left" };
  const cO1 = r1.getCell(15);
  cO1.font = { bold: true, size: 12 };
  cO1.alignment = { vertical: "middle", horizontal: "center" };
  cO1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };

  // Styles des données (alternées + groupes)
  const dataStartRow = 5;
  const dataEndRow = sheet.lastRow?.number ?? dataStartRow - 1;

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const isEven = (r - dataStartRow) % 2 === 0;

    for (let c = 1; c <= totalCols; c++) {
      let bg = isEven ? "FFFFFF" : "F9F9F9";
      if (c >= 1 && c <= 13) bg = isEven ? COLOR_SCHEME.CONTRACTUAL_EVEN : COLOR_SCHEME.CONTRACTUAL_ODD;
      else if (c === 14) bg = isEven ? COLOR_SCHEME.CONTRACTUAL_EVEN : COLOR_SCHEME.CONTRACTUAL_ODD;
      else if (c >= 15 && c <= 24) bg = isEven ? COLOR_SCHEME.ABSENCES_EVEN : COLOR_SCHEME.ABSENCES_ODD;
      else if (c >= 25 && c <= 26) bg = isEven ? COLOR_SCHEME.OVERTIME_EVEN : COLOR_SCHEME.OVERTIME_ODD;
      else if (c === 27) bg = isEven ? COLOR_SCHEME.MEALS_EVEN : COLOR_SCHEME.MEALS_ODD;
      else if (c >= 28 && c <= 49) bg = isEven ? COLOR_SCHEME.TRANSPORT_EVEN : COLOR_SCHEME.TRANSPORT_ODD;
      else if (c >= 50 && c <= 52) bg = isEven ? "E2EFDA" : "D9E7CB"; // Vert clair pour Acomptes et prêts
      else if (c >= 53 && c <= 55) bg = isEven ? "D9D9D9" : "BFBFBF"; // Gris pour SAISIES SUR SALAIRES
      else if (c === 56) bg = isEven ? "E4DAEC" : "D5C4DF"; // Violet clair pour REGULARISATION M-1
      else if (c === 57) bg = isEven ? "F4ECF7" : "E8DAEF"; // Mauve très clair pour Autres éléments

      const cell = sheet.getRow(r).getCell(c);
      const align: "left" | "right" = c >= 14 ? "right" : "left";
      setDataFill(cell, bg, align);

      // Formats
      if (c === 13) {
        cell.numFmt = "#,##0.00"; // Salaire
      } else if (c === 14 || (c >= 16 && c <= 26) || c === 27 || (c >= 28 && c <= 49)) {
        cell.numFmt = "0"; // Nombres entiers
      }
    }
  }

  // Déclencher le téléchargement
  const fileName = `RH_Export_${mois.replace("-", "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  console.log(`✅ Export Excel généré: ${fileName}`);
  return fileName;
};
