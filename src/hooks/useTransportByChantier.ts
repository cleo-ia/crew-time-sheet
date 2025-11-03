import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransportSheet } from "@/types/transport";

export const useTransportByChantier = (chantierId: string | null, semaine: string | null) => {
  return useQuery({
    queryKey: ["transport-by-chantier", chantierId, semaine],
    queryFn: async (): Promise<TransportSheet | null> => {
      if (!chantierId || !semaine) return null;

      try {
        console.log("[useTransportByChantier] Query", { chantierId, semaine });
        // Récupérer la fiche transport par chantier et semaine
        const { data: transport, error: transportError } = await supabase
          .from("fiches_transport")
          .select("*")
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (transportError) throw transportError;

        let found = transport;

        // Tolérance aux variantes de semaine (S/W)
        if (!found && typeof semaine === "string") {
          const variants = Array.from(new Set([semaine, semaine.replace("-S", "-W"), semaine.replace("-W", "-S")]));
          for (const v of variants) {
            if (v === semaine) continue;
            const { data: t, error: e } = await supabase
              .from("fiches_transport")
              .select("*")
              .eq("chantier_id", chantierId)
              .eq("semaine", v)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (e) throw e;
            if (t) { found = t; break; }
          }
        }

        if (!found) return null;

        console.log("[useTransportByChantier] Found transport", { id: found.id, semaine: found.semaine });

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
          .eq("fiche_transport_id", found.id)
          .order("date");

        if (joursError) throw joursError;

        console.log("[useTransportByChantier] Days", { count: Array.isArray(jours) ? jours.length : 0 });

        return {
          id: found.id,
          ficheId: found.fiche_id,
          semaine: found.semaine,
          chantierId: found.chantier_id,
          days: (jours || []).map((jour: any) => ({
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
    enabled: !!chantierId && !!semaine,
  });
};
