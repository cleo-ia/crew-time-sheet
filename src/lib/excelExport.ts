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
  ECOLE: "ECO",
  EF: "EF",
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
    ECOLE: 0,
    EF: 0,
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
        absences.HI += 8; // 1 jour absence intempérie = 8h
        if (!dateRanges.HI) dateRanges.HI = [];
        dateRanges.HI.push(jour.date);
      }
      
      // Autres types d'absences (CP, RTT, AM, MP, AT, etc.)
      if (jour.isAbsent && jour.typeAbsence && jour.typeAbsence !== "HI") {
        const type = jour.typeAbsence;
        const heuresAbsence = 7; // Convention : 1 jour absence = 7h
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

// Options pour l'export Excel (entreprise dynamique)
export interface ExcelExportOptions {
  entrepriseNom?: string;
  dossierRef?: string;
}

export const generateRHExcel = async (
  data: RHExportEmployee[], 
  mois: string, 
  filePrefix?: string,
  options?: ExcelExportOptions
): Promise<string> => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Synthèse mensuelle", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 4, topLeftCell: "D5" }],
  });

  const totalCols = 60; // +base_horaire

  // En-tête du document (lignes 1-2)
  const [year, month] = mois.split("-").map(Number);
  const dateObj = new Date(year, month - 1);

  // Nom de l'entreprise dynamique
  const entrepriseNom = options?.entrepriseNom || 'LIMOGE REVILLON';
  const dossierRef = options?.dossierRef || 'C093195';

  // Ligne 1 : Dossier + DONNEES MDE
  const headerRow1 = Array(totalCols).fill("");
  headerRow1[0] = `Dossier ${dossierRef} / ${entrepriseNom}`;
  headerRow1[14] = "DONNEES MDE";
  sheet.addRow(headerRow1);

  // Ligne 2 : vide
  sheet.addRow(Array(totalCols).fill(""));

  // Ligne 3 : En-têtes principaux des groupes
  // Structure des colonnes :
  // 1-15 : Données contractuelles (15 colonnes)
  // 16-27 : ABSENCES EN HEURES (12 colonnes : DATE, CP, RTT, AM, MP, AT, Congé parental, Intempéries, CPSS, ABS INJ, ECOLE, EF)
  // 28-29 : HEURES SUPP (2 colonnes : 25%, 50%)
  // 30 : REPAS (1 colonne : NB PANIERS)
  // 31-52 : TRAJETS (22 colonnes : TOTAL, T Perso, T1-T17, T31, T35, GD)
  // 53-55 : Acomptes et prêts (3 colonnes)
  // 56-58 : SAISIES (3 colonnes)
  // 59-60 : Régularisation et Autres éléments
  const headerRow3 = [
    "Matricule",           // 1
    "Nom",                 // 2
    "Prénom",              // 3
    "Echelon",             // 4
    "Niveau",              // 5
    "Degré",               // 6
    "Statut",              // 7
    "Libéllé emploi",      // 8
    "Type\nde contrat",    // 9
    "Base\nhoraire",       // 10
    "Horaire\nmensuel",    // 11
    "Heures suppl\nmensualisées", // 12
    "Forfait jours",       // 13
    "Heures réelles\neffectuées", // 14
    "Salaire de base\ny compris heures structurelles", // 15
    "ABSENCES EN HEURES",  // 16 (groupe fusionné 16-27)
    "", "", "", "", "", "", "", "", "", "", "", // 17-27 (11 vides pour compléter les 12 colonnes absences)
    "HEURES SUPP",         // 28 (groupe fusionné 28-29)
    "",                    // 29
    "REPAS",               // 30
    "TRAJETS",             // 31 (groupe fusionné 31-52)
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", // 32-52 (21 vides)
    "Acomptes et prêts",   // 53 (groupe fusionné 53-55)
    "", "",                // 54-55
    "SAISIES SUR SALAIRES", // 56 (groupe fusionné 56-58)
    "", "",                // 57-58
    "Regularisation M-1",  // 59
    "Autres éléments",     // 60
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
    "ECOLE",
    "EF",
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
    // 🆕 Utilisation des heures supp calculées automatiquement
    const heuresSupp25 = emp.heuresSupp25;
    const heuresSupp50 = emp.heuresSupp50;

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
      emp.base_horaire || "-",
      emp.horaire,
      emp.heures_supp_mensualisees || "-",
      emp.forfait_jours ? "Oui" : "-",
      emp.heuresNormales, // NOUVELLE COLONNE: Heures réelles effectuées
      emp.salaire,
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
      absences.ECOLE || 0,
      absences.EF || 0,
      // HEURES SUPP
      heuresSupp25,
      heuresSupp50,
      // REPAS
      emp.indemnitesRepas,
      // TRAJETS (TOTAL + T Perso + T1-T19,T31,T35 + GD)
      emp.indemnitesTrajet + emp.indemnitesTrajetPerso, // TOTAL
      emp.trajetTPerso || 0, // T Perso
      emp.trajetT1 || 0,     // T1
      emp.trajetT2 || 0,     // T2
      emp.trajetT3 || 0,     // T3
      emp.trajetT4 || 0,     // T4
      emp.trajetT5 || 0,     // T5
      emp.trajetT6 || 0,     // T6
      emp.trajetT7 || 0,     // T7
      emp.trajetT8 || 0,     // T8
      emp.trajetT9 || 0,     // T9
      emp.trajetT10 || 0,    // T10
      emp.trajetT11 || 0,    // T11
      emp.trajetT12 || 0,    // T12
      emp.trajetT13 || 0,    // T13
      emp.trajetT14 || 0,    // T14
      emp.trajetT15 || 0,    // T15
      emp.trajetT16 || 0,    // T16
      emp.trajetT17 || 0,    // T17
      emp.trajetT31 || 0,    // T31
      emp.trajetT35 || 0,    // T35
      emp.trajetGD || 0,     // GD
      // Colonnes administratives depuis le pré-export
      emp.acomptes || "", // ACOMPTES
      emp.prets || "", // PRETS
      emp.commentaire_rh || "", // COMMENTAIRES RH
      emp.totalSaisie || "", // TOTAL SAISIE
      emp.saisieDuMois || "", // SAISIE DU MOIS
      emp.commentaireSaisie || "", // COMMENTAIRES SAISIE
      emp.regularisationM1 || "", // Regularisation M-1 (mensuel)
      emp.autresElements || "", // Autres éléments (mensuel)
    ];

    // Garantir la longueur exacte
    while (row.length < totalCols) row.push("");
    sheet.addRow(row);

    totalTrajets += emp.indemnitesTrajet || 0;
  });


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
    8, // Base horaire
    10,
    12,
    10,
    12, // A-N (ajout base_horaire + heures réelles)
    15, // O (salaire)
    20,
    6,
    6,
    6,
    6,
    6,
    12,
    10,
    6,
    6,
    6, // O-Y (absences avec ECOLE)
    10,
    10, // Z-AA (heures supp)
    10, // AB (paniers)
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
    6, // AB-AW (trajets)
    10,
    10,
    15, // AX-AZ (acomptes et prêts)
    10,
    10,
    15, // BA-BC (saisies)
    15,
    25, // BD-BE (régularisation et autres)
  ];
  sheet.columns = colWidths.map((w) => ({ width: w }));

  // Merges
  // Ligne 1
  sheet.mergeCells(`A1:${colToLetter(14)}1`); // A1:N1
  sheet.mergeCells(`${colToLetter(15)}1:${colToLetter(57)}1`); // O1:BE1

  // Lignes 3-4: colonnes individuelles
  // Colonnes individuelles (fusionnées verticalement lignes 3-4)
  const singles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 30, 59, 60];
  singles.forEach((c) => sheet.mergeCells(3, c, 4, c));

  // Groupes (fusionnés horizontalement sur ligne 3)
  sheet.mergeCells(3, 16, 3, 27); // ABSENCES EN HEURES (12 colonnes : 16-27)
  sheet.mergeCells(3, 28, 3, 29); // HEURES SUPP (2 colonnes : 28-29)
  sheet.mergeCells(3, 31, 3, 52); // TRAJETS (22 colonnes : 31-52)
  sheet.mergeCells(3, 53, 3, 55); // Acomptes et prêts (3 colonnes : 53-55)
  sheet.mergeCells(3, 56, 3, 58); // SAISIES (3 colonnes : 56-58)
  
  // Forcer explicitement les valeurs des cellules après les merges
  sheet.getCell(`${colToLetter(16)}3`).value = "ABSENCES EN HEURES";
  sheet.getCell(`${colToLetter(28)}3`).value = "HEURES SUPP";
  sheet.getCell(`${colToLetter(31)}3`).value = "TRAJETS";
  sheet.getCell(`${colToLetter(53)}3`).value = "ACOMPTES ET PRÊTS";
  sheet.getCell(`${colToLetter(56)}3`).value = "SAISIES SUR SALAIRES";
  sheet.getCell(`${colToLetter(59)}3`).value = "Regularisation M-1";
  sheet.getCell(`${colToLetter(60)}3`).value = "Autres éléments";

  // Hauteurs de lignes
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 10;
  sheet.getRow(3).height = 30;
  sheet.getRow(4).height = 30;

  // Styles en-têtes
  // Structure des colonnes :
  // 1-15 : Données contractuelles | 16-27 : Absences | 28-29 : H.Supp | 30 : Repas | 31-52 : Trajets | 53-55 : Acomptes | 56-58 : Saisies | 59-60 : Autres
  const headerRows = [3, 4];
  headerRows.forEach((rIdx) => {
    const row = sheet.getRow(rIdx);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      // Couleur par groupe (indices corrigés)
      let bg = "E0E0E0";
      if (c >= 1 && c <= 15) bg = COLOR_SCHEME.CONTRACTUAL_HEADER;
      else if (c >= 16 && c <= 27) bg = COLOR_SCHEME.ABSENCES_HEADER; // 12 colonnes absences
      else if (c >= 28 && c <= 29) bg = COLOR_SCHEME.OVERTIME_HEADER; // 2 colonnes h.supp
      else if (c === 30) bg = COLOR_SCHEME.MEALS_HEADER; // 1 colonne repas
      else if (c >= 31 && c <= 52) bg = COLOR_SCHEME.TRANSPORT_HEADER; // 22 colonnes trajets
      else if (c >= 53 && c <= 55) bg = "A9D08E"; // Vert pour Acomptes et prêts
      else if (c >= 56 && c <= 58) bg = "000000"; // Noir pour SAISIES SUR SALAIRES
      else if (c === 59) bg = "C9A0DC"; // Violet pour REGULARISATION M-1
      else if (c === 60) bg = "E8DAEF"; // Mauve clair pour Autres éléments

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
      // Colonnes alignées avec les en-têtes (indices corrigés)
      if (c >= 1 && c <= 15) bg = isEven ? COLOR_SCHEME.CONTRACTUAL_EVEN : COLOR_SCHEME.CONTRACTUAL_ODD;
      else if (c >= 16 && c <= 27) bg = isEven ? COLOR_SCHEME.ABSENCES_EVEN : COLOR_SCHEME.ABSENCES_ODD; // 12 colonnes absences
      else if (c >= 28 && c <= 29) bg = isEven ? COLOR_SCHEME.OVERTIME_EVEN : COLOR_SCHEME.OVERTIME_ODD; // 2 colonnes h.supp
      else if (c === 30) bg = isEven ? COLOR_SCHEME.MEALS_EVEN : COLOR_SCHEME.MEALS_ODD; // 1 colonne repas
      else if (c >= 31 && c <= 52) bg = isEven ? COLOR_SCHEME.TRANSPORT_EVEN : COLOR_SCHEME.TRANSPORT_ODD; // 22 colonnes trajets
      else if (c >= 53 && c <= 55) bg = isEven ? "E2EFDA" : "D9E7CB"; // Vert clair pour Acomptes et prêts
      else if (c >= 56 && c <= 58) bg = isEven ? "D9D9D9" : "BFBFBF"; // Gris pour SAISIES SUR SALAIRES
      else if (c === 59) bg = isEven ? "E4DAEC" : "D5C4DF"; // Violet clair pour REGULARISATION M-1
      else if (c === 60) bg = isEven ? "F4ECF7" : "E8DAEF"; // Mauve très clair pour Autres éléments

      const cell = sheet.getRow(r).getCell(c);
      const align: "left" | "right" = c >= 16 ? "right" : "left";
      setDataFill(cell, bg, align);

      // Formats
      if (c === 14) {
        cell.numFmt = "0"; // Heures réelles (nombre entier)
      } else if (c === 15) {
        cell.numFmt = "#,##0.00"; // Salaire
      } else if ((c >= 17 && c <= 27) || (c >= 28 && c <= 29) || (c >= 30 && c <= 52)) {
        cell.numFmt = "0"; // Nombres entiers (absences, h.supp, repas, trajets)
      }
    }
  }

  // Déclencher le téléchargement
  const prefix = filePrefix || "RH_Export";
  const fileName = `${prefix}_${mois.replace("-", "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
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
