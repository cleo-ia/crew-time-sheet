import * as XLSX from "xlsx-js-style";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RHExportEmployee } from "@/hooks/useRHExport";

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  "CP": "Congés payés (CP)",
  "RTT": "RTT",
  "AM": "Absence maladie (AM)",
  "MP": "Maladie professionnelle (MP)",
  "AT": "Accident du travail (AT)",
  "CONGE_PARENTAL": "Congé parental",
  "HI": "Intempéries (HI)",
  "CPSS": "CPSS",
  "ABS_INJ": "Absence injustifiée (ABS INJ)",
};

/**
 * Retourne le libellé des types d'absence pour un employé
 * - Si plusieurs types différents, retourne "Multiple"
 * - Si un seul type, retourne son libellé complet
 * - Si HI > 0 mais pas de type qualifié, retourne "Intempéries (HI)" par défaut
 */
const getAbsenceTypeLabel = (emp: RHExportEmployee): string => {
  if (!emp.detailJours || emp.detailJours.length === 0) {
    return emp.intemperies > 0 ? "Intempéries (HI)" : "-";
  }

  // Collecter tous les types d'absence uniques (jours avec intemperies > 0)
  const typesUniques = new Set<string>();
  emp.detailJours.forEach(jour => {
    if (jour.intemperie > 0 && jour.typeAbsence) {
      typesUniques.add(jour.typeAbsence);
    }
  });

  if (typesUniques.size === 0) {
    // Pas de type qualifié mais des intempéries
    return emp.intemperies > 0 ? "Intempéries (HI)" : "-";
  } else if (typesUniques.size === 1) {
    // Un seul type d'absence
    const type = Array.from(typesUniques)[0];
    return ABSENCE_TYPE_LABELS[type] || type;
  } else {
    // Plusieurs types différents
    return "Multiple";
  }
};

/**
 * Génère et télécharge un fichier Excel avec les données RH
 */
