import jsPDF from "jspdf";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { fr } from "date-fns/locale";

interface DayDetail {
  date: string;
  chantier: string;
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
}

export function generateEmployeePeriodPdf(data: EmployeePdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 20;

  const addPageFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })} - Page ${pageNum}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
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

  // === PAGE 1: EN-TÊTE ET RÉSUMÉ ===
  
  // Titre
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Fiche horaire mensuelle", margin, y);
  
  // Badge période
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const badgeText = data.periode;
  const badgeWidth = 30;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(230, 240, 250);
  doc.roundedRect(badgeX, y - 6, badgeWidth, 10, 2, 2, "F");
  doc.setTextColor(50, 100, 150);
  doc.text(badgeText, badgeX + badgeWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y += 14;

  // Nom du salarié et rôle
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.salarie.prenom} ${data.salarie.nom}`, margin, y);
  
  // Badge rôle
  const roleText = data.salarie.isChef ? "Chef" : 
    data.salarie.role === "conducteur" ? "Conducteur" :
    data.salarie.role === "finisseur" ? "Finisseur" :
    data.salarie.role === "grutier" ? "Grutier" :
    data.salarie.role === "interimaire" ? "Intérimaire" : "Maçon";
  
  const roleWidth = doc.getTextWidth(roleText) + 8;
  const roleX = margin + doc.getTextWidth(`${data.salarie.prenom} ${data.salarie.nom}`) + 10;
  
  doc.setFontSize(9);
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(roleX, y - 5, roleWidth, 7, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.text(roleText, roleX + roleWidth / 2, y - 1, { align: "center" });

  y += 6;

  // Agence intérim si applicable
  if (data.salarie.agence_interim) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Agence: ${data.salarie.agence_interim}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // Date de génération
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 15;

  // === SECTION RÉSUMÉ ===
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Résumé de la période", margin, y);
  y += 8;

  // Cartes de résumé
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 25;
  const summaryItems = [
    { label: "Heures totales", value: `${data.summary.totalHeures}h`, color: [59, 130, 246] },
    { label: "Intempéries", value: `${data.summary.totalIntemperies}h`, color: [14, 165, 233] },
    { label: "Paniers", value: `${data.summary.totalPaniers}`, color: [249, 115, 22] },
    { label: "Trajets", value: `${data.summary.totalTrajets}`, color: [34, 197, 94] },
  ];

  summaryItems.forEach((item, idx) => {
    const x = margin + idx * (cardWidth + 5);
    
    // Fond de carte
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "F");
    
    // Bordure colorée à gauche
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(x, y + 2, 3, cardHeight - 4, "F");
    
    // Valeur
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(item.value, x + cardWidth / 2 + 2, y + 11, { align: "center" });
    
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, x + cardWidth / 2 + 2, y + 19, { align: "center" });
  });

  doc.setTextColor(0, 0, 0);
  y += cardHeight + 12;

  // === LISTE DES CHANTIERS TRAVAILLÉS ===
  const chantiersSet = new Set(data.dailyDetails.map(d => d.chantier));
  const chantiersList = Array.from(chantiersSet);

  if (chantiersList.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Chantiers travaillés", margin, y);
    y += 8;

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
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, "F");
      doc.text(`• ${chantier}`, margin + 3, y + 5.5);
      doc.text(`${heures}h`, pageWidth - margin - 15, y + 5.5, { align: "right" });
      y += 10;
    });
    
    y += 8;
  }

  // === TABLEAU DÉTAIL JOUR PAR JOUR ===
  checkPageBreak(40);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Détail jour par jour", margin, y);
  y += 10;

  // En-tête du tableau
  const colWidths = [26, 50, 20, 20, 22, 22, 20];
  const headers = ["Date", "Chantier", "Heures", "Intemp.", "Panier", "Trajet", "Absence"];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const startX = margin;

  doc.setFillColor(240, 240, 240);
  doc.rect(startX, y, tableWidth, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  
  let xPos = startX;
  headers.forEach((header, idx) => {
    doc.text(header, xPos + 2, y + 5.5);
    xPos += colWidths[idx];
  });
  y += 8;

  // Lignes du tableau
  doc.setFont("helvetica", "normal");
  let totals = { heures: 0, intemperies: 0, paniers: 0, trajets: 0 };

  data.dailyDetails.forEach((day, rowIdx) => {
    checkPageBreak(8);
    
    const isAbsent = day.heuresNormales === 0 && day.heuresIntemperies === 0;
    
    // Alternance de couleur
    if (rowIdx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(startX, y, tableWidth, 7, "F");
    }
    
    // Fond rouge si absent
    if (isAbsent && day.typeAbsence) {
      doc.setFillColor(255, 240, 240);
      doc.rect(startX, y, tableWidth, 7, "F");
    }

    xPos = startX;
    doc.setFontSize(7);

    // Date
    doc.text(format(new Date(day.date), "EEE dd/MM", { locale: fr }), xPos + 2, y + 5);
    xPos += colWidths[0];

    // Chantier (tronqué)
    const chantierText = day.chantier.length > 24 ? day.chantier.substring(0, 22) + "..." : day.chantier;
    doc.text(chantierText, xPos + 2, y + 5);
    xPos += colWidths[1];

    // Heures
    doc.text(isAbsent ? "-" : `${day.heuresNormales}h`, xPos + 8, y + 5, { align: "center" });
    xPos += colWidths[2];

    // Intempéries
    doc.text(day.heuresIntemperies > 0 ? `${day.heuresIntemperies}h` : "-", xPos + 8, y + 5, { align: "center" });
    xPos += colWidths[3];

    // Panier
    doc.text(day.panier ? "✓" : "-", xPos + 10, y + 5, { align: "center" });
    xPos += colWidths[4];

    // Trajet
    let trajetText = "-";
    if (day.trajetPerso) {
      trajetText = "Perso";
    } else if (day.codeTrajet && day.codeTrajet !== "A_COMPLETER") {
      trajetText = day.codeTrajet;
    }
    doc.text(trajetText, xPos + 10, y + 5, { align: "center" });
    xPos += colWidths[5];

    // Absence
    doc.text(day.typeAbsence || "-", xPos + 2, y + 5);

    // Totaux
    totals.heures += day.heuresNormales || 0;
    totals.intemperies += day.heuresIntemperies || 0;
    totals.paniers += day.panier ? 1 : 0;
    totals.trajets += (day.codeTrajet && day.codeTrajet !== "A_COMPLETER") ? 1 : 0;

    y += 7;
  });

  // Ligne de totaux
  checkPageBreak(12);
  y += 2;
  doc.setFillColor(230, 230, 230);
  doc.rect(startX, y, tableWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  xPos = startX;
  doc.text("TOTAL", xPos + 2, y + 5.5);
  xPos += colWidths[0] + colWidths[1];
  doc.text(`${totals.heures}h`, xPos + 8, y + 5.5, { align: "center" });
  xPos += colWidths[2];
  doc.text(totals.intemperies > 0 ? `${totals.intemperies}h` : "-", xPos + 8, y + 5.5, { align: "center" });
  xPos += colWidths[3];
  doc.text(`${totals.paniers}`, xPos + 10, y + 5.5, { align: "center" });
  xPos += colWidths[4];
  doc.text(`${totals.trajets}`, xPos + 10, y + 5.5, { align: "center" });

  y += 18;

  // === SECTION SIGNATURES ===
  const signatures = Object.entries(data.signaturesBySemaine);
  
  if (signatures.length > 0) {
    checkPageBreak(50);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Signatures", margin, y);
    y += 10;

    // Grouper les semaines à partir des dates des dailyDetails
    const weeksInPeriod = new Set<string>();
    data.dailyDetails.forEach(day => {
      const dateObj = new Date(day.date);
      const weekNumber = getISOWeek(dateObj);
      const year = getISOWeekYear(dateObj);
      weeksInPeriod.add(`${year}-S${weekNumber.toString().padStart(2, '0')}`);
    });

    Array.from(weeksInPeriod).sort().forEach((semaine) => {
      checkPageBreak(45);
      
      const signature = data.signaturesBySemaine[semaine];
      
      // Semaine badge
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 240, 250);
      doc.roundedRect(margin, y, 25, 7, 2, 2, "F");
      doc.text(semaine, margin + 12.5, y + 5, { align: "center" });

      if (signature && signature.signature_data) {
        // Badge "Signé"
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(margin + 30, y, 20, 7, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(22, 163, 74);
        doc.text("✓ Signé", margin + 40, y + 5, { align: "center" });
        doc.setTextColor(0, 0, 0);

        y += 12;

        // Cadre signature
        const sigBoxWidth = 60;
        const sigBoxHeight = 30;
        doc.setDrawColor(180, 180, 180);
        doc.rect(margin, y, sigBoxWidth, sigBoxHeight);

        try {
          doc.addImage(
            signature.signature_data,
            "PNG",
            margin + 2,
            y + 2,
            sigBoxWidth - 4,
            sigBoxHeight - 4
          );
        } catch (e) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("Signature numérique", margin + 5, y + 15);
        }

        // Date de signature
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Signé le ${format(new Date(signature.signed_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
          margin + sigBoxWidth + 10,
          y + 15
        );
        doc.setTextColor(0, 0, 0);

        y += sigBoxHeight + 8;
      } else {
        // Non signé
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(margin + 30, y, 25, 7, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 38);
        doc.text("✗ Non signé", margin + 42.5, y + 5, { align: "center" });
        doc.setTextColor(0, 0, 0);

        y += 15;
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
