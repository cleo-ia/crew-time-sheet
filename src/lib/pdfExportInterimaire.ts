import jsPDF from "jspdf";
import { RHExportEmployee } from "@/hooks/useRHExport";
import { format, parseISO, startOfWeek, addDays, getISOWeek } from "date-fns";
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoSder from "@/assets/logo-sder.png";
import logoEngoBourgogne from "@/assets/logo-engo-bourgogne.png";

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
 * Récupère le logo de l'entreprise selon le slug
 */
const getEntrepriseLogo = (): string => {
  const slug = localStorage.getItem("entreprise_slug");
  const logos: Record<string, string> = {
    "limoge-revillon": logoLimogeRevillon,
    "sder": logoSder,
    "engo-bourgogne": logoEngoBourgogne,
  };
  return logos[slug || ""] || logoLimogeRevillon;
};

// Couleurs
const COLORS = {
  darkGreen: { r: 46, g: 125, b: 50 },      // #2E7D32
  lightGreen: { r: 200, g: 230, b: 201 },   // #C8E6C9
  yellow: { r: 255, g: 249, b: 196 },       // #FFF9C4
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  orange: { r: 234, g: 88, b: 12 },         // #EA580C - orange principal
  orangeLight: { r: 255, g: 237, b: 213 },  // #FFEDD5 - orange clair
  darkBlue: { r: 30, g: 58, b: 138 },       // #1E3A8A - bleu foncé pour le nom entreprise
};

/**
 * Génère un fichier PDF simplifié pour agence d'intérim
 * Format: fiche de pointage hebdomadaire par intérimaire
 */
