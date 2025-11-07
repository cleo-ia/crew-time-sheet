import { addDays, format } from "date-fns";
import { parseISOWeek } from "./weekUtils";
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
 * Utilise le calcul ISO (lundi comme début de semaine) pour être 100% cohérent
 * avec parseISOWeek utilisé partout ailleurs (Index.tsx, weekUtils, etc.).
 */
export const dayNameToDate = (
  weekId: string,
  dayName: "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi" | "Dimanche"
): string => {
  try {
    // Alignement strict avec l'ISO week employé dans toute l'app
    const monday: Date = parseISOWeek(weekId);

    const dayIndexMap: Record<string, number> = {
      Lundi: 0,
      Mardi: 1,
      Mercredi: 2,
      Jeudi: 3,
      Vendredi: 4,
      Samedi: 5,
      Dimanche: 6,
    };

    const offset = dayIndexMap[dayName] ?? 0;
    const targetDate = addDays(monday, offset);
    return format(targetDate, "yyyy-MM-dd");
  } catch (e) {
    console.error(`❌ dayNameToDate: weekId invalide (${weekId}) ou erreur de calcul`, e);
    throw e;
  }
};