export const generateRHExcel = (data: RHExportEmployee[], mois: string) => {
  // Créer un nouveau classeur
  const wb = XLSX.utils.book_new();

  // Préparer les données pour la feuille
  const worksheetData: any[][] = [];

  // En-tête du document (lignes 1-3)
  const [year, month] = mois.split("-").map(Number);
  const dateObj = new Date(year, month - 1);
  const moisFormate = format(dateObj, "MMMM yyyy", { locale: fr });

  worksheetData.push(["EXPORT RH - DONNÉES POUR PAIE"]);
  worksheetData.push([`Période : ${moisFormate.charAt(0).toUpperCase() + moisFormate.slice(1)}`]);
  worksheetData.push([`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`]);
  worksheetData.push([]); // Ligne vide

  // En-têtes des colonnes (ligne 5)
  worksheetData.push([
    "Matricule",
    "Nom",
    "Prénom",
    "Libellé emploi",
    "Échelon",
    "Niveau",
    "Degré",
    "Statut",
    "Type contrat",
    "Horaire",
    "H supp mensualisées",
    "Forfait jours",
    "Salaire de base",
    "Heures normales",
    "Heures supp.",
    "Absences (jours)",
    "Indemnités repas",
    "Indemnités trajet",
    "Indemnités trajet perso",
    "Prime ancienneté",
    "Type d'absence",
    "Total heures",
    "Statut fiche",
  ]);

  // Lignes de données
  let totalHeuresNormales = 0;
  let totalHeuresSupp = 0;
  let totalAbsences = 0;
  let totalRepas = 0;
  let totalTrajet = 0;
  let totalTrajetPerso = 0;
  let totalPrime = 0;
  let totalIntemperies = 0;
  let totalHeures = 0;

  data.forEach((emp) => {
    worksheetData.push([
      emp.matricule,
      emp.nom,
      emp.prenom,
      emp.libelle_emploi,
      emp.echelon,
      emp.niveau,
      emp.degre,
      emp.statut,
      emp.type_contrat,
      emp.horaire,
      emp.heures_supp_mensualisees,
      emp.forfait_jours ? "Oui" : "Non",
      emp.salaire,
      emp.heuresNormales,
      emp.heuresSupp,
      emp.absences,
      emp.indemnitesRepas,
      emp.indemnitesTrajet,
      emp.indemnitesTrajetPerso,
      emp.primeAnciennete,
      getAbsenceTypeLabel(emp), // Type d'absence qualifié ou par défaut
      emp.totalHeures,
      emp.statut_fiche,
    ]);

    // Cumul des totaux
    totalHeuresNormales += emp.heuresNormales;
    totalHeuresSupp += emp.heuresSupp;
    totalAbsences += emp.absences;
    totalRepas += emp.indemnitesRepas;
    totalTrajet += emp.indemnitesTrajet;
    totalTrajetPerso += emp.indemnitesTrajetPerso;
    totalPrime += emp.primeAnciennete;
    totalIntemperies += emp.intemperies;
    totalHeures += emp.totalHeures;
  });

  // Ligne de totaux
  worksheetData.push([
    "TOTAL",
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
    Math.round(totalHeuresNormales * 100) / 100,
    Math.round(totalHeuresSupp * 100) / 100,
    totalAbsences,
    totalRepas,
    Math.round(totalTrajet * 100) / 100,
    totalTrajetPerso,
    totalPrime,
    totalIntemperies,
    Math.round(totalHeures * 100) / 100,
    "",
  ]);

  // Créer la feuille de calcul
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Définir les largeurs des colonnes
  ws["!cols"] = [
    { wch: 12 }, // Matricule
    { wch: 20 }, // Nom
    { wch: 20 }, // Prénom
    { wch: 15 }, // Libellé emploi
    { wch: 10 }, // Échelon
    { wch: 10 }, // Niveau
    { wch: 10 }, // Degré
    { wch: 12 }, // Statut
    { wch: 15 }, // Type contrat
    { wch: 15 }, // Horaire
    { wch: 18 }, // H supp mensualisées
    { wch: 15 }, // Forfait jours
    { wch: 15 }, // Salaire de base
    { wch: 15 }, // Heures normales
    { wch: 15 }, // Heures supp
    { wch: 18 }, // Absences
    { wch: 18 }, // Indemnités repas
    { wch: 18 }, // Indemnités trajet
    { wch: 20 }, // Indemnités trajet perso
    { wch: 18 }, // Prime ancienneté
    { wch: 20 }, // Intempéries
    { wch: 15 }, // Total heures
    { wch: 12 }, // Statut fiche
  ];

  // === STYLES NIVEAU 1 & 2 ===

  // Fusionner les cellules de l'en-tête (lignes 1-3)
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 22 } }, // Ligne 1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 22 } }, // Ligne 2
    { s: { r: 2, c: 0 }, e: { r: 2, c: 22 } }, // Ligne 3
  ];

  // Style pour l'en-tête principal (ligne 1)
  if (ws["A1"]) {
    ws["A1"].s = {
      font: { bold: true, sz: 14, color: { rgb: "1E40AF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "DBEAFE" } },
    };
  }

  // Style pour la période (ligne 2)
  if (ws["A2"]) {
    ws["A2"].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "DBEAFE" } },
    };
  }

  // Style pour la date de génération (ligne 3)
  if (ws["A3"]) {
    ws["A3"].s = {
      font: { italic: true, sz: 10, color: { rgb: "6B7280" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "F3F4F6" } },
    };
  }

  // Style pour les en-têtes de colonnes (ligne 5)
  const headerRow = 4; // Index 4 = ligne 5
  const headerCells = ["A5", "B5", "C5", "D5", "E5", "F5", "G5", "H5", "I5", "J5", "K5", "L5", "M5", "N5", "O5", "P5", "Q5", "R5", "S5", "T5", "U5", "V5", "W5"];
  headerCells.forEach((cell) => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thick", color: { rgb: "000000" } },
          bottom: { style: "thick", color: { rgb: "000000" } },
          left: { style: "thick", color: { rgb: "000000" } },
          right: { style: "thick", color: { rgb: "000000" } },
        },
      };
    }
  });

  // Lignes de données (alternées) et colonnes numériques
  const dataStartRow = 5; // Index 5 = ligne 6
  const dataEndRow = worksheetData.length - 2; // Avant la ligne TOTAL
  const numericCols = [10, 12, 13, 14, 17, 21]; // K, M, N, O, R, V (H supp mens., Salaire, Heures normales, supp, trajet, total)
  const integerCols = [15, 16, 18, 19, 20]; // P, Q, S, T, U (absences, repas, trajet perso, prime, intempéries)
  const statusCol = 22; // Colonne W (Statut fiche)

  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const isEven = (row - dataStartRow) % 2 === 0;
    const bgColor = isEven ? "FFFFFF" : "F5F5F5";

    for (let col = 0; col <= 22; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      // Style de base (lignes alternées)
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: bgColor } },
        border: {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "thin", color: { rgb: "D3D3D3" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } },
        },
        alignment: { vertical: "center" },
      };

      // Format numérique avec 2 décimales
      if (numericCols.includes(col)) {
        ws[cellAddress].z = "0.00";
        ws[cellAddress].s.alignment = { horizontal: "right", vertical: "center" };
      }

      // Format entier sans décimales
      if (integerCols.includes(col)) {
        ws[cellAddress].z = "0";
        ws[cellAddress].s.alignment = { horizontal: "right", vertical: "center" };
      }

      // Coloration conditionnelle pour le statut
      if (col === statusCol) {
        const cellValue = ws[cellAddress].v;
        if (cellValue === "Partiel" || cellValue === "Signé") {
          ws[cellAddress].s.font = { bold: true, color: { rgb: "D97706" } };
          ws[cellAddress].s.fill = { fgColor: { rgb: "FEF3C7" } };
        } else if (cellValue === "Validé") {
          ws[cellAddress].s.font = { bold: true, color: { rgb: "059669" } };
          ws[cellAddress].s.fill = { fgColor: { rgb: "D1FAE5" } };
        }
      }
    }
  }

  // Style pour la ligne TOTAL
  const totalRow = worksheetData.length - 1;
  for (let col = 0; col <= 22; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalRow, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "FFF9C4" } },
      alignment: {
        horizontal: col === 0 ? "left" : col >= 13 && col !== 21 ? "right" : "left",
        vertical: "center",
      },
      border: {
        top: { style: "thick", color: { rgb: "000000" } },
        bottom: { style: "thick", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    // Format numérique pour les totaux
    if (numericCols.includes(col)) {
      ws[cellAddress].z = "0.00";
    } else if (integerCols.includes(col)) {
      ws[cellAddress].z = "0";
    }
  }

  // Filtres automatiques
  ws["!autofilter"] = {
    ref: `A5:W${dataEndRow + 1}`,
  };

  // Hauteur des lignes
  ws["!rows"] = [
    { hpt: 24 }, // Ligne 1 (titre)
    { hpt: 20 }, // Ligne 2 (période)
    { hpt: 18 }, // Ligne 3 (date)
    { hpt: 10 }, // Ligne 4 (vide)
    { hpt: 22 }, // Ligne 5 (en-têtes)
  ];

  // Hauteur standard pour les données
  for (let i = dataStartRow; i <= dataEndRow; i++) {
    ws["!rows"][i] = { hpt: 18 };
  }

  // Hauteur de la ligne TOTAL
  ws["!rows"][totalRow] = { hpt: 22 };

  // Ajouter la feuille au classeur
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse mensuelle");

  // === FEUILLE 2: DÉTAIL QUOTIDIEN ===
  const detailData: any[][] = [];

  // En-têtes de la feuille détail
  detailData.push(["DÉTAIL QUOTIDIEN PAR JOUR"]);
  detailData.push([`Période : ${moisFormate.charAt(0).toUpperCase() + moisFormate.slice(1)}`]);
  detailData.push([`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`]);
  detailData.push([]);

  // En-têtes des colonnes
  detailData.push([
    "Date",
    "Nom",
    "Prénom",
    "Métier",
    "Chantier (code)",
    "Ville",
    "Heures",
    "H. Intempérie",
    "Type d'absence",
    "Panier",
    "Trajet",
    "Trajet Perso",
  ]);

  // Données quotidiennes
  data.forEach(emp => {
    if (emp.detailJours && emp.detailJours.length > 0) {
      emp.detailJours.forEach(jour => {
        const typeAbsence = jour.intemperie > 0 
          ? (jour.typeAbsence ? ABSENCE_TYPE_LABELS[jour.typeAbsence] || jour.typeAbsence : "À qualifier")
          : "-";
        
        detailData.push([
          jour.date,
          emp.nom,
          emp.prenom,
          emp.metier,
          jour.chantierCode || "-",
          jour.chantierVille || "-",
          jour.heures,
          jour.intemperie,
          typeAbsence,
          jour.panier ? "Oui" : "Non",
          jour.trajet,
          jour.trajetPerso ? "Oui" : "Non",
        ]);
      });
    }
  });

  // Créer la feuille détail
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);

  // Largeurs des colonnes
  wsDetail["!cols"] = [
    { wch: 12 }, // Date
    { wch: 20 }, // Nom
    { wch: 20 }, // Prénom
    { wch: 15 }, // Métier
    { wch: 18 }, // Chantier
    { wch: 20 }, // Ville
    { wch: 12 }, // Heures
    { wch: 15 }, // Intempérie
    { wch: 25 }, // Type d'absence
    { wch: 10 }, // Panier
    { wch: 10 }, // Trajet
    { wch: 12 }, // Trajet Perso
  ];

  // Fusionner l'en-tête
  wsDetail["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
  ];

  // Styles de l'en-tête
  if (wsDetail["A1"]) {
    wsDetail["A1"].s = {
      font: { bold: true, sz: 14, color: { rgb: "1E40AF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "DBEAFE" } },
    };
  }

  if (wsDetail["A2"]) {
    wsDetail["A2"].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "DBEAFE" } },
    };
  }

  if (wsDetail["A3"]) {
    wsDetail["A3"].s = {
      font: { italic: true, sz: 10, color: { rgb: "6B7280" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "F3F4F6" } },
    };
  }

  // Style des en-têtes de colonnes (ligne 5)
  const detailHeaderCells = ["A5", "B5", "C5", "D5", "E5", "F5", "G5", "H5", "I5", "J5", "K5", "L5"];
  detailHeaderCells.forEach((cell) => {
    if (wsDetail[cell]) {
      wsDetail[cell].s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thick", color: { rgb: "000000" } },
          bottom: { style: "thick", color: { rgb: "000000" } },
          left: { style: "thick", color: { rgb: "000000" } },
          right: { style: "thick", color: { rgb: "000000" } },
        },
      };
    }
  });

  // Styles des lignes de données (alternées)
  const detailDataStartRow = 5;
  const detailDataEndRow = detailData.length - 1;

  for (let row = detailDataStartRow; row <= detailDataEndRow; row++) {
    const isEven = (row - detailDataStartRow) % 2 === 0;
    const bgColor = isEven ? "FFFFFF" : "F5F5F5";

    for (let col = 0; col <= 11; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!wsDetail[cellAddress]) continue;

      wsDetail[cellAddress].s = {
        fill: { fgColor: { rgb: bgColor } },
        border: {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "thin", color: { rgb: "D3D3D3" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } },
        },
        alignment: { vertical: "center" },
      };

      // Formats numériques
      if (col === 6 || col === 7) { // Heures, Intempérie
        wsDetail[cellAddress].z = "0.00";
        wsDetail[cellAddress].s.alignment = { horizontal: "right", vertical: "center" };
      } else if (col === 10) { // Trajet
        wsDetail[cellAddress].z = "0";
        wsDetail[cellAddress].s.alignment = { horizontal: "right", vertical: "center" };
      } else if (col === 8 || col === 9 || col === 11) { // Type absence, Panier, Trajet Perso (centrer le texte)
        wsDetail[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
      }
    }
  }

  // Filtres automatiques
  wsDetail["!autofilter"] = {
    ref: `A5:L${detailDataEndRow + 1}`,
  };

  // Ajouter la feuille détail au classeur
  XLSX.utils.book_append_sheet(wb, wsDetail, "Détail quotidien");

  // Générer le fichier et le télécharger
  const fileName = `export-rh-${mois}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};
