import { useMemo } from "react";

export interface TimeEntry {
  employeeId: string;
  employeeName: string;
  lundi: { hours: number; absent?: boolean; codeTrajet?: string | null; trajetPerso?: boolean };
  mardi: { hours: number; absent?: boolean; codeTrajet?: string | null; trajetPerso?: boolean };
  mercredi: { hours: number; absent?: boolean; codeTrajet?: string | null; trajetPerso?: boolean };
  jeudi: { hours: number; absent?: boolean; codeTrajet?: string | null; trajetPerso?: boolean };
  vendredi: { hours: number; absent?: boolean; codeTrajet?: string | null; trajetPerso?: boolean };
}

interface ValidationResult {
  isValid: boolean;
  missingCount: number;
  employeesWithMissing: Array<{
    employeeName: string;
    missingDays: string[];
  }>;
}

export const useCodeTrajetValidation = (timeEntries: TimeEntry[]): ValidationResult => {
  return useMemo(() => {
    let missingCount = 0;
    const employeesWithMissing: Array<{ employeeName: string; missingDays: string[] }> = [];

    const dayNames = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;
    const dayLabels: Record<typeof dayNames[number], string> = {
      lundi: "Lundi",
      mardi: "Mardi",
      mercredi: "Mercredi",
      jeudi: "Jeudi",
      vendredi: "Vendredi",
    };

    for (const entry of timeEntries) {
      const missingDays: string[] = [];

      for (const day of dayNames) {
        const dayData = entry[day];
        
        // Vérifier que dayData existe
        if (!dayData) continue;
        
        // Si l'employé a travaillé ce jour (hours > 0) ET n'est pas absent
        if (dayData.hours > 0 && !dayData.absent) {
          // Vérifier si code trajet OU trajet perso est renseigné
          const hasCodeTrajet = dayData.codeTrajet && dayData.codeTrajet.trim() !== "";
          const hasTrajetPerso = dayData.trajetPerso === true;

          if (!hasCodeTrajet && !hasTrajetPerso) {
            missingCount++;
            missingDays.push(dayLabels[day]);
          }
        }
      }

      if (missingDays.length > 0) {
        employeesWithMissing.push({
          employeeName: entry.employeeName,
          missingDays,
        });
      }
    }

    return {
      isValid: missingCount === 0,
      missingCount,
      employeesWithMissing,
    };
  }, [timeEntries]);
};
