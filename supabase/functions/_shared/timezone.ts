/**
 * Calcule si on est en heure d'été (CEST) ou heure d'hiver (CET) à Paris
 * pour une date donnée.
 * 
 * Règle UE : dernier dimanche de mars (passage à UTC+2) et dernier dimanche d'octobre (passage à UTC+1)
 */
export function isParisInDST(date: Date): boolean {
  const year = date.getUTCFullYear();
  
  // Dernier dimanche de mars à 01:00 UTC
  const marchLastSunday = getLastSundayOfMonth(year, 2); // 2 = mars
  const dstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0));
  
  // Dernier dimanche d'octobre à 01:00 UTC
  const octoberLastSunday = getLastSundayOfMonth(year, 9); // 9 = octobre
  const dstEnd = new Date(Date.UTC(year, 9, octoberLastSunday, 1, 0, 0));
  
  return date >= dstStart && date < dstEnd;
}

function getLastSundayOfMonth(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)); // dernier jour du mois
  const dayOfWeek = lastDay.getUTCDay();
  return lastDay.getUTCDate() - dayOfWeek;
}

/**
 * Convertit une heure Paris (ex: 17) en heure UTC en tenant compte du DST
 */
export function parisHourToUTC(parisHour: number, date: Date = new Date()): number {
  const offset = isParisInDST(date) ? 2 : 1; // CEST = UTC+2, CET = UTC+1
  return (parisHour - offset + 24) % 24;
}

/**
 * Vérifie si l'heure actuelle UTC correspond à l'heure cible à Paris
 */
export function isTargetParisHour(targetParisHour: number): boolean {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();
  const expectedUTCHour = parisHourToUTC(targetParisHour, now);
  
  return currentUTCHour === expectedUTCHour;
}
