import { useMemo } from "react";
import { useTransportDataV2 } from "./useTransportDataV2";

export const useTransportValidation = (
  ficheId: string | null, 
  conducteurId?: string,
  allAbsentDays?: string[]
) => {
  const { data: transportData } = useTransportDataV2(ficheId, conducteurId);

  const isTransportComplete = useMemo(() => {
    // Nombre de jours attendus = 5 moins les jours où toute l'équipe est absente
    const expectedDays = 5 - (allAbsentDays?.length || 0);
    
    // Si tous les jours sont des jours d'absence, c'est valide
    if (expectedDays === 0) return true;
    
    if (!transportData?.days || transportData.days.length === 0) {
      return expectedDays === 0; // Valide seulement si aucun jour n'est attendu
    }

    // Filtrer les jours qui ne sont pas des jours d'absence totale
    const workingDays = transportData.days.filter(
      day => !allAbsentDays?.includes(day.date)
    );

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
  }, [transportData, allAbsentDays]);

  return { isTransportComplete, transportData };
};
