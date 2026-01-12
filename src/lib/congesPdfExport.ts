import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DemandeConge } from "@/hooks/useDemandesConges";

interface CongesPdfOptions {
  entrepriseNom?: string;
  entrepriseLogo?: string;
}

// Types d'absence correspondant au formulaire papier
const typeCongeLabels: Record<string, string> = {
  CP: "Congés payés",
  RTT: "RTT",
  MALADIE: "Maladie",
  AUTRE: "Autre",
  SANS_SOLDE: "Congés sans solde",
  DECES: "Décès",
  NAISSANCE: "Naissance",
  MARIAGE: "Mariage",
  ABSENCE_AUTORISEE: "Absence autorisée",
  ABSENCE_RECUPEREE: "Absence récupérée",
  ABSENCE_SANS_SOLDE: "Absence sans solde",
};

export async function generateCongesPdf(
  demandes: DemandeConge[],
  options: CongesPdfOptions
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  for (let index = 0; index < demandes.length; index++) {
    const demande = demandes[index];
    if (index > 0) doc.addPage();

    const demandeurNom = demande.demandeur?.nom || "";
    const demandeurPrenom = demande.demandeur?.prenom || "";

    let y = margin + 5;

    // ========== CADRE GLOBAL DU FORMULAIRE ==========
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, pageHeight - 2 * margin);

    // ========== EN-TÊTE "Salarié" ==========
    doc.setFontSize(12);
    doc.setFont("helvetica", "bolditalic");
    doc.text("Salarié", margin + 5, y);
    // Soulignement
    const salarieWidth = doc.getTextWidth("Salarié");
    doc.setLineWidth(0.3);
    doc.line(margin + 5, y + 1, margin + 5 + salarieWidth, y + 1);

    y += 12;

    // ========== LIGNE 1: NOM + Date de la demande ==========
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    // NOM :
    doc.text("NOM :", margin + 5, y);
    // Ligne de soulignement pour NOM
    doc.setLineWidth(0.2);
    doc.line(margin + 20, y + 1, margin + 75, y + 1);
    // Valeur NOM
    doc.setFont("helvetica", "bold");
    doc.text(demandeurNom.toUpperCase(), margin + 22, y);
    
    // Date de la demande à droite
    doc.setFont("helvetica", "normal");
    doc.text("Date de la demande :", pageWidth - margin - 60, y);
    // Format date avec points
    const dateCreation = format(new Date(demande.created_at), "dd/MM/yyyy", { locale: fr });
    doc.text("..../.../.......", pageWidth - margin - 25, y);
    doc.setFont("helvetica", "bold");
    doc.text(dateCreation, pageWidth - margin - 24, y);

    y += 10;

    // ========== LIGNE 2: Prénom ==========
    doc.setFont("helvetica", "normal");
    doc.text("Prénom :", margin + 5, y);
    doc.setLineWidth(0.2);
    doc.line(margin + 25, y + 1, margin + 85, y + 1);
    doc.setFont("helvetica", "bold");
    doc.text(demandeurPrenom, margin + 27, y);

    y += 10;

    // ========== LIGNE 3: Site ==========
    doc.setFont("helvetica", "normal");
    doc.text("Site :", margin + 5, y);
    doc.setLineWidth(0.2);
    doc.line(margin + 17, y + 1, margin + 85, y + 1);
    doc.setFont("helvetica", "bold");
    doc.text((demande as any).site || "Senozan", margin + 19, y);

    y += 10;

    // ========== LIGNE 4: Nom du Supérieur ==========
    doc.setFont("helvetica", "normal");
    doc.text("Nom du Supérieur :", margin + 5, y);
    doc.setLineWidth(0.2);
    doc.line(margin + 45, y + 1, margin + 120, y + 1);
    // Le supérieur n'est pas stocké, on laisse vide
    
    y += 15;

    // ========== SÉPARATEUR SECTION TYPE D'ABSENCE ==========
    doc.setLineWidth(0.3);
    doc.line(margin + 5, y, pageWidth - margin - 5, y);
    
    y += 8;

    // ========== TYPES D'ABSENCE (disposition exacte du formulaire papier) ==========
    const checkboxSize = 4;
    const col1X = margin + 5;
    const col2X = margin + 55;
    const col3X = margin + 95;
    const col4X = margin + 145;

    // Fonction pour dessiner une case à cocher
    const drawCheckbox = (x: number, yPos: number, checked: boolean, label: string) => {
      doc.setLineWidth(0.3);
      doc.rect(x, yPos - 3.5, checkboxSize, checkboxSize);
      if (checked) {
        doc.setFont("helvetica", "bold");
        doc.text("X", x + 0.8, yPos);
        doc.setFont("helvetica", "normal");
      }
      doc.text(label, x + checkboxSize + 2, yPos);
    };

    // Ligne 1: Congés payés | RTT | "Congés exceptionnels *:" Décès
    drawCheckbox(col1X, y, demande.type_conge === "CP", "Congés payés");
    drawCheckbox(col2X, y, demande.type_conge === "RTT", "RTT");
    
    // En-tête "Congés exceptionnels *:" sans checkbox
    doc.setFont("helvetica", "italic");
    doc.text("Congés exceptionnels * :", col3X, y);
    doc.setFont("helvetica", "normal");
    drawCheckbox(col4X, y, demande.type_conge === "DECES", "Décès");

    y += 8;

    // Ligne 2: Congés sans solde | (vide) | Naissance
    drawCheckbox(col1X, y, demande.type_conge === "SANS_SOLDE", "Congés sans solde");
    drawCheckbox(col4X, y, demande.type_conge === "NAISSANCE", "Naissance");

    y += 8;

    // Ligne 3: Absence autorisée : | Absence récupérée | Absence sans solde | Mariage
    doc.text("Absence autorisée :", col1X, y);
    drawCheckbox(col2X, y, false, "Absence récupérée");
    drawCheckbox(col3X, y, false, "Absence sans solde");
    drawCheckbox(col4X, y, false, "Mariage");

    y += 8;

    // Si type non standard (MALADIE, AUTRE), afficher sur une ligne supplémentaire
    if (demande.type_conge === "MALADIE" || demande.type_conge === "AUTRE") {
      drawCheckbox(col1X, y, true, typeCongeLabels[demande.type_conge] || demande.type_conge);
      y += 8;
    }

    y += 10;

    // ========== DATES DE L'ABSENCE ==========
    doc.setLineWidth(0.3);
    doc.line(margin + 5, y, pageWidth - margin - 5, y);
    
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Date de l'absence :", margin + 5, y);
    
    // du : ../../....
    doc.text("du :", margin + 50, y);
    doc.text("..../.../.......", margin + 58, y);
    const dateDebut = format(new Date(demande.date_debut), "dd/MM/yyyy", { locale: fr });
    doc.setFont("helvetica", "bold");
    doc.text(dateDebut, margin + 59, y);
    
    // au : ../../....
    doc.setFont("helvetica", "normal");
    doc.text("au :", margin + 100, y);
    doc.text("..../.../.......", margin + 108, y);
    const dateFin = format(new Date(demande.date_fin), "dd/MM/yyyy", { locale: fr });
    doc.setFont("helvetica", "bold");
    doc.text(dateFin, margin + 109, y);

    y += 15;

    // ========== MOTIF (si présent) ==========
    if (demande.motif) {
      doc.setFont("helvetica", "normal");
      doc.text("Motif :", margin + 5, y);
      doc.setLineWidth(0.2);
      doc.line(margin + 20, y + 1, pageWidth - margin - 10, y + 1);
      
      // Texte du motif
      const motifLines = doc.splitTextToSize(demande.motif, contentWidth - 30);
      doc.text(motifLines[0] || "", margin + 22, y);
      y += 10;
    }

    y += 5;

    // ========== ZONE SIGNATURE ==========
    doc.setLineWidth(0.3);
    doc.line(margin + 5, y, pageWidth - margin - 5, y);
    
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Signature du Salarié :", margin + 5, y);

    // Rectangle bleu clair pour la signature (comme sur le formulaire)
    const signatureBoxX = margin + 50;
    const signatureBoxY = y - 5;
    const signatureBoxWidth = 60;
    const signatureBoxHeight = 30;
    
    doc.setFillColor(220, 235, 250); // Bleu très clair
    doc.setDrawColor(180, 200, 220);
    doc.setLineWidth(0.3);
    doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight, "FD");

    // Ajouter la signature si présente
    if (demande.signature_data) {
      try {
        doc.addImage(
          demande.signature_data,
          "PNG",
          signatureBoxX + 2,
          signatureBoxY + 2,
          signatureBoxWidth - 4,
          signatureBoxHeight - 4
        );
      } catch (e) {
        console.error("Erreur ajout signature:", e);
      }
    }

    y += signatureBoxHeight + 10;

    // ========== BADGE VALIDÉ (si validée RH) ==========
    if (demande.statut === "VALIDEE_RH" && demande.validee_par_rh_at) {
      doc.setFillColor(34, 197, 94); // Vert
      doc.roundedRect(pageWidth - margin - 50, y - 5, 45, 12, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("VALIDÉE RH", pageWidth - margin - 45, y + 2);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const dateValidation = format(new Date(demande.validee_par_rh_at), "dd/MM/yyyy", { locale: fr });
      doc.text(`le ${dateValidation}`, pageWidth - margin - 45, y + 10);
    }

    // ========== NOTE BAS DE PAGE ==========
    const noteY = pageHeight - margin - 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("*", margin + 5, noteY);
    doc.setFont("helvetica", "italic");
    doc.text("pièces justificatives à fournir impérativement", margin + 8, noteY);
  }

  // Nom du fichier
  const fileName =
    demandes.length === 1
      ? `demande-conge-${demandes[0].demandeur?.nom?.toLowerCase() || "employe"}.pdf`
      : `demandes-conges-validees-${format(new Date(), "yyyy-MM-dd")}.pdf`;

  doc.save(fileName);
}