export const generateInterimaireSimplifiedPdf = async (
  employees: RHExportEmployee[],
  mois: string,
  agenceName: string,
  semaine?: string,
  signatures?: Map<string, string>
): Promise<string> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  const headerHeight = 25; // Hauteur réservée pour l'en-tête
  const footerHeight = 12; // Hauteur réservée pour le pied de page
  
  // Largeurs des colonnes
  const colLabel = 18;
  const colDay = 16;
  const colTotal = 16;
  const colSignature = 30;
  const rowHeight = 7;
  
  let currentY = margin + headerHeight;
  const entrepriseName = getEntrepriseName();
  const entrepriseLogo = getEntrepriseLogo();
  const generationDate = new Date();

  // Grouper les employés par semaine
  const allWeeks = new Set<string>();
  employees.forEach((emp) => {
    const weeks = groupByWeek(emp.detailJours);
    weeks.forEach((w) => allWeeks.add(`${w.year}-W${w.weekNumber}`));
  });

  const sortedWeeks = Array.from(allWeeks).sort();

  const drawRect = (x: number, y: number, w: number, h: number, color: { r: number; g: number; b: number }, fill: boolean = true) => {
    pdf.setFillColor(color.r, color.g, color.b);
    pdf.setDrawColor(0, 0, 0);
    if (fill) {
      pdf.rect(x, y, w, h, "FD");
    } else {
      pdf.rect(x, y, w, h, "S");
    }
  };

  const drawText = (text: string, x: number, y: number, options?: { 
    bold?: boolean; 
    white?: boolean; 
    align?: "left" | "center" | "right";
    fontSize?: number;
    italic?: boolean;
    color?: { r: number; g: number; b: number };
  }) => {
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setFont("helvetica", options?.bold ? "bold" : options?.italic ? "italic" : "normal");
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

  // Dessiner l'en-tête professionnel de page
  const drawPageHeader = () => {
    // Barre verte en haut (cohérence avec le reste du document)
    pdf.setFillColor(COLORS.darkGreen.r, COLORS.darkGreen.g, COLORS.darkGreen.b);
    pdf.rect(0, 0, pageWidth, 5, "F");

    // Logo à gauche
    try {
      pdf.addImage(entrepriseLogo, "PNG", margin, 7, 25, 12);
    } catch (error) {
      console.error("Erreur lors du chargement du logo:", error);
    }

    // Nom entreprise au centre (en noir)
    drawText(entrepriseName, pageWidth / 2, 15, { 
      bold: true, 
      fontSize: 14, 
      align: "center",
      color: COLORS.black
    });

    // Titre "FICHE INTÉRIMAIRE" et période à droite
    drawText("FICHE INTÉRIMAIRE", pageWidth - margin, 11, { 
      bold: true, 
      fontSize: 11, 
      align: "right" 
    });
    drawText(`Période : ${mois}`, pageWidth - margin, 17, { 
      fontSize: 9, 
      align: "right" 
    });

    // Ligne séparatrice verte
    pdf.setDrawColor(COLORS.darkGreen.r, COLORS.darkGreen.g, COLORS.darkGreen.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 22, pageWidth - margin, 22);
    pdf.setLineWidth(0.2);
  };

  // Dessiner le pied de page
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - footerHeight + 3;
    
    // Ligne séparatrice
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 2, pageWidth - margin, footerY - 2);
    pdf.setLineWidth(0.2);

    // Nom entreprise à gauche
    drawText(entrepriseName, margin, footerY + 4, { fontSize: 8 });

    // Date de génération au centre
    const dateStr = format(generationDate, "dd/MM/yyyy");
    const timeStr = format(generationDate, "HH:mm");
    drawText(`Document généré le ${dateStr} à ${timeStr}`, pageWidth / 2, footerY + 4, { 
      fontSize: 8, 
      align: "center" 
    });

    // Numéro de page à droite
    drawText(`Page ${pageNum}/${totalPages}`, pageWidth - margin, footerY + 4, { 
      fontSize: 8, 
      align: "right" 
    });
  };

  const addNewPage = () => {
    pdf.addPage();
    currentY = margin + headerHeight;
    drawPageHeader();
  };

  const checkPageBreak = (requiredHeight: number): boolean => {
    if (currentY + requiredHeight > pageHeight - margin - footerHeight) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Fonction pour dessiner l'en-tête de semaine
  const drawWeekHeader = (weekData: WeekData) => {
    const periodeStart = format(weekData.startDate, "dd/MM/yyyy");
    const periodeEnd = format(weekData.endDate, "dd/MM/yyyy");
    const weekLabel = `S${weekData.weekNumber}`;

    // Ligne 1: Nom entreprise + Période
    const headerHeight = 8;
    const halfWidth = contentWidth / 2;
    
    drawRect(margin, currentY, halfWidth, headerHeight, COLORS.darkGreen);
    drawText(entrepriseName, margin + halfWidth / 2, currentY + 5.5, { bold: true, white: true, align: "center" });
    
    drawRect(margin + halfWidth, currentY, halfWidth, headerHeight, COLORS.darkGreen);
    drawText(`${weekLabel} — Période du ${periodeStart} au ${periodeEnd}`, margin + halfWidth + halfWidth / 2, currentY + 5.5, { bold: true, white: true, align: "center" });
    currentY += headerHeight;

    // Ligne 2: Signature + Cachet
    const signatureHeight = 7;
    drawRect(margin, currentY, halfWidth, signatureHeight, COLORS.lightGreen);
    drawText("Signature du responsable", margin + halfWidth / 2, currentY + 5, { italic: true, align: "center" });
    
    drawRect(margin + halfWidth, currentY, halfWidth, signatureHeight, COLORS.lightGreen);
    drawText("Cachet du client", margin + halfWidth + halfWidth / 2, currentY + 5, { italic: true, align: "center" });
    currentY += signatureHeight;

    // Ligne 3: Zone vide pour signatures
    const emptySignHeight = 20;
    drawRect(margin, currentY, halfWidth, emptySignHeight, COLORS.white, false);
    drawRect(margin + halfWidth, currentY, halfWidth, emptySignHeight, COLORS.white, false);
    currentY += emptySignHeight;

    // Ligne 4: Légende
    const legendHeight = 6;
    drawRect(margin, currentY, contentWidth, legendHeight, COLORS.yellow);
    drawText("HNORM = heure normale   HI = intempérie   T = trajet   PA = panier", margin + contentWidth / 2, currentY + 4.2, { italic: true, fontSize: 8, align: "center" });
    currentY += legendHeight;

    // Espace
    currentY += 3;
  };

  // Fonction pour calculer la hauteur d'un bloc employé
  const getEmployeeBlockHeight = (hasIntemperie: boolean): number => {
    const titleRow = rowHeight;
    const headerRow = rowHeight;
    const codeRow = rowHeight;
    const hnormRow = rowHeight;
    const hiRow = hasIntemperie ? rowHeight : 0;
    const paRow = rowHeight;
    const tRow = rowHeight;
    return titleRow + headerRow + codeRow + hnormRow + hiRow + paRow + tRow + 5; // +5 pour l'espacement
  };

  // Dessiner un bloc employé
  const drawEmployeeBlock = (employee: RHExportEmployee, weekData: WeekData) => {
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
    const hasIntemperie = totalIntemperie > 0;

    // Vérifier si besoin de nouvelle page
    const blockHeight = getEmployeeBlockHeight(hasIntemperie);
    checkPageBreak(blockHeight);

    const startY = currentY;
    const tableWidth = colLabel + colDay * 5 + colTotal + colSignature;
    const tableX = margin + (contentWidth - tableWidth) / 2; // Centrer le tableau

    // Ligne titre employé
    const matriculeInfo = employee.matricule ? ` (${employee.matricule})` : "";
    const empTitle = `${employee.nom.toUpperCase()} ${employee.prenom}${matriculeInfo} — ${agenceName}`;
    
    drawRect(tableX, currentY, tableWidth - colSignature, rowHeight, COLORS.darkGreen);
    drawText(empTitle, tableX + 3, currentY + 5, { bold: true, white: true });
    
    // En-tête Signature
    drawRect(tableX + tableWidth - colSignature, currentY, colSignature, rowHeight, COLORS.darkGreen);
    drawText("Signature", tableX + tableWidth - colSignature / 2, currentY + 5, { bold: true, white: true, align: "center" });
    currentY += rowHeight;

    // Ligne en-tête jours
    let x = tableX;
    drawRect(x, currentY, colLabel, rowHeight, COLORS.lightGreen);
    x += colLabel;
    
    for (let i = 0; i < 5; i++) {
      drawRect(x, currentY, colDay, rowHeight, COLORS.lightGreen);
      drawText(daysData[i].label, x + colDay / 2, currentY + 5, { bold: true, align: "center" });
      x += colDay;
    }
    
    drawRect(x, currentY, colTotal, rowHeight, COLORS.lightGreen);
    drawText("Total", x + colTotal / 2, currentY + 5, { bold: true, align: "center" });
    x += colTotal;
    
    // Cellule signature - seulement bordures verticales gauche/droite
    pdf.setDrawColor(0, 0, 0);
    pdf.line(x, currentY, x, currentY + rowHeight); // gauche
    pdf.line(x + colSignature, currentY, x + colSignature, currentY + rowHeight); // droite
    currentY += rowHeight;

    // Fonction pour dessiner une ligne de données (sans bordure sur colonne signature)
    const drawDataRow = (label: string, values: (string | number)[], total: string | number, isLastRow: boolean = false) => {
      let x = tableX;
      
      // Label avec fond jaune
      drawRect(x, currentY, colLabel, rowHeight, COLORS.yellow);
      drawText(label, x + 3, currentY + 5, { bold: true });
      x += colLabel;
      
      // Valeurs
      for (let i = 0; i < 5; i++) {
        drawRect(x, currentY, colDay, rowHeight, COLORS.white, false);
        const val = values[i];
        if (val !== "" && val !== 0) {
          drawText(String(val), x + colDay / 2, currentY + 5, { align: "center" });
        }
        x += colDay;
      }
      
      // Total
      drawRect(x, currentY, colTotal, rowHeight, COLORS.white, false);
      if (total !== "" && total !== 0) {
        drawText(String(total), x + colTotal / 2, currentY + 5, { bold: true, align: "center" });
      }
      x += colTotal;
      
      // Signature - uniquement bordures verticales gauche/droite et bas si dernière ligne
      pdf.setDrawColor(0, 0, 0);
      // Bordure gauche
      pdf.line(x, currentY, x, currentY + rowHeight);
      // Bordure droite
      pdf.line(x + colSignature, currentY, x + colSignature, currentY + rowHeight);
      // Bordure bas seulement si dernière ligne
      if (isLastRow) {
        pdf.line(x, currentY + rowHeight, x + colSignature, currentY + rowHeight);
      }
      
      currentY += rowHeight;
    };

    // Ligne Code
    drawDataRow("Code", daysData.map(d => d.code), "", false);

    // Ligne HNORM
    const formatNumber = (n: number) => n > 0 ? n.toFixed(2).replace(".", ",") : "";
    drawDataRow("HNORM", daysData.map(d => formatNumber(d.heures)), formatNumber(totalHeures), false);

    // Ligne HI (si intempéries)
    if (hasIntemperie) {
      drawDataRow("HI", daysData.map(d => formatNumber(d.intemperie)), formatNumber(totalIntemperie), false);
    }

    // Ligne PA
    const formatInt = (n: number) => n > 0 ? n.toFixed(2).replace(".", ",") : "";
    drawDataRow("PA", daysData.map(d => formatInt(d.panier)), formatInt(totalPanier), false);

    // Ligne T (dernière ligne)
    drawDataRow("T", daysData.map(d => formatInt(d.trajet)), formatInt(totalTrajet), true);

    // Ajouter la signature si disponible
    const signatureData = employee.ficheId ? signatures?.get(employee.ficheId) : null;
    if (signatureData) {
      try {
        const signatureX = tableX + tableWidth - colSignature + 2;
        const signatureY = startY + rowHeight + 2;
        const signatureHeight = currentY - startY - rowHeight - 4;
        
        pdf.addImage(
          signatureData,
          "PNG",
          signatureX,
          signatureY,
          colSignature - 4,
          Math.min(signatureHeight, 25)
        );
      } catch (error) {
        console.error("Erreur lors de l'ajout de la signature:", error);
      }
    }

    // Espacement entre employés
    currentY += 5;
  };

  // Dessiner l'en-tête de la première page
  drawPageHeader();

  // Générer le contenu - une semaine par page
  let isFirstWeek = true;
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

    // Saut de page forcé pour chaque nouvelle semaine (sauf la première)
    if (!isFirstWeek) {
      addNewPage();
    }
    isFirstWeek = false;

    drawWeekHeader(firstWeekData);

    // Blocs employés
    for (const { employee, weekData } of weekEmployees) {
      drawEmployeeBlock(employee, weekData);
    }
  }

  // Ajouter les pieds de page sur toutes les pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawPageFooter(i, totalPages);
  }

  // Nom du fichier
  const fileName = semaine
    ? `Pointage-${agenceName.replace(/\s+/g, "-")}-${semaine}.pdf`
    : `Pointage-${agenceName.replace(/\s+/g, "-")}-${mois}.pdf`;

  // Télécharger
  pdf.save(fileName);

  return fileName;
};
