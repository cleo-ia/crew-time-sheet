import jsPDF from "jspdf";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
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
  trajetPerso?: boolean;
  typeAbsence?: string | null;
}

interface SalarieInfo {
  nom: string;
  prenom: string;
  role: string;
  isChef: boolean;
  agence_interim?: string | null;
}

interface Summary {
  totalHeures: number;
  totalIntemperies: number;
  totalPaniers: number;
  totalTrajets: number;
}

interface SignatureData {
  signature_data: string;
  signed_at: string;
  role: string | null;
}

interface EmployeePdfData {
  salarie: SalarieInfo;
  dailyDetails: DayDetail[];
  summary: Summary;
  signaturesBySemaine: Record<string, SignatureData>;
  periode: string;
  // Enterprise info
  entrepriseNom?: string;
  entrepriseLogo?: string; // base64
  primaryColor?: string; // hex color
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

export function generateEmployeePeriodPdf(data: EmployeePdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // Colors
  const primaryColor = hexToRgb(data.primaryColor || '#ea580c');
  const entrepriseNom = data.entrepriseNom || 'DIVA';

  const addPageFooter = (pageNum: number, totalPages: number) => {
    // Footer bar
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 18, pageWidth, 18, "F");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      entrepriseNom,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
    doc.text(
      `Page ${pageNum}/${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
    doc.setTextColor(0, 0, 0);
  };

  const checkPageBreak = (neededSpace: number): boolean => {
    if (y + neededSpace > pageHeight - 25) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // === HEADER AVEC BANDEAU COLORÉ ===
  
  // Bandeau supérieur avec couleur primaire
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, pageWidth, 8, "F");

  // Logo de l'entreprise (si disponible)
  let logoEndX = margin;
  if (data.entrepriseLogo) {
    try {
      doc.addImage(data.entrepriseLogo, "PNG", margin, 12, 35, 18);
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

  // Titre et période à droite
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("FICHE HORAIRE", pageWidth - margin, 16, { align: "right" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const periodeText = `Période : ${data.periode}`;
  doc.text(periodeText, pageWidth - margin, 23, { align: "right" });

  // Ligne de séparation sous le header
  y = 35;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // === SECTION EMPLOYÉ ===
  
  // Badge coloré pour le nom
  const fullName = `${data.salarie.prenom} ${data.salarie.nom}`;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(fullName, margin, y);
  
  // Badge rôle avec fond coloré
  const roleText = data.salarie.isChef ? "Chef" : 
    data.salarie.role === "conducteur" ? "Conducteur" :
    data.salarie.role === "finisseur" ? "Finisseur" :
    data.salarie.role === "grutier" ? "Grutier" :
    data.salarie.role === "interimaire" ? "Intérimaire" : "Maçon";
  
  const roleWidth = doc.getTextWidth(roleText) * 0.7 + 10;
  const roleX = margin + doc.getTextWidth(fullName) + 8;
  
  // Fond du badge avec couleur primaire légère
  doc.setFillColor(
    Math.min(255, primaryColor.r + 180),
    Math.min(255, primaryColor.g + 160),
    Math.min(255, primaryColor.b + 160)
  );
  doc.roundedRect(roleX, y - 5, roleWidth, 7, 2, 2, "F");
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(roleText, roleX + roleWidth / 2, y - 1, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y += 6;

  // Agence intérim si applicable
  if (data.salarie.agence_interim) {
    doc.setFontSize(10);
    doc.setTextColor(120, 60, 150);
    doc.setFont("helvetica", "italic");
    doc.text(`Agence : ${data.salarie.agence_interim}`, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 8;
  }

  y += 8;

  // === SECTION RÉSUMÉ AVEC CARTES AMÉLIORÉES ===
  
  // Titre de section avec icône simulée
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, y - 3, 3, 10, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Résumé de la période", margin + 8, y + 4);
  y += 14;

  // Cartes de résumé compactes
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 18;
  const summaryItems = [
    { label: "Heures totales", value: `${data.summary.totalHeures}h`, color: [59, 130, 246] },
    { label: "Intempéries", value: `${data.summary.totalIntemperies}h`, color: [14, 165, 233] },
    { label: "Paniers", value: `${data.summary.totalPaniers}`, color: [primaryColor.r, primaryColor.g, primaryColor.b] },
    { label: "Trajets", value: `${data.summary.totalTrajets}`, color: [34, 197, 94] },
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
  const chantiersSet = new Set(data.dailyDetails.map(d => d.chantier));
  const chantiersList = Array.from(chantiersSet);

  if (chantiersList.length > 0) {
    // Titre de section
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y - 3, 3, 10, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("Chantiers travaillés", margin + 8, y + 4);
    y += 12;

    // Calculer heures par chantier
    const heuresParChantier = new Map<string, number>();
    data.dailyDetails.forEach(d => {
      const current = heuresParChantier.get(d.chantier) || 0;
      heuresParChantier.set(d.chantier, current + d.heuresNormales);
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    chantiersList.forEach((chantier, idx) => {
      const heures = heuresParChantier.get(chantier) || 0;
      
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
      
      doc.setTextColor(50, 50, 50);
      doc.text(chantier, margin + 10, y + 6);
      
      // Badge heures
      const heuresText = `${heures}h`;
      const heuresBadgeWidth = 18;
      doc.setFillColor(240, 240, 245);
      doc.roundedRect(pageWidth - margin - heuresBadgeWidth - 3, y + 1.5, heuresBadgeWidth, 6, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(heuresText, pageWidth - margin - heuresBadgeWidth / 2 - 3, y + 5.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      
      y += 11;
    });
    
    y += 8;
  }

  // === TABLEAU DÉTAIL JOUR PAR JOUR ===
  checkPageBreak(50);
  
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
  let totals = { heures: 0, intemperies: 0, paniers: 0, trajets: 0 };

  data.dailyDetails.forEach((day, rowIdx) => {
    checkPageBreak(8);
    
    const isAbsent = day.heuresNormales === 0;
    
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

    // Totaux
    totals.heures += day.heuresNormales || 0;
    totals.intemperies += day.heuresIntemperies || 0;
    totals.paniers += day.panier ? 1 : 0;
    totals.trajets += (day.codeTrajet && day.codeTrajet !== "A_COMPLETER") ? 1 : 0;

    y += 7;
  });

  // Ligne de totaux avec style distinct
  checkPageBreak(12);
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

  // === SECTION SIGNATURES ===
  const signatures = Object.entries(data.signaturesBySemaine);
  
  if (signatures.length > 0) {
    checkPageBreak(60);
    
    // Séparateur élégant
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 40, y);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin + 42, y, pageWidth - margin, y);
    y += 12;

    // Titre de section
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(margin, y - 3, 3, 10, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("Signatures", margin + 8, y + 4);
    y += 14;

    // Grouper les semaines à partir des dates des dailyDetails
    const weeksInPeriod = new Set<string>();
    data.dailyDetails.forEach(day => {
      const dateObj = new Date(day.date);
      const weekNumber = getISOWeek(dateObj);
      const year = getISOWeekYear(dateObj);
      weeksInPeriod.add(`${year}-S${weekNumber.toString().padStart(2, '0')}`);
    });

    Array.from(weeksInPeriod).sort().forEach((semaine) => {
      checkPageBreak(50);
      
      const signature = data.signaturesBySemaine[semaine];
      
      // Badge semaine avec style amélioré
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.roundedRect(margin, y, 28, 8, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(semaine, margin + 14, y + 5.5, { align: "center" });

      if (signature && signature.signature_data) {
        // Badge "Signé" vert
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(margin + 32, y, 22, 8, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(22, 163, 74);
        doc.text("✓ Signé", margin + 43, y + 5.5, { align: "center" });
        doc.setTextColor(0, 0, 0);

        y += 14;

        // Cadre signature élégant
        const sigBoxWidth = 65;
        const sigBoxHeight = 32;
        
        // Ombre
        doc.setFillColor(235, 235, 235);
        doc.roundedRect(margin + 2, y + 2, sigBoxWidth, sigBoxHeight, 3, 3, "F");
        
        // Fond blanc
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 3, 3, "F");
        
        // Bordure
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 3, 3, "S");

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

        // Infos signature à droite
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("Signé par l'employé", margin + sigBoxWidth + 12, y + 10);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          format(new Date(signature.signed_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr }),
          margin + sigBoxWidth + 12,
          y + 18
        );
        doc.setTextColor(0, 0, 0);

        y += sigBoxHeight + 10;
      } else {
        // Badge "Non signé" rouge
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(margin + 32, y, 28, 8, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 38);
        doc.text("✗ Non signé", margin + 46, y + 5.5, { align: "center" });
        doc.setTextColor(0, 0, 0);

        y += 18;
      }
    });
  }

  // === PIED DE PAGE ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(i, totalPages);
  }

  // Sauvegarder
  const fileName = `fiche-${data.salarie.prenom}_${data.salarie.nom}-${data.periode}.pdf`;
  doc.save(fileName.replace(/\s+/g, "_"));
}
