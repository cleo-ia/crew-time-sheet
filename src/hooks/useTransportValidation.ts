import { useMemo } from "react";
import { useTransportDataV2 } from "./useTransportDataV2";

export const useTransportValidation = (ficheId: string | null, conducteurId?: string) => {
  const { data: transportData } = useTransportDataV2(ficheId, conducteurId);

  const isTransportComplete = useMemo(() => {
    if (!transportData?.days || transportData.days.length === 0) {
      return false;
    }

    // Vérifier que chaque jour a au moins 1 véhicule complet
    const allDaysComplete = transportData.days.every((day) => {
      if (day.vehicules.length === 0) return false;
      
      return day.vehicules.some((vehicule) => {
        return (
          vehicule.immatriculation?.trim() !== "" &&
          vehicule.conducteurMatinId?.trim() !== "" &&
          vehicule.conducteurSoirId?.trim() !== ""
        );
      });
    });

    return transportData.days.length === 5 && allDaysComplete;
  }, [transportData]);

  return { isTransportComplete, transportData };
};
