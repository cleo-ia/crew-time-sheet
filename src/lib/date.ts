import { addDays, format, startOfYear, getDay, addWeeks } from "date-fns";

/**
 * Formate un timestamp UTC en heure de Paris (Europe/Paris)
 * Gère automatiquement le changement heure d'été/hiver
 */
export const formatTimestampParis = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Convertit un nom de jour et un weekId au format "YYYY-S##" en date locale "yyyy-MM-dd"
 * Cette fonction garantit que les dates sont calculées de manière cohérente en local
 * sans conversion UTC, évitant ainsi les décalages de dates.
 */
export const dayNameToDate = (
  weekId: string,
  dayName: "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi" | "Dimanche"
): string => {
  // weekId format: "2025-S43" ou "2025-W43"
  // Extraire l'année et le numéro de semaine
  const match = weekId.match(/^(\d{4})-(W|S)(\d{2})$/);
  
  if (!match) {
    console.error(`❌ Format de weekId invalide: ${weekId}`);
    throw new Error(`Format de weekId invalide: ${weekId}`);
  }
  
  const year = parseInt(match[1]);
  const weekNumber = parseInt(match[3]);
  
  // Trouver le premier lundi de l'année (ou le dernier lundi de l'année précédente si nécessaire)
  const firstDayOfYear = startOfYear(new Date(year, 0, 1));
  const dayOfWeek = getDay(firstDayOfYear); // 0=dimanche, 1=lundi, ..., 6=samedi
  
  // Calculer le nombre de jours jusqu'au premier lundi
  // Si le 1er janvier est un lundi (1), offset = 0
  // Si c'est un mardi (2), on recule de 1 jour pour trouver le lundi précédent
  // Si c'est un dimanche (0), on recule de 6 jours
  let daysToFirstMonday;
  if (dayOfWeek === 0) {
    // Dimanche
    daysToFirstMonday = 1;
  } else if (dayOfWeek === 1) {
    // Lundi
    daysToFirstMonday = 0;
  } else {
    // Mardi à Samedi
    daysToFirstMonday = -(dayOfWeek - 1);
  }
  
  const firstMonday = addDays(firstDayOfYear, daysToFirstMonday);
  
  // Calculer le lundi de la semaine cible (semaine 1 = premier lundi)
  const mondayOfTargetWeek = addWeeks(firstMonday, weekNumber - 1);
  
  // Index du jour de la semaine (0=Lundi, 6=Dimanche)
  const dayIndex = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].indexOf(dayName);
  const targetDate = addDays(mondayOfTargetWeek, dayIndex);
  
  // Retourner au format "yyyy-MM-dd" local (pas de conversion UTC)
  return format(targetDate, "yyyy-MM-dd");
};
