import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChantierForecast } from "@/hooks/useWeeklyForecast";

function drawWeatherIcon(doc: jsPDF, code: number, x: number, y: number): void {
  const resetColors = () => {
    doc.setFillColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  };

  // Soleil (codes 0-1)
  if (code <= 1) {
    doc.setFillColor(251, 191, 36); // Jaune
    doc.circle(x, y, 1.5, 'F');
    // Rayons
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.3);
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      doc.line(
        x + Math.cos(angle) * 2,
        y + Math.sin(angle) * 2,
        x + Math.cos(angle) * 3,
        y + Math.sin(angle) * 3
      );
    }
    doc.setLineWidth(0.2);
  }
  // Nuageux (codes 2-3)
  else if (code <= 3) {
    doc.setFillColor(156, 163, 175); // Gris
    doc.circle(x - 1, y, 1.3, 'F');
    doc.circle(x + 1, y, 1.5, 'F');
    doc.circle(x, y - 0.5, 1.1, 'F');
  }
  // Brouillard (codes 45, 48)
  else if (code === 45 || code === 48) {
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.4);
    doc.line(x - 2.5, y - 1, x + 2.5, y - 1);
    doc.line(x - 3, y, x + 3, y);
    doc.line(x - 2.5, y + 1, x + 2.5, y + 1);
    doc.setLineWidth(0.2);
  }
  // Pluie (codes 51-67, 80-82)
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    // Nuage gris
    doc.setFillColor(107, 114, 128);
    doc.circle(x - 1, y - 0.8, 1.1, 'F');
    doc.circle(x + 1, y - 0.8, 1.3, 'F');
    doc.circle(x, y - 1.2, 0.9, 'F');
    // Gouttes bleues
    doc.setFillColor(59, 130, 246);
    doc.circle(x - 1, y + 1.5, 0.5, 'F');
    doc.circle(x + 0.5, y + 2, 0.5, 'F');
    doc.circle(x + 1.5, y + 1.2, 0.4, 'F');
  }
  // Neige (codes 71-77, 85-86)
  else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    // Nuage bleu clair
    doc.setFillColor(147, 197, 253);
    doc.circle(x - 1, y - 0.8, 1.1, 'F');
    doc.circle(x + 1, y - 0.8, 1.3, 'F');
    doc.circle(x, y - 1.2, 0.9, 'F');
    // Flocons (petits cercles blancs)
    doc.setFillColor(255, 255, 255);
    doc.circle(x - 1, y + 1.5, 0.4, 'F');
    doc.circle(x + 0.5, y + 2, 0.4, 'F');
    doc.circle(x + 1.5, y + 1.2, 0.4, 'F');
  }
  // Orage (codes 95-99)
  else if (code >= 95) {
    // Nuage sombre
    doc.setFillColor(75, 85, 99);
    doc.circle(x - 1, y - 0.8, 1.1, 'F');
    doc.circle(x + 1, y - 0.8, 1.3, 'F');
    doc.circle(x, y - 1.2, 0.9, 'F');
    // Éclair jaune
    doc.setFillColor(251, 191, 36);
    doc.triangle(x, y + 0.5, x - 0.6, y + 2, x + 0.6, y + 2, 'F');
  }
  // Défaut (inconnu)
  else {
    doc.setFillColor(156, 163, 175);
    doc.circle(x, y, 1.5, 'F');
  }

  resetColors();
}

function drawWeatherLegend(doc: jsPDF, x: number, y: number): void {
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Légende météo :", x, y);
  
  doc.setFont("helvetica", "normal");
  y += 5;

  // Soleil
  drawWeatherIcon(doc, 0, x + 3, y);
  doc.text("Soleil", x + 8, y + 1);

  // Nuageux
  drawWeatherIcon(doc, 3, x + 28, y);
  doc.text("Nuageux", x + 33, y + 1);

  // Pluie
  drawWeatherIcon(doc, 61, x + 58, y);
  doc.text("Pluie", x + 63, y + 1);

  // Neige
  drawWeatherIcon(doc, 71, x + 83, y);
  doc.text("Neige", x + 88, y + 1);

  // Orage
  drawWeatherIcon(doc, 95, x + 108, y);
  doc.text("Orage", x + 113, y + 1);

  // Brouillard
  drawWeatherIcon(doc, 45, x + 133, y);
  doc.text("Brouillard", x + 138, y + 1);
}

