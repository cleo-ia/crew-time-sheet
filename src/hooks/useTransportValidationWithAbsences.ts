import { useMemo } from "react";
import { useTransportDataV2 } from "./useTransportDataV2";
import { useFichesJoursByEmployee } from "./useFichesJoursByEmployee";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InconsistencyDetail {
  day: string;
  vehicleId: string;
  driverName: string;
  driverId: string;
  periode: "matin" | "soir";
  reason: string;
}

export const useTransportValidationWithAbsences = (
  ficheId: string | null,
  chefId?: string,
  semaine?: string,
  conducteurId?: string
) => {
  const { data: transportData } = useTransportDataV2(ficheId, conducteurId);

  // Récupérer tous les conducteurs uniques de la fiche transport
  const uniqueDriverIds = useMemo(() => {
    if (!transportData?.days) return [];
    
    const ids = new Set<string>();
    transportData.days.forEach(day => {
      day.vehicules.forEach(v => {
        if (v.conducteurMatinId) ids.add(v.conducteurMatinId);
        if (v.conducteurSoirId) ids.add(v.conducteurSoirId);
      });
    });
    
    return Array.from(ids);
  }, [transportData]);

  // Récupérer les noms des conducteurs
  const { data: conducteursData } = useQuery({
    queryKey: ["conducteurs-names", uniqueDriverIds],
    queryFn: async () => {
      if (uniqueDriverIds.length === 0) return [];
      
      const { data } = await supabase
        .from("utilisateurs")
        .select("id, prenom, nom")
        .in("id", uniqueDriverIds);
      
      return data || [];
    },
    enabled: uniqueDriverIds.length > 0,
  });

  // Récupérer les fiches_jours pour chaque conducteur
  const driversAbsences = uniqueDriverIds.map(driverId => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: fichesJours } = useFichesJoursByEmployee(driverId, semaine);
    return { driverId, fichesJours: fichesJours || [] };
  });

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

  const { hasInconsistencies, inconsistencyDetails } = useMemo(() => {
    if (!transportData?.days || transportData.days.length === 0) {
      return { hasInconsistencies: false, inconsistencyDetails: [] };
    }

    const details: InconsistencyDetail[] = [];

    transportData.days.forEach((day) => {
      day.vehicules.forEach((vehicule) => {
        // Vérifier conducteur matin
        if (vehicule.conducteurMatinId) {
          const driverAbsence = driversAbsences.find(d => d.driverId === vehicule.conducteurMatinId);
          const ficheJour = driverAbsence?.fichesJours.find(fj => fj.date === day.date);
          
          // Si heures === 0, le conducteur est considéré comme absent
          if (ficheJour && ficheJour.heures === 0) {
            const driverInfo = conducteursData?.find(c => c.id === vehicule.conducteurMatinId);
            const driverName = driverInfo 
              ? `${driverInfo.prenom} ${driverInfo.nom}` 
              : vehicule.conducteurMatinNom || "Conducteur inconnu";
            
            details.push({
              day: day.date,
              vehicleId: vehicule.id,
              driverName,
              driverId: vehicule.conducteurMatinId,
              periode: "matin",
              reason: `Conducteur absent (0h)`,
            });
          }
        }

        // Vérifier conducteur soir
        if (vehicule.conducteurSoirId) {
          const driverAbsence = driversAbsences.find(d => d.driverId === vehicule.conducteurSoirId);
          const ficheJour = driverAbsence?.fichesJours.find(fj => fj.date === day.date);
          
          if (ficheJour && ficheJour.heures === 0) {
            const driverInfo = conducteursData?.find(c => c.id === vehicule.conducteurSoirId);
            const driverName = driverInfo 
              ? `${driverInfo.prenom} ${driverInfo.nom}` 
              : vehicule.conducteurSoirNom || "Conducteur inconnu";
            
            details.push({
              day: day.date,
              vehicleId: vehicule.id,
              driverName,
              driverId: vehicule.conducteurSoirId,
              periode: "soir",
              reason: `Conducteur absent (0h)`,
            });
          }
        }
      });
    });

    return {
      hasInconsistencies: details.length > 0,
      inconsistencyDetails: details,
    };
  }, [transportData, driversAbsences, conducteursData]);

  return { 
    isTransportComplete, 
    hasInconsistencies, 
    inconsistencyDetails,
    transportData 
  };
};
