import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DayDetail {
  date: string;
  chantier: string;
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

export function generateWeekDetailPdf(
  employeeName: string,
  semaine: string,
  days: DayDetail[],
  signature?: SignatureData
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // === EN-TÊTE ===
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Fiche horaire", margin, y);
  
  // Badge semaine
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const badgeX = pageWidth - margin - 25;
  doc.setFillColor(230, 240, 250);
  doc.roundedRect(badgeX, y - 6, 25, 10, 2, 2, "F");
  doc.setTextColor(50, 100, 150);
  doc.text(semaine, badgeX + 12.5, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y += 12;

  // Nom de l'employé
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(employeeName, margin, y);
  y += 8;

  // Date de génération
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 15;

  // === TABLEAU ===
  const colWidths = [28, 50, 22, 22, 25, 22, 16];
  const headers = ["Date", "Chantier", "Heures", "Panier", "Trajets", "Intemp.", "Abs."];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const startX = margin;

  // En-tête du tableau
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, y, tableWidth, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  
  let xPos = startX;
  headers.forEach((header, idx) => {
    doc.text(header, xPos + 2, y + 5.5);
    xPos += colWidths[idx];
  });
  y += 8;

  // Lignes du tableau
  doc.setFont("helvetica", "normal");
  
  let totals = { heuresNormales: 0, heuresIntemperies: 0, paniers: 0, trajets: 0 };

  days.forEach((day, rowIdx) => {
    const isAbsent = day.heuresNormales === 0 && day.heuresIntemperies === 0;
    
    // Ligne alternée
    if (rowIdx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(startX, y, tableWidth, 7, "F");
    }
    
    // Ligne rouge si absent
    if (isAbsent) {
      doc.setFillColor(255, 245, 245);
      doc.rect(startX, y, tableWidth, 7, "F");
    }

    xPos = startX;
    doc.setFontSize(8);

    // Date
    doc.text(format(new Date(day.date), "EEE dd/MM", { locale: fr }), xPos + 2, y + 5);
    xPos += colWidths[0];

    // Chantier (tronqué si trop long)
    const chantierText = day.chantier.length > 22 ? day.chantier.substring(0, 20) + "..." : day.chantier;
    doc.text(chantierText, xPos + 2, y + 5);
    xPos += colWidths[1];

    // Heures
    doc.text(isAbsent ? "Absent" : `${day.heuresNormales}h`, xPos + 2, y + 5);
    xPos += colWidths[2];

    // Panier
    doc.text(day.panier ? "✓" : "-", xPos + 8, y + 5);
    xPos += colWidths[3];

    // Trajets
    let trajetText = "-";
    if (day.trajetPerso) {
      trajetText = "Perso";
    } else if (day.codeTrajet && day.codeTrajet !== "" && day.codeTrajet !== "A_COMPLETER") {
      trajetText = day.codeTrajet;
    } else if (day.codeTrajet === "A_COMPLETER") {
      trajetText = "À compléter";
    }
    doc.text(trajetText, xPos + 2, y + 5);
    xPos += colWidths[4];

    // Intempéries
    doc.text(day.heuresIntemperies > 0 ? `${day.heuresIntemperies}h` : "-", xPos + 8, y + 5);
    xPos += colWidths[5];

    // Absence
    doc.text(day.typeAbsence || "-", xPos + 2, y + 5);

    // Totaux
    totals.heuresNormales += day.heuresNormales || 0;
    totals.heuresIntemperies += day.heuresIntemperies || 0;
    totals.paniers += day.panier ? 1 : 0;
    totals.trajets += (day.codeTrajet && day.codeTrajet !== "A_COMPLETER") ? 1 : 0;

    y += 7;
  });

  // Ligne de totaux
  y += 2;
  doc.setFillColor(230, 230, 230);
  doc.rect(startX, y, tableWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  xPos = startX;
  doc.text("TOTAL", xPos + 2, y + 5.5);
  xPos += colWidths[0] + colWidths[1];
  doc.text(`${totals.heuresNormales}h`, xPos + 2, y + 5.5);
  xPos += colWidths[2];
  doc.text(`${totals.paniers}`, xPos + 8, y + 5.5);
  xPos += colWidths[3];
  doc.text(`${totals.trajets}`, xPos + 8, y + 5.5);
  xPos += colWidths[4];
  doc.text(totals.heuresIntemperies > 0 ? `${totals.heuresIntemperies}h` : "-", xPos + 8, y + 5.5);

  y += 18;

  // === SECTION SIGNATURE ===
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Signature de l'employé", margin, y);
  y += 10;

  if (signature && signature.signature_data) {
    // Cadre pour la signature
    const sigBoxWidth = 70;
    const sigBoxHeight = 35;
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, y, sigBoxWidth, sigBoxHeight);

    // Intégrer l'image de signature (base64)
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
      // Si l'image ne peut pas être ajoutée, afficher un message
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Signature numérique", margin + 5, y + 18);
    }

    // Informations de signature à droite
    const infoX = margin + sigBoxWidth + 10;
    
    // Badge "Signé"
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(infoX, y, 25, 8, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("✓ Signé", infoX + 12.5, y + 5.5, { align: "center" });
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
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(margin, y, 70, 35);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Non signé", margin + 25, y + 20);
    doc.setTextColor(0, 0, 0);

    // Badge "Non signé"
    const infoX = margin + 80;
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(infoX, y, 30, 8, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("✗ Non signé", infoX + 15, y + 5.5, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // === PIED DE PAGE ===
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Document généré automatiquement - ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Sauvegarder le PDF
  const fileName = `fiche-${employeeName.replace(/\s+/g, "_")}-${semaine}.pdf`;
  doc.save(fileName);
}
