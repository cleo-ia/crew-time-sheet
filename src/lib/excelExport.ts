import * as XLSX from "xlsx-js-style";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RHExportEmployee } from "@/hooks/useRHExport";

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  "CP": "CP",
  "RTT": "RTT",
  "AM": "AM",
  "MP": "MP",
  "AT": "AT",
  "CONGE_PARENTAL": "Congé parental",
  "HI": "Intempéries",
  "CPSS": "CPSS",
  "ABS_INJ": "ABS INJ",
};

// Schéma de couleurs pastel par groupe de colonnes
const COLOR_SCHEME = {
  // Données contractuelles (A-M)
  CONTRACTUAL_HEADER: "D3D3D3",     // Gris clair
  CONTRACTUAL_EVEN: "F5F5F5",       // Gris très clair
  CONTRACTUAL_ODD: "ECECEC",        // Gris clair alterné
  
  // Absences en heures (N-W)
  ABSENCES_HEADER: "FED8B1",        // Orange pêche pastel
  ABSENCES_EVEN: "FEF5E7",          // Orange très clair
  ABSENCES_ODD: "FDEBD0",           // Orange pêche très clair alterné
  
  // Heures supplémentaires (X-Y)
  OVERTIME_HEADER: "E8DAEF",        // Violet/lavande pastel
  OVERTIME_EVEN: "F4ECF7",          // Violet très clair
  OVERTIME_ODD: "EBDEF0",           // Violet clair alterné
  
  // Repas (Z)
  MEALS_HEADER: "D5F4E6",           // Vert menthe pastel
  MEALS_EVEN: "E8F8F5",             // Vert très clair
  MEALS_ODD: "D5F4E6",              // Vert menthe clair
  
  // Trajets (AA-AU)
  TRANSPORT_HEADER: "FCE4D6",       // Beige/crème pastel
  TRANSPORT_EVEN: "FEF9E7",         // Beige très clair
  TRANSPORT_ODD: "FCF3CF",          // Crème clair alterné
  
  // Colonnes administratives (AV+)
  ADMIN_HEADER: "E8F8F5",           // Bleu aqua très clair
  ADMIN_EVEN: "EBF5FB",             // Bleu très clair
  ADMIN_ODD: "D6EAF8",              // Bleu clair alterné
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
    emp.detailJours.forEach(jour => {
      if (jour.isAbsent && jour.typeAbsence) {
        const type = jour.typeAbsence;
        // Calculer les heures d'absence (7h par jour par défaut si pas d'heures normales)
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

/**
 * Génère et télécharge un fichier Excel avec les données RH
 */
export const generateRHExcel = (data: RHExportEmployee[], mois: string) => {
  // Créer un nouveau classeur
  const wb = XLSX.utils.book_new();

  // Préparer les données pour la feuille
  const worksheetData: any[][] = [];

  // En-tête du document (lignes 1-2)
  const [year, month] = mois.split("-").map(Number);
  const dateObj = new Date(year, month - 1);
  const moisFormate = format(dateObj, "MMMM yyyy", { locale: fr });

  // Ligne 1 : Dossier + DONNEES MDE
  const headerRow1 = Array(60).fill("");
  headerRow1[0] = "Dossier C093195 / LIMOGE REVILLON";
  headerRow1[14] = "DONNEES MDE";
  worksheetData.push(headerRow1);
  
  // Ligne 2 : vide
  worksheetData.push(Array(60).fill(""));

  // Ligne 3 : En-têtes principaux des groupes
  const headerRow3 = [
    "Matricule", "Nom", "Prénom", "Echelon", "Niveau", "Degré", "Statut", "Libéllé emploi",
    "Type\nde contrat", "Horaire\nmensuel", "Heures suppl\nmensualisées", "Forfait jours",
    "Salaire de base\ny compris heures structurelles",
    "ABSENCES EN HEURES", "", "", "", "", "", "", "", "", "",
    "HEURES SUPP", "",
    "REPAS",
    "TRAJETS", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "Acomptes et prêts", "", "", "", "",
    "SAISIES SUR SALAIRES", "", "", "", "", "",
    "REGULARISATION M-1",
    "Autres éléments"
  ];
  worksheetData.push(headerRow3);

  // Ligne 4 : Sous-en-têtes détaillés
  const headerRow4 = [
    "", "", "", "", "", "", "", "", "", "", "", "", "",
    "DATE", "CP", "RTT", "AM", "MP", "AT", "Congé parental", "Intempéries", "CPSS", "ABS INJ",
    "h supp à 25%", "h supp à 50%",
    "NB PANIERS",
    "TOTAL", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T31", "T35", "GD",
    "ACOMPTES", "", "PRETS", "", "COMMENTAIRES", "",
    "TOTAL SAISIE", "", "SAISIE DU MOIS", "", "COMMENTAIRES", "",
    "",
    ""
  ];
  worksheetData.push(headerRow4);

  // Lignes de données
  let totalHeuresNormales = 0;
  let totalHeuresSupp25 = 0;
  let totalHeuresSupp50 = 0;
  let totalPaniers = 0;
  let totalTrajets = 0;
  let totalAbsencesCP = 0;
  let totalAbsencesRTT = 0;
  let totalAbsencesAM = 0;
  let totalAbsencesMP = 0;
  let totalAbsencesAT = 0;
  let totalAbsencesCongeParental = 0;
  let totalAbsencesHI = 0;
  let totalAbsencesCPSS = 0;
  let totalAbsencesABSINJ = 0;

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
      // TRAJETS (pour l'instant, tout dans TOTAL et GD, le reste à 0)
      emp.indemnitesTrajet,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // T1-T17, T31, T35
      emp.indemnitesTrajet, // GD (total)
      // Colonnes administratives (vides pour l'instant)
      "", "", "", "", "", "",
      "", "", "", "", "", "",
      "",
      ""
    ];

    worksheetData.push(row);

    // Cumul des totaux
    totalHeuresNormales += emp.heuresNormales;
    totalHeuresSupp25 += heuresSupp25;
    totalHeuresSupp50 += heuresSupp50;
    totalPaniers += emp.indemnitesRepas;
    totalTrajets += emp.indemnitesTrajet;
    totalAbsencesCP += absences.CP;
    totalAbsencesRTT += absences.RTT;
    totalAbsencesAM += absences.AM;
    totalAbsencesMP += absences.MP;
    totalAbsencesAT += absences.AT;
    totalAbsencesCongeParental += absences.CONGE_PARENTAL;
    totalAbsencesHI += absences.HI;
    totalAbsencesCPSS += absences.CPSS;
    totalAbsencesABSINJ += absences.ABS_INJ;
  });

  // Ligne vide avant les totaux GD
  worksheetData.push(Array(60).fill(""));

  // Lignes de résumé GD (exemples, à adapter selon vos besoins)
  const gdRow20 = Array(60).fill("");
  gdRow20[40] = "20 GD";
  gdRow20[41] = totalTrajets * 0.5; // Exemple de calcul
  worksheetData.push(gdRow20);

  const gdRow23 = Array(60).fill("");
  gdRow23[40] = "23 GD";
  gdRow23[41] = totalTrajets * 0.5; // Exemple de calcul
  worksheetData.push(gdRow23);

  // Créer la feuille de calcul
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Définir les largeurs des colonnes
  const colWidths = [
    10, 15, 15, 8, 7, 7, 10, 15, 12, 10, 12, 10, 15, // A-M
    20, 6, 6, 6, 6, 6, 12, 10, 6, 6, // N-W (absences)
    10, 10, // X-Y (heures supp)
    10, // Z (paniers)
    8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, // AA-AU (trajets)
    10, 5, 10, 5, 15, 5, // AV-BA (acomptes et prêts)
    10, 5, 10, 5, 15, 5, // BB-BG (saisies)
    15, 15 // BH-BI (régularisation et autres)
  ];
  ws["!cols"] = colWidths.map(wch => ({ wch }));

  // Fusionner les cellules
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, // Dossier C093195 / LIMOGE REVILLON
    { s: { r: 0, c: 14 }, e: { r: 0, c: 60 } }, // DONNEES MDE
    // En-têtes de groupes (ligne 3)
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // Matricule
    { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // Nom
    { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // Prénom
    { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, // Echelon
    { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, // Niveau
    { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } }, // Degré
    { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } }, // Statut
    { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } }, // Libellé emploi
    { s: { r: 2, c: 8 }, e: { r: 3, c: 8 } }, // Type contrat
    { s: { r: 2, c: 9 }, e: { r: 3, c: 9 } }, // Horaire
    { s: { r: 2, c: 10 }, e: { r: 3, c: 10 } }, // Heures supp mens
    { s: { r: 2, c: 11 }, e: { r: 3, c: 11 } }, // Forfait jours
    { s: { r: 2, c: 12 }, e: { r: 3, c: 12 } }, // Salaire
    { s: { r: 2, c: 13 }, e: { r: 2, c: 22 } }, // ABSENCES EN HEURES
    { s: { r: 2, c: 23 }, e: { r: 2, c: 24 } }, // HEURES SUPP
    { s: { r: 2, c: 25 }, e: { r: 3, c: 25 } }, // REPAS
    { s: { r: 2, c: 26 }, e: { r: 2, c: 46 } }, // TRAJETS
    { s: { r: 2, c: 47 }, e: { r: 2, c: 52 } }, // Acomptes et prêts
    { s: { r: 2, c: 53 }, e: { r: 2, c: 58 } }, // SAISIES
    { s: { r: 2, c: 59 }, e: { r: 3, c: 59 } }, // REGULARISATION M-1
    { s: { r: 2, c: 60 }, e: { r: 3, c: 60 } }, // Autres éléments
  ];

  // Style pour l'en-tête principal (ligne 1)
  if (ws["A1"]) {
    ws["A1"].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "left", vertical: "center" },
      fill: { fgColor: { rgb: "FFFFFF" } },
    };
  }
  if (ws["O1"]) {
    ws["O1"].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "D3D3D3" } },
    };
  }

  // Style pour les en-têtes de colonnes (lignes 3-4)
  const headerStartRow = 2;
  const headerEndRow = 3;
  const totalCols = 61;

  for (let row = headerStartRow; row <= headerEndRow; row++) {
    for (let col = 0; col < totalCols; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      // Déterminer la couleur selon le groupe de colonnes
      let bgColor = "E0E0E0";
      if (col >= 0 && col <= 12) bgColor = COLOR_SCHEME.CONTRACTUAL_HEADER;
      else if (col >= 13 && col <= 22) bgColor = COLOR_SCHEME.ABSENCES_HEADER;
      else if (col >= 23 && col <= 24) bgColor = COLOR_SCHEME.OVERTIME_HEADER;
      else if (col === 25) bgColor = COLOR_SCHEME.MEALS_HEADER;
      else if (col >= 26 && col <= 46) bgColor = COLOR_SCHEME.TRANSPORT_HEADER;
      else if (col >= 47) bgColor = COLOR_SCHEME.ADMIN_HEADER;

      ws[cellAddress].s = {
        font: { bold: true, sz: 9, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };
    }
  }

  // Lignes de données (alternées)
  const dataStartRow = 4;
  const dataEndRow = 4 + data.length - 1;

  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const isEven = (row - dataStartRow) % 2 === 0;

    for (let col = 0; col < totalCols; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      // Déterminer la couleur selon le groupe de colonnes
      let bgColor = isEven ? "FFFFFF" : "F9F9F9";
      if (col >= 0 && col <= 12) {
        // Données contractuelles : légère teinte grise
        bgColor = isEven ? COLOR_SCHEME.CONTRACTUAL_EVEN : COLOR_SCHEME.CONTRACTUAL_ODD;
      } else if (col >= 13 && col <= 22) {
        // Absences : orange pêche très clair
        bgColor = isEven ? COLOR_SCHEME.ABSENCES_EVEN : COLOR_SCHEME.ABSENCES_ODD;
      } else if (col >= 23 && col <= 24) {
        // Heures supp : violet très clair
        bgColor = isEven ? COLOR_SCHEME.OVERTIME_EVEN : COLOR_SCHEME.OVERTIME_ODD;
      } else if (col === 25) {
        // Repas : vert très clair
        bgColor = isEven ? COLOR_SCHEME.MEALS_EVEN : COLOR_SCHEME.MEALS_ODD;
      } else if (col >= 26 && col <= 46) {
        // Trajets : beige très clair
        bgColor = isEven ? COLOR_SCHEME.TRANSPORT_EVEN : COLOR_SCHEME.TRANSPORT_ODD;
      } else if (col >= 47) {
        // Admin : bleu très clair
        bgColor = isEven ? COLOR_SCHEME.ADMIN_EVEN : COLOR_SCHEME.ADMIN_ODD;
      }

      ws[cellAddress].s = {
        fill: { fgColor: { rgb: bgColor } },
        border: {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "thin", color: { rgb: "D3D3D3" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } },
        },
        alignment: { vertical: "center", horizontal: col >= 13 ? "right" : "left" },
      };

      // Format numérique pour les colonnes numériques
      if (col === 12 || (col >= 14 && col <= 24) || col === 25 || (col >= 26 && col <= 46)) {
        if (col === 12) {
          ws[cellAddress].z = "#,##0.00";
        } else {
          ws[cellAddress].z = "0";
        }
      }
    }
  }

  // Hauteur des lignes
  ws["!rows"] = [
    { hpt: 20 }, // Ligne 1 (titre)
    { hpt: 10 }, // Ligne 2 (vide)
    { hpt: 30 }, // Ligne 3 (en-têtes principaux)
    { hpt: 30 }, // Ligne 4 (sous-en-têtes)
  ];

  // Hauteur standard pour les données
  for (let i = dataStartRow; i <= dataEndRow + 3; i++) {
    if (!ws["!rows"][i]) ws["!rows"][i] = { hpt: 18 };
  }

  // Figer les 3 premières colonnes (Matricule, Nom, Prénom) et les 4 premières lignes (en-têtes)
  ws["!freeze"] = { 
    xSplit: 3,  // Figer les 3 premières colonnes (A, B, C)
    ySplit: 4,  // Figer les 4 premières lignes (titre + vide + 2 lignes d'en-têtes)
    topLeftCell: "D5",  // La cellule en haut à gauche de la zone scrollable
    activePane: "bottomRight",
    state: "frozen"
  };

  // Ajouter la feuille au classeur
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse mensuelle");

  // Télécharger le fichier
  const fileName = `RH_Export_${mois.replace("-", "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
  XLSX.writeFile(wb, fileName);

  console.log(`✅ Export Excel généré: ${fileName}`);
  return fileName;
};
