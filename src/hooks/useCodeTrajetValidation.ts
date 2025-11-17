import { useMemo } from "react";

type DayData = {
  hours: number;
  absent: boolean;
  trajetPerso: boolean;
  codeTrajet?: string | null;
};

export interface TimeEntry {
  employeeId: string;
  employeeName: string;
  days: {
    [key: string]: DayData;
  };
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

    const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

    for (const entry of timeEntries) {
      const missingDays: string[] = [];

      for (const day of dayNames) {
        const dayData = entry.days[day];
        
        // Vérifier que dayData existe
        if (!dayData) continue;
        
        // Si l'employé a travaillé ce jour (hours > 0) ET n'est pas absent
        if (dayData.hours > 0 && !dayData.absent) {
          // Vérifier si code trajet OU trajet perso est renseigné
          const hasCodeTrajet = dayData.codeTrajet && dayData.codeTrajet.trim() !== "";
          const hasTrajetPerso = dayData.trajetPerso === true;

          if (!hasCodeTrajet && !hasTrajetPerso) {
            missingCount++;
            missingDays.push(day);
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
