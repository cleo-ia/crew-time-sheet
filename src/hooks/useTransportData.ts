import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransportSheet } from "@/types/transport";

export const useTransportData = (ficheId: string | null) => {
  return useQuery({
    queryKey: ["transport", ficheId],
    queryFn: async (): Promise<TransportSheet | null> => {
      if (!ficheId) return null;

      try {
        // Récupérer la fiche transport (prendre la plus récente en cas de doublons)
        const { data: transport, error: transportError } = await supabase
          .from("fiches_transport")
          .select("*")
          .eq("fiche_id", ficheId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (transportError) throw transportError;
        if (!transport) return null;

        // Récupérer les jours de transport
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
          .order("date");

        if (joursError) throw joursError;

        return {
          id: transport.id,
          ficheId: transport.fiche_id,
          semaine: transport.semaine,
          chantierId: transport.chantier_id,
          days: jours.map((jour: any) => ({
            date: jour.date,
            conducteurAllerId: jour.conducteur_aller_id || "",
            conducteurAllerNom: jour.conducteur_aller 
              ? `${jour.conducteur_aller.prenom} ${jour.conducteur_aller.nom}` 
              : "",
            conducteurRetourId: jour.conducteur_retour_id || "",
            conducteurRetourNom: jour.conducteur_retour 
              ? `${jour.conducteur_retour.prenom} ${jour.conducteur_retour.nom}` 
              : "",
            immatriculation: jour.immatriculation || "",
          })),
        };
      } catch (error) {
        console.error("Erreur lors du chargement de la fiche transport:", error);
        return null;
      }
    },
    enabled: !!ficheId,
  });
};
