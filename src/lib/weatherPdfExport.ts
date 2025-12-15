import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function generateWeatherPdf(
  tableElement: HTMLElement,
  weekLabel: string
): Promise<void> {
  // Dynamic import to avoid circular dependency issues
  const html2canvas = (await import("html2canvas")).default;
  
  const canvas = await html2canvas(tableElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Prévisions Météo - " + weekLabel, pageWidth / 2, 15, { align: "center" });

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Généré le " + format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr }), pageWidth / 2, 21, { align: "center" });

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - 30 - margin;
  
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
  
  const scaledWidth = imgWidth * ratio;
  const scaledHeight = imgHeight * ratio;
  
  const xOffset = (pageWidth - scaledWidth) / 2;

  pdf.addImage(imgData, "PNG", xOffset, 28, scaledWidth, scaledHeight);

  pdf.save("previsions-meteo-" + weekLabel.replace(/\s/g, "-") + ".pdf");
}