export function generateWeatherPdf(
  forecasts: ChantierForecast[],
  weekLabel: string
): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Prévisions Météo - ${weekLabel}`, pageWidth / 2, 15, { align: "center" });

  // Date de génération
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, 21, { align: "center" });

  // Get dates from first forecast with data
  const firstWithData = forecasts.find(f => f.forecasts.length > 0);
  if (!firstWithData) {
    doc.setFontSize(12);
    doc.text("Aucune donnée météo disponible", pageWidth / 2, 50, { align: "center" });
    doc.save(`previsions-meteo-${weekLabel}.pdf`);
    return;
  }

  const dates = firstWithData.forecasts.map(f => f.date);

  // Table setup
  const startY = 28;
  const colWidths = {
    chantier: 40,
    code: 22,
    conducteur: 30,
    day: (pageWidth - margin * 2 - 40 - 22 - 30) / 5,
  };
  const rowHeight = 22;

  // Header row
  let x = margin;
  let y = startY;

  doc.setFillColor(245, 158, 11); // Orange
  doc.rect(x, y, pageWidth - margin * 2, 8, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  doc.text("Chantier", x + 2, y + 5.5);
  x += colWidths.chantier;
  doc.text("Code", x + 2, y + 5.5);
  x += colWidths.code;
  doc.text("Conducteur", x + 2, y + 5.5);
  x += colWidths.conducteur;

  dates.forEach((date) => {
    const dayLabel = format(parseISO(date), "EEE dd/MM", { locale: fr });
    doc.text(dayLabel, x + colWidths.day / 2, y + 5.5, { align: "center" });
    x += colWidths.day;
  });

  y += 8;
  doc.setTextColor(0, 0, 0);

  // Data rows
  forecasts.forEach((chantier, rowIndex) => {
    if (y + rowHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin;
    }

    x = margin;

    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(x, y, pageWidth - margin * 2, rowHeight, "F");
    }

    // Border
    doc.setDrawColor(229, 231, 235);
    doc.rect(x, y, pageWidth - margin * 2, rowHeight, "S");

    // Chantier name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const chantierName = chantier.chantierNom.length > 20 
      ? chantier.chantierNom.substring(0, 18) + "..." 
      : chantier.chantierNom;
    doc.text(chantierName, x + 2, y + 6);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(chantier.ville || "-", x + 2, y + 11);
    doc.setTextColor(0, 0, 0);

    x += colWidths.chantier;

    // Code
    doc.setFontSize(7);
    doc.text(chantier.codeChantier || "-", x + 2, y + 8);
    x += colWidths.code;

    // Conducteur
    doc.setFontSize(6);
    const conducteurName = chantier.conducteurNom 
      ? (chantier.conducteurNom.length > 15 ? chantier.conducteurNom.substring(0, 13) + "..." : chantier.conducteurNom)
      : "-";
    doc.text(conducteurName, x + 2, y + 8);
    x += colWidths.conducteur;

    // Forecasts per day
    if (chantier.error) {
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(7);
      doc.text(chantier.error, x + 2, y + 10);
      doc.setTextColor(0, 0, 0);
    } else {
      chantier.forecasts.forEach((forecast) => {
        const cellCenterX = x + colWidths.day / 2;

        // Weather icon (geometric shape)
        drawWeatherIcon(doc, forecast.weatherCode, cellCenterX, y + 4);

        // Temperature
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`${forecast.temperatureMin}° / ${forecast.temperatureMax}°`, cellCenterX, y + 10, { align: "center" });

        // Wind gusts
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(107, 114, 128);
        doc.text(`Vent: ${forecast.windGustsMax} km/h`, cellCenterX, y + 14, { align: "center" });

        // Precipitation probability with color
        const prob = forecast.precipitationProbabilityMax;
        if (prob > 60) {
          doc.setTextColor(220, 38, 38); // Red
        } else if (prob > 30) {
          doc.setTextColor(234, 88, 12); // Orange
        } else {
          doc.setTextColor(22, 163, 74); // Green
        }
        doc.text(`${prob}%`, cellCenterX, y + 18, { align: "center" });

        // Precipitation amount
        doc.setTextColor(59, 130, 246); // Blue
        doc.text(`${forecast.precipitationSum} mm`, cellCenterX, y + 21, { align: "center" });

        doc.setTextColor(0, 0, 0);
        x += colWidths.day;
      });
    }

    y += rowHeight;
  });

  // Legend section
  y += 5;
  if (y + 20 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  // Weather legend
  drawWeatherLegend(doc, margin, y);

  y += 12;

  // Precipitation probability legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Légende probabilité précipitations :", margin, y);
  
  doc.setFont("helvetica", "normal");
  y += 4;
  doc.setTextColor(22, 163, 74);
  doc.text("● 0-30% Faible", margin, y);
  doc.setTextColor(234, 88, 12);
  doc.text("● 30-60% Modéré", margin + 30, y);
  doc.setTextColor(220, 38, 38);
  doc.text("● >60% Élevé", margin + 60, y);
  doc.setTextColor(0, 0, 0);

  doc.save(`previsions-meteo-${weekLabel.replace(/\s/g, "-")}.pdf`);
}
