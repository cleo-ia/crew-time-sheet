import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SaveTransportParamsV2 } from "@/types/transport";

export const useSaveTransportV2 = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveTransportParamsV2) => {
      const { ficheId: providedFicheId, semaine, chantierId, days, chefId } = params;

      console.log("[useSaveTransportV2] Starting save", { providedFicheId, semaine, chantierId });

      // Gérer ficheId
      let ficheId = providedFicheId;
      if (!ficheId) {
        let query = supabase
          .from("fiches")
          .select("id")
          .eq("semaine", semaine)
          .eq("user_id", chefId);

        if (chantierId) {
          query = query.eq("chantier_id", chantierId);
        } else {
          query = query.is("chantier_id", null);
        }

        const { data: existingFiche } = await query
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingFiche) {
          ficheId = existingFiche.id;
        } else {
          const { data: newFiche, error } = await supabase
            .from("fiches")
            .insert({
              semaine,
              chantier_id: chantierId,
              user_id: chefId,
              statut: "BROUILLON",
              total_heures: 0,
            })
            .select()
            .single();

          if (error) throw error;
          ficheId = newFiche.id;
        }
      }

      console.log("[useSaveTransportV2] Using ficheId:", ficheId);

      // Gérer fiche_transport
      const { data: existingTransport } = await supabase
        .from("fiches_transport")
        .select("id")
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let transportId: string;

      if (existingTransport) {
        transportId = existingTransport.id;
      } else {
        const { data: newTransport, error } = await supabase
          .from("fiches_transport")
          .insert({
            fiche_id: ficheId,
            semaine,
            chantier_id: chantierId,
          })
          .select()
          .single();

        if (error) throw error;
        transportId = newTransport.id;
      }

      console.log("[useSaveTransportV2] Using transportId:", transportId);

      // Supprimer les anciennes entrées
      await supabase
        .from("fiches_transport_jours")
        .delete()
        .eq("fiche_transport_id", transportId);

      // Insérer les nouvelles entrées
      const jourEntries: any[] = [];

      days.forEach((day) => {
        day.vehicules.forEach((vehicule) => {
          // Ligne pour MATIN
          if (vehicule.conducteurMatinId || vehicule.immatriculation) {
            jourEntries.push({
              fiche_transport_id: transportId,
              date: day.date,
              periode: "MATIN",
              conducteur_aller_id: vehicule.conducteurMatinId || null,
              conducteur_retour_id: null,
              immatriculation: vehicule.immatriculation || null,
            });
          }

          // Ligne pour SOIR
          if (vehicule.conducteurSoirId || vehicule.immatriculation) {
            jourEntries.push({
              fiche_transport_id: transportId,
              date: day.date,
              periode: "SOIR",
              conducteur_aller_id: null,
              conducteur_retour_id: vehicule.conducteurSoirId || null,
              immatriculation: vehicule.immatriculation || null,
            });
          }
        });
      });

      console.log("[useSaveTransportV2] Inserting entries:", jourEntries.length);

      if (jourEntries.length > 0) {
        const { error: joursError } = await supabase
          .from("fiches_transport_jours")
          .insert(jourEntries);

        if (joursError) throw joursError;
      }

      return transportId;
    },
    onSuccess: () => {
      // Ne pas invalider les queries pour éviter de réinitialiser l'état local
      // Les données sont déjà sauvegardées et à jour dans le composant
      toast({
        title: "✅ Fiche de trajet enregistrée",
        description: "Les informations de trajet ont été enregistrées avec succès.",
      });
    },
    onError: (error) => {
      console.error("[useSaveTransportV2] Error:", error);
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    },
  });
};
