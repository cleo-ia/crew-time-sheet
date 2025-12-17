import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DayDetail {
  date: string;
  chantier: string;
  chantierNom?: string;
  chantierCode?: string | null;
  heuresNormales: number;
  heuresIntemperies: number;
  panier: boolean;
  codeTrajet?: string | null;
  typeAbsence?: string | null;
  trajetPerso?: boolean;
}

interface SignatureData {
  signature_data: string;
  signed_at: string;
  role: string | null;
}

interface WeekDetailPdfOptions {
  entrepriseNom?: string;
  entrepriseLogo?: string; // base64
  primaryColor?: string;   // hex color
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 234, g: 88, b: 12 }; // Default orange
}

export function generateWeekDetailPdf(
  employeeName: string,
  semaine: string,
  days: DayDetail[],
  signature?: SignatureData,
  options?: WeekDetailPdfOptions
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // Colors
  const primaryColor = hexToRgb(options?.primaryColor || '#ea580c');
  const entrepriseNom = options?.entrepriseNom || 'DIVA';

  // === HEADER AVEC BANDEAU COLORÉ ===
  
  // Bandeau supérieur avec couleur primaire
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, pageWidth, 8, "F");

  // Logo de l'entreprise (si disponible)
  let logoEndX = margin;
  if (options?.entrepriseLogo) {
    try {
      doc.addImage(options.entrepriseLogo, "PNG", margin, 12, 35, 18);
      logoEndX = margin + 40;
    } catch (e) {
      console.error("Erreur chargement logo:", e);
    }
  }

  // Nom de l'entreprise
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(entrepriseNom, logoEndX, 20);
  doc.setTextColor(0, 0, 0);

  // Titre et semaine à droite
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("FICHE HORAIRE", pageWidth - margin, 16, { align: "right" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Semaine : ${semaine}`, pageWidth - margin, 23, { align: "right" });

  // Ligne de séparation sous le header
  y = 35;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // === SECTION EMPLOYÉ ===
  
  // Badge coloré pour le nom
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(employeeName, margin, y);

  y += 12;

  // === SECTION RÉSUMÉ AVEC CARTES ===
  
  // Calculer les totaux
  const totals = days.reduce(
    (acc, day) => ({
      heures: acc.heures + (day.heuresNormales || 0),
      intemperies: acc.intemperies + (day.heuresIntemperies || 0),
      paniers: acc.paniers + (day.panier ? 1 : 0),
      trajets: acc.trajets + (day.codeTrajet && day.codeTrajet !== 'A_COMPLETER' ? 1 : 0),
    }),
    { heures: 0, intemperies: 0, paniers: 0, trajets: 0 }
  );

  // Titre de section avec icône simulée
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, y - 3, 3, 10, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Résumé de la semaine", margin + 8, y + 4);
  y += 14;

  // Cartes de résumé compactes
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 18;
  const summaryItems = [
    { label: "Heures totales", value: `${totals.heures}h`, color: [59, 130, 246] },
    { label: "Intempéries", value: `${totals.intemperies}h`, color: [14, 165, 233] },
    { label: "Paniers", value: `${totals.paniers}`, color: [primaryColor.r, primaryColor.g, primaryColor.b] },
    { label: "Trajets", value: `${totals.trajets}`, color: [34, 197, 94] },
  ];

  summaryItems.forEach((item, idx) => {
    const x = margin + idx * (cardWidth + 5);
    
    // Ombre simulée
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(x + 1, y + 1, cardWidth, cardHeight, 3, 3, "F");
    
    // Fond de carte blanc
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "F");
    
    // Bordure
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "S");
    
    // Bordure colorée en haut
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(x, y, cardWidth, 2.5, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y + 1.5, cardWidth, 1.5, "F");
    
    // Valeur
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.value, x + cardWidth / 2, y + 10, { align: "center" });
    
    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, x + cardWidth / 2, y + 15, { align: "center" });
  });

  doc.setTextColor(0, 0, 0);
  y += cardHeight + 8;

  // === LISTE DES CHANTIERS TRAVAILLÉS ===
  const chantiersMap = new Map<string, { nom: string; code?: string | null; heures: number }>();
  days.forEach(d => {
    const key = d.chantierNom || d.chantier;
    const existing = chantiersMap.get(key);
    if (existing) {
      existing.heures += d.heuresNormales;
    } else {
      chantiersMap.set(key, { 
        nom: d.chantierNom || d.chantier, 
        code: d.chantierCode, 
        heures: d.heuresNormales 
      });
    }
  });

  if (chantiersMap.size > 0) {
    // Titre de section
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y - 3, 3, 10, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("Chantiers travaillés", margin + 8, y + 4);
    y += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    let idx = 0;
    chantiersMap.forEach((chantierData) => {
      // Fond alterné
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, "F");
      
      // Puce colorée
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.circle(margin + 4, y + 4.5, 1.5, "F");
      
      // Nom du chantier
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.text(chantierData.nom, margin + 10, y + 4);
      
      // Code chantier en petit
      if (chantierData.code) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(chantierData.code, margin + 10, y + 7.5);
        doc.setFontSize(10);
      }
      
      // Badge heures
      const heuresText = `${chantierData.heures}h`;
      const heuresBadgeWidth = 18;
      doc.setFillColor(240, 240, 245);
      doc.roundedRect(pageWidth - margin - heuresBadgeWidth - 3, y + 1.5, heuresBadgeWidth, 6, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(heuresText, pageWidth - margin - heuresBadgeWidth / 2 - 3, y + 5.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      
      y += 11;
      idx++;
    });
    
    y += 8;
  }

  // === TABLEAU DÉTAIL JOUR PAR JOUR ===
  
  // Titre de section
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, y - 3, 3, 10, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Détail jour par jour", margin + 8, y + 4);
  y += 14;

  // En-tête du tableau avec couleur primaire
  const colWidths = [26, 50, 20, 20, 22, 22, 20];
  const headers = ["Date", "Chantier", "Heures", "Intemp.", "Panier", "Trajet", "Absence"];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const startX = margin;

  // Fond header avec couleur primaire
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(startX, y, tableWidth, 9, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  
  let xPos = startX;
  headers.forEach((header, idx) => {
    doc.text(header, xPos + colWidths[idx] / 2, y + 6, { align: "center" });
    xPos += colWidths[idx];
  });
  y += 9;

  // Lignes du tableau
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  days.forEach((day, rowIdx) => {
    const isAbsent = day.heuresNormales === 0 && day.heuresIntemperies === 0;
    
    // Alternance de couleur
    if (rowIdx % 2 === 0) {
      doc.setFillColor(250, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(startX, y, tableWidth, 7, "F");
    
    // Fond rouge pâle si absent avec motif
    if (isAbsent && day.typeAbsence) {
      doc.setFillColor(255, 245, 245);
      doc.rect(startX, y, tableWidth, 7, "F");
    }

    // Bordures de cellules
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    xPos = startX;
    colWidths.forEach(w => {
      doc.rect(xPos, y, w, 7);
      xPos += w;
    });

    xPos = startX;
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);

    // Date
    const dateText = format(new Date(day.date), "EEE dd/MM", { locale: fr });
    doc.text(dateText, xPos + colWidths[0] / 2, y + 5, { align: "center" });
    xPos += colWidths[0];

    // Chantier (nom + code en petit)
    const nomDisplay = day.chantierNom || day.chantier;
    const nomText = nomDisplay.length > 20 ? nomDisplay.substring(0, 18) + "..." : nomDisplay;
    doc.text(nomText, xPos + 2, y + 3.5);
    if (day.chantierCode) {
      doc.setFontSize(5);
      doc.setTextColor(120, 120, 120);
      const codeText = day.chantierCode.length > 16 ? day.chantierCode.substring(0, 14) + "..." : day.chantierCode;
      doc.text(codeText, xPos + 2, y + 6);
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
    }
    xPos += colWidths[1];

    // Heures
    if (!isAbsent) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
    }
    doc.text(isAbsent ? "-" : `${day.heuresNormales}h`, xPos + colWidths[2] / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    xPos += colWidths[2];

    // Intempéries
    if (day.heuresIntemperies > 0) {
      doc.setTextColor(14, 165, 233);
    }
    doc.text(day.heuresIntemperies > 0 ? `${day.heuresIntemperies}h` : "-", xPos + colWidths[3] / 2, y + 5, { align: "center" });
    doc.setTextColor(50, 50, 50);
    xPos += colWidths[3];

    // Panier
    if (day.panier) {
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.circle(xPos + colWidths[4] / 2, y + 3.5, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5);
      doc.text("✓", xPos + colWidths[4] / 2, y + 4.5, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
    } else {
      doc.text("-", xPos + colWidths[4] / 2, y + 5, { align: "center" });
    }
    xPos += colWidths[4];

    // Trajet
    let trajetText = "-";
    if (day.trajetPerso) {
      trajetText = "Perso";
      doc.setTextColor(100, 100, 100);
    } else if (day.codeTrajet && day.codeTrajet !== "A_COMPLETER") {
      trajetText = day.codeTrajet;
      doc.setTextColor(34, 197, 94);
    }
    doc.text(trajetText, xPos + colWidths[5] / 2, y + 5, { align: "center" });
    doc.setTextColor(50, 50, 50);
    xPos += colWidths[5];

    // Absence
    if (day.typeAbsence) {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
    }
    doc.text(day.typeAbsence || "-", xPos + colWidths[6] / 2, y + 5, { align: "center" });
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");

    y += 7;
  });

  // Ligne de totaux avec style distinct
  y += 1;
  
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(startX, y, tableWidth, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  xPos = startX;
  doc.text("TOTAL", xPos + colWidths[0] / 2, y + 6, { align: "center" });
  xPos += colWidths[0] + colWidths[1];
  doc.text(`${totals.heures}h`, xPos + colWidths[2] / 2, y + 6, { align: "center" });
  xPos += colWidths[2];
  doc.text(totals.intemperies > 0 ? `${totals.intemperies}h` : "-", xPos + colWidths[3] / 2, y + 6, { align: "center" });
  xPos += colWidths[3];
  doc.text(`${totals.paniers}`, xPos + colWidths[4] / 2, y + 6, { align: "center" });
  xPos += colWidths[4];
  doc.text(`${totals.trajets}`, xPos + colWidths[5] / 2, y + 6, { align: "center" });

  y += 18;

  // === SECTION SIGNATURE ===
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, y - 3, 3, 10, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Signature de l'employé", margin + 8, y + 4);
  y += 14;

  if (signature && signature.signature_data) {
    // Cadre pour la signature avec style amélioré
    const sigBoxWidth = 70;
    const sigBoxHeight = 35;
    
    // Ombre
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin + 1, y + 1, sigBoxWidth, sigBoxHeight, 4, 4, "F");
    
    // Fond blanc
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 4, 4, "F");
    
    // Bordure
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 4, 4, "S");

    // Intégrer l'image de signature (base64)
    try {
      doc.addImage(
        signature.signature_data,
        "PNG",
        margin + 3,
        y + 3,
        sigBoxWidth - 6,
        sigBoxHeight - 6
      );
    } catch (e) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("Signature numérique", margin + sigBoxWidth / 2, y + sigBoxHeight / 2, { align: "center" });
    }

    // Informations de signature à droite
    const infoX = margin + sigBoxWidth + 10;
    
    // Badge "Signé" avec couleur verte
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(infoX, y, 30, 9, 3, 3, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("✓ Signé", infoX + 15, y + 6, { align: "center" });
    doc.setTextColor(0, 0, 0);

    // Date de signature
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Signé le ${format(new Date(signature.signed_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
      infoX,
      y + 18
    );

    // Mention légale
    doc.setFontSize(8);
    doc.text("Signature électronique valide", infoX, y + 25);
    doc.setTextColor(0, 0, 0);

  } else {
    // Non signé
    const sigBoxWidth = 70;
    const sigBoxHeight = 35;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 4, 4, "S");
    doc.setLineDashPattern([], 0);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Non signé", margin + sigBoxWidth / 2, y + sigBoxHeight / 2, { align: "center" });
    doc.setTextColor(0, 0, 0);

    // Badge "Non signé" avec couleur rouge
    const infoX = margin + sigBoxWidth + 10;
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(infoX, y, 35, 9, 3, 3, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("✗ Non signé", infoX + 17.5, y + 6, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // === PIED DE PAGE ===
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageHeight - 18, pageWidth, 18, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(entrepriseNom, margin, pageHeight - 8);
  doc.text(
    `Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );
  doc.text("Page 1/1", pageWidth - margin, pageHeight - 8, { align: "right" });

  // Sauvegarder le PDF
  const fileName = `fiche-${employeeName.replace(/\s+/g, "_")}-${semaine}.pdf`;
  doc.save(fileName);
}
