import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransportSheetFinisseur, TransportFinisseurDay } from "@/types/transport";

export const useTransportDataFinisseur = (
  ficheId: string | null,
  finisseurId: string | null
) => {
  return useQuery({
    queryKey: ["transport-finisseur", ficheId, finisseurId],
    queryFn: async (): Promise<TransportSheetFinisseur | null> => {
      if (!ficheId || !finisseurId) return null;

      // Récupérer la fiche transport du finisseur
      const { data: transport, error: transportError } = await supabase
        .from("fiches_transport_finisseurs")
        .select("*")
        .eq("fiche_id", ficheId)
        .eq("finisseur_id", finisseurId)
        .maybeSingle();

      if (transportError) throw transportError;
      if (!transport) return null;

      // Récupérer les jours
      const { data: jours, error: joursError } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .select("*")
        .eq("fiche_transport_finisseur_id", transport.id)
        .order("date");

      if (joursError) throw joursError;

      const days: TransportFinisseurDay[] = (jours || []).map((j: any) => ({
        date: j.date,
        conducteurMatinId: j.conducteur_matin_id || "",
        conducteurSoirId: j.conducteur_soir_id || "",
        immatriculation: j.immatriculation || "",
      }));

      return {
        id: transport.id,
        ficheId: transport.fiche_id,
        finisseurId: transport.finisseur_id,
        semaine: transport.semaine,
        days,
      };
    },
    enabled: !!ficheId && !!finisseurId,
  });
};
