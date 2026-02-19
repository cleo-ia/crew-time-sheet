import { useMemo } from "react";
import { useTransportDataV2 } from "./useTransportDataV2";

export const useTransportValidation = (
  ficheId: string | null, 
  conducteurId?: string,
  allAbsentDays?: string[],
  assignedDates?: string[]
) => {
  const { data: transportData } = useTransportDataV2(ficheId, conducteurId);

  const isTransportComplete = useMemo(() => {
    // Si des dates assignées sont fournies, les utiliser pour le calcul
    const baseDays = assignedDates && assignedDates.length > 0 ? assignedDates.length : 5;
    const absentInScope = assignedDates && assignedDates.length > 0
      ? (allAbsentDays || []).filter(d => assignedDates.includes(d)).length
      : (allAbsentDays?.length || 0);
    const expectedDays = baseDays - absentInScope;
    
    // Si tous les jours sont des jours d'absence, c'est valide
    if (expectedDays === 0) return true;
    
    if (!transportData?.days || transportData.days.length === 0) {
      return expectedDays === 0; // Valide seulement si aucun jour n'est attendu
    }

    // Filtrer les jours qui ne sont pas des jours d'absence totale
    // et qui font partie des dates assignées (si fournies)
    const workingDays = transportData.days.filter(day => {
      if (allAbsentDays?.includes(day.date)) return false;
      if (assignedDates && assignedDates.length > 0 && !assignedDates.includes(day.date)) return false;
      return true;
    });

    // Vérifier que chaque jour travaillé a au moins 1 véhicule complet
    const allWorkingDaysComplete = workingDays.every((day) => {
      if (day.vehicules.length === 0) return false;
      
      return day.vehicules.some((vehicule) => {
        return (
          vehicule.immatriculation?.trim() !== "" &&
          vehicule.conducteurMatinId?.trim() !== "" &&
          vehicule.conducteurSoirId?.trim() !== ""
        );
      });
    });

    // Vérifier qu'on a bien tous les jours travaillés attendus
    return workingDays.length >= expectedDays && allWorkingDaysComplete;
  }, [transportData, allAbsentDays, assignedDates]);

  return { isTransportComplete, transportData };
};
