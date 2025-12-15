import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChantierForecast } from "@/hooks/useWeeklyForecast";
import { getWeatherInfo } from "@/lib/weatherUtils";

function getWeatherEmoji(code: number): string {
  const emojiMap: Record<number, string> = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌧️",
    53: "🌧️",
    55: "🌧️",
    56: "🌨️",
    57: "🌨️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    66: "🌨️",
    67: "🌨️",
    71: "❄️",
    73: "❄️",
    75: "❄️",
    77: "❄️",
    80: "🌦️",
    81: "🌦️",
    82: "🌦️",
    85: "🌨️",
    86: "🌨️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
  };
  return emojiMap[code] || "❓";
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
    if (y + rowHeight > pageHeight - margin) {
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

        // Weather emoji
        doc.setFontSize(10);
        doc.text(getWeatherEmoji(forecast.weatherCode), cellCenterX, y + 5, { align: "center" });

        // Temperature
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`${forecast.temperatureMin}° / ${forecast.temperatureMax}°`, cellCenterX, y + 10, { align: "center" });

        // Wind gusts
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(107, 114, 128);
        doc.text(`💨 ${forecast.windGustsMax} km/h`, cellCenterX, y + 14, { align: "center" });

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

  // Legend
  y += 5;
  if (y + 15 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

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
