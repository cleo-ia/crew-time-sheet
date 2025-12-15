import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function generateWeatherPdf(
  tableElement: HTMLElement,
  weekLabel: string
): Promise<void> {
  // Capture the table element as an image using html2canvas
  const canvas = await html2canvas(tableElement, {
    scale: 2, // Higher resolution for print quality
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  
  // Calculate dimensions for A4 landscape
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  // Title
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Prévisions Météo - ${weekLabel}`, pageWidth / 2, 15, { align: "center" });

  // Generation date
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, 21, { align: "center" });

  // Calculate image dimensions to fit within page
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - 30 - margin; // 30mm for header
  
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
  
  const scaledWidth = imgWidth * ratio;
  const scaledHeight = imgHeight * ratio;
  
  // Center the image horizontally
  const xOffset = (pageWidth - scaledWidth) / 2;

  // Add the captured image to PDF
  pdf.addImage(imgData, "PNG", xOffset, 28, scaledWidth, scaledHeight);

  pdf.save(`previsions-meteo-${weekLabel.replace(/\s/g, "-")}.pdf`);
}
