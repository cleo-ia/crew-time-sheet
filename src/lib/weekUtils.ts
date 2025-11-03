import { parse, startOfISOWeek, addWeeks, format } from "date-fns";

/**
 * Convertit une semaine au format ISO (YYYY-Sww ou YYYY-Www) en Date (lundi de cette semaine)
 * @param weekString Format: "2025-S42" ou "2025-W42"
 * @returns Date du lundi de la semaine ISO 8601
 */
export const parseISOWeek = (weekString: string): Date => {
  const normalized = weekString.replace("-S", "-W"); // supporte "S" et "W"
  const parsed = parse(normalized, "RRRR-'W'II", new Date());
  return startOfISOWeek(parsed);
};

/**
 * Retourne la semaine ISO actuelle au format YYYY-Sww
 * @returns Semaine actuelle au format "2025-S42"
 */
export const getCurrentWeek = (): string => {
  return format(new Date(), "RRRR-'S'II");
};

/**
 * Calcule la semaine suivante au format ISO (YYYY-Sww)
 * Gère automatiquement le passage d'année (S52 → S01)
 * @param currentWeek Format: "2025-S42"
 * @returns Semaine suivante au format "2025-S43" (ou "2026-S01" si passage d'année)
 */
export const getNextWeek = (currentWeek: string): string => {
  const currentDate = parseISOWeek(currentWeek);
  const nextWeekDate = addWeeks(currentDate, 1);
  return format(nextWeekDate, "RRRR-'S'II");
};

/**
 * Calcule la semaine précédente à partir d'une semaine donnée
 * Gère automatiquement le passage d'année (S01 → S52 de l'année précédente)
 * @param semaine Format: "2025-S42"
 * @returns Semaine précédente au format "2025-S41" (ou "2024-S52" si passage d'année)
 */
export const calculatePreviousWeek = (semaine: string): string => {
  const currentDate = parseISOWeek(semaine);
  const previousWeekDate = addWeeks(currentDate, -1);
  return format(previousWeekDate, "RRRR-'S'II");
};

/**
 * Retourne les 5 dates (Lundi-Vendredi) d'une semaine donnée
 * @param weekString Format: "2025-S42"
 * @returns Array de 5 dates (Date[])
 */
export const getWeekDates = (weekString: string): Date[] => {
  const monday = parseISOWeek(weekString);
  return [0, 1, 2, 3, 4].map(offset => addWeeks(monday, 0).valueOf() ? new Date(monday.getTime() + offset * 24 * 60 * 60 * 1000) : monday);
};
