import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransportSheetV2, TransportDayV2, TransportVehicle } from "@/types/transport";

export const useTransportDataV2 = (ficheId: string | null, conducteurId?: string) => {
  return useQuery({
    queryKey: ["transport-v2", ficheId],
    queryFn: async (): Promise<TransportSheetV2 | null> => {
      if (!ficheId) return null;

      try {
        console.log("[useTransportDataV2] Fetching for ficheId:", ficheId);

        // Récupérer la fiche transport
        const { data: transport, error: transportError } = await supabase
          .from("fiches_transport")
          .select("*")
          .eq("fiche_id", ficheId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (transportError) throw transportError;
        if (!transport) {
          console.log("[useTransportDataV2] No transport found");
          return null;
        }

        console.log("[useTransportDataV2] Transport found:", transport.id);

        // Récupérer TOUS les jours/véhicules avec les données des conducteurs
        const { data: jours, error: joursError } = await supabase
          .from("fiches_transport_jours")
          .select(
            `
            *,
            conducteur_aller:utilisateurs!fiches_transport_jours_conducteur_aller_id_fkey(id, nom, prenom),
            conducteur_retour:utilisateurs!fiches_transport_jours_conducteur_retour_id_fkey(id, nom, prenom)
          `
          )
          .eq("fiche_transport_id", transport.id)
          .order("date")
          .order("periode");

        if (joursError) throw joursError;

        console.log("[useTransportDataV2] Raw jours:", jours?.length || 0);

        // Grouper par date puis par véhicule
        const daysByDate = new Map<string, Map<string, TransportVehicle>>();

        (jours || []).forEach((jour: any) => {
          const date = jour.date;
          const immat = jour.immatriculation || "";

          if (!daysByDate.has(date)) {
            daysByDate.set(date, new Map());
          }

          const vehiculesMap = daysByDate.get(date)!;

          if (!vehiculesMap.has(immat)) {
            vehiculesMap.set(immat, {
              id: crypto.randomUUID(),
              immatriculation: immat,
              conducteurMatinId: "",
              conducteurMatinNom: "",
              conducteurSoirId: "",
              conducteurSoirNom: "",
            });
          }

          const vehicule = vehiculesMap.get(immat)!;

          // Remplir selon la période
          if (jour.periode === "MATIN" && jour.conducteur_aller_id) {
            vehicule.conducteurMatinId = jour.conducteur_aller_id;
            vehicule.conducteurMatinNom = jour.conducteur_aller
              ? `${jour.conducteur_aller.prenom} ${jour.conducteur_aller.nom}`
              : "";
          } else if (jour.periode === "SOIR" && jour.conducteur_retour_id) {
            vehicule.conducteurSoirId = jour.conducteur_retour_id;
            vehicule.conducteurSoirNom = jour.conducteur_retour
              ? `${jour.conducteur_retour.prenom} ${jour.conducteur_retour.nom}`
              : "";
          }
        });

        // Auto-remplir les IDs manquants avec le conducteurId si fourni
        daysByDate.forEach((vehiculesMap) => {
          vehiculesMap.forEach((vehicule) => {
            if (conducteurId && vehicule.immatriculation) {
              if (!vehicule.conducteurMatinId) {
                vehicule.conducteurMatinId = conducteurId;
              }
              if (!vehicule.conducteurSoirId) {
                vehicule.conducteurSoirId = conducteurId;
              }
            }
          });
        });
        // Construire le tableau final
        const days: TransportDayV2[] = Array.from(daysByDate.entries()).map(
          ([date, vehiculesMap]) => ({
            date,
            vehicules: Array.from(vehiculesMap.values()),
          })
        );

        console.log("[useTransportDataV2] Processed days:", days.length);

        return {
          id: transport.id,
          ficheId: transport.fiche_id,
          semaine: transport.semaine,
          chantierId: transport.chantier_id,
          days,
        };
      } catch (error) {
        console.error("[useTransportDataV2] Error:", error);
        return null;
      }
    },
    enabled: !!ficheId,
    refetchOnMount: true, // Toujours recharger à l'ouverture du composant
    staleTime: 30000,
  });
};
