import { useMemo } from "react";
import { useTransportDataV2 } from "./useTransportDataV2";
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

  // Récupérer TOUTES les fiches_jours pour TOUS les conducteurs en UNE SEULE requête
  const { data: allFichesJours } = useQuery({
    queryKey: ["fiches-jours-all-drivers", uniqueDriverIds, semaine],
    queryFn: async () => {
      if (uniqueDriverIds.length === 0 || !semaine) return [];

      // 1. Récupérer toutes les fiches pour ces employés pour cette semaine
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select("id, salarie_id")
        .in("salarie_id", uniqueDriverIds)
        .eq("semaine", semaine);

      if (fichesError) throw fichesError;
      if (!fiches || fiches.length === 0) return [];

      const ficheIds = fiches.map(f => f.id);

      // 2. Récupérer tous les fiches_jours pour ces fiches
      const { data: fichesJours, error: fjError } = await supabase
        .from("fiches_jours")
        .select("id, date, heures, fiche_id")
        .in("fiche_id", ficheIds);

      if (fjError) throw fjError;

      // 3. Mapper les fiches_jours avec leur salarie_id
      return (fichesJours || []).map(fj => {
        const fiche = fiches.find(f => f.id === fj.fiche_id);
        return {
          ...fj,
          salarie_id: fiche?.salarie_id || null,
        };
      });
    },
    enabled: uniqueDriverIds.length > 0 && !!semaine,
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
          const ficheJour = allFichesJours?.find(
            fj => fj.salarie_id === vehicule.conducteurMatinId && fj.date === day.date
          );
          
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
          const ficheJour = allFichesJours?.find(
            fj => fj.salarie_id === vehicule.conducteurSoirId && fj.date === day.date
          );
          
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
  }, [transportData, allFichesJours, conducteursData]);

  return { 
    isTransportComplete, 
    hasInconsistencies, 
    inconsistencyDetails,
    transportData 
  };
};
