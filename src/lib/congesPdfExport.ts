import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DemandeConge } from "@/hooks/useDemandesConges";

interface CongesPdfOptions {
  entrepriseNom?: string;
  entrepriseLogo?: string;
}

const typeCongeOptions = [
  { value: "CP", label: "C.P." },
  { value: "RTT", label: "R.T.T." },
  { value: "DECES", label: "Décès" },
  { value: "NAISSANCE", label: "Naissance" },
  { value: "MARIAGE", label: "Mariage" },
  { value: "SANS_SOLDE", label: "Sans solde" },
  { value: "ABSENCE_AUTORISEE", label: "Absence autorisée" },
  { value: "ABSENCE_RECUPEREE", label: "Absence récupérée" },
  { value: "MALADIE", label: "Maladie" },
  { value: "AUTRE", label: "Autre" },
];

export async function generateCongesPdf(
  demandes: DemandeConge[],
  options: CongesPdfOptions
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  for (let index = 0; index < demandes.length; index++) {
    const demande = demandes[index];
    if (index > 0) doc.addPage();

    let y = 15;

    // === Logo en haut à gauche (ratio préservé ~1.2:1) ===
    if (options.entrepriseLogo) {
      try {
        // Logo avec ratio préservé (image source environ 600x500 = 1.2:1)
        const logoHeight = 25;
        const logoWidth = 30; // 25 * 1.2
        doc.addImage(options.entrepriseLogo, "PNG", margin, y, logoWidth, logoHeight);
      } catch (e) {
        // Ignore logo errors
      }
    }

    y += 22; // Espace après le logo

    // === Titre centré en dessous du logo ===
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102); // Bleu foncé
    const title = "DEMANDE AUTORISATION D'ABSENCE OU CONGÉ";
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, y);
    doc.setTextColor(0, 0, 0); // Reset couleur

    y += 12;

    // === Cadre principal ===
    const boxStartY = y;
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);

    // Section Salarié
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NOM :", margin + 5, y + 8);
    doc.setFont("helvetica", "normal");
    const demandeurName = demande.demandeur?.nom?.toUpperCase() || "";
    doc.text(demandeurName, margin + 25, y + 8);

    doc.setFont("helvetica", "bold");
    doc.text("Prénom :", margin + 5, y + 16);
    doc.setFont("helvetica", "normal");
    doc.text(demande.demandeur?.prenom || "", margin + 30, y + 16);

    doc.setFont("helvetica", "bold");
    doc.text("Date :", margin + contentWidth / 2, y + 8);
    doc.setFont("helvetica", "normal");
    doc.text(
      format(new Date(demande.created_at), "dd/MM/yyyy", { locale: fr }),
      margin + contentWidth / 2 + 20,
      y + 8
    );

    y += 25;

    // === Types d'absence ===
    doc.setFont("helvetica", "bold");
    doc.text("Type d'absence :", margin + 5, y);
    doc.setLineWidth(0.3);
    doc.line(margin + 5, y + 1, margin + 50, y + 1); // Underline
    y += 8;

    doc.setFont("helvetica", "normal");
    const checkboxSize = 4;
    const col1X = margin + 5;
    const col2X = margin + contentWidth / 2;

    typeCongeOptions.forEach((type, idx) => {
      const x = idx % 2 === 0 ? col1X : col2X;
      const rowY = y + Math.floor(idx / 2) * 8;

      // Checkbox
      doc.rect(x, rowY - 3, checkboxSize, checkboxSize);
      if (demande.type_conge === type.value) {
        // Remplir la case
        doc.setFillColor(34, 197, 94); // green-500
        doc.rect(x, rowY - 3, checkboxSize, checkboxSize, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("✓", x + 0.8, rowY);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
      }

      doc.text(type.label, x + checkboxSize + 3, rowY);
    });

    y += Math.ceil(typeCongeOptions.length / 2) * 8 + 5;

    // === Dates Du / Au ===
    doc.setFont("helvetica", "bold");
    doc.text("Du :", margin + 5, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      format(new Date(demande.date_debut), "dd/MM/yyyy", { locale: fr }),
      margin + 18,
      y
    );

    doc.setFont("helvetica", "bold");
    doc.text("Au :", margin + 60, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      format(new Date(demande.date_fin), "dd/MM/yyyy", { locale: fr }),
      margin + 73,
      y
    );

    y += 12;

    // === Motif ===
    if (demande.motif) {
      doc.setFont("helvetica", "bold");
      doc.text("Motif :", margin + 5, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      // Wrap text if too long
      const motifLines = doc.splitTextToSize(demande.motif, contentWidth - 10);
      doc.text(motifLines, margin + 5, y);
      y += motifLines.length * 5 + 5;
    }

    // === Signature ===
    doc.setFont("helvetica", "bold");
    doc.text("Signature du salarié :", margin + 5, y);
    y += 5;

    if (demande.signature_data) {
      try {
        doc.addImage(demande.signature_data, "PNG", margin + 5, y, 40, 20);
      } catch (e) {
        doc.setFont("helvetica", "italic");
        doc.text("Signature non disponible", margin + 5, y + 10);
      }
    } else {
      doc.rect(margin + 5, y, 40, 20);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Non signée", margin + 15, y + 12);
      doc.setFontSize(10);
    }

    // === Badge Validée ===
    const badgeX = margin + contentWidth - 45;
    const badgeY = y;
    
    // Badge vert
    doc.setFillColor(34, 197, 94); // green-500
    doc.roundedRect(badgeX, badgeY, 40, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("✓ Validée", badgeX + 8, badgeY + 7);
    doc.setTextColor(0, 0, 0);

    // Date de validation
    if (demande.validee_par_rh_at) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `Le ${format(new Date(demande.validee_par_rh_at), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
        badgeX,
        badgeY + 16
      );
      doc.setFontSize(10);
    }

    y += 30;

    // Dessiner le cadre autour de tout le contenu
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.rect(margin, boxStartY - 5, contentWidth, y - boxStartY + 5);
  }

  // Nom du fichier
  const fileName =
    demandes.length === 1
      ? `demande-conge-${demandes[0].demandeur?.nom?.toLowerCase() || "employe"}.pdf`
      : `demandes-conges-validees-${format(new Date(), "yyyy-MM-dd")}.pdf`;

  doc.save(fileName);
}
