import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SaveTransportParamsV2 } from "@/types/transport";
import { toast } from "@/hooks/use-toast";

export const useAutoSaveTransportV2 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveTransportParamsV2) => {
      const { ficheId: providedFicheId, semaine, chantierId, days, chefId, isDirty } = params;

      // Skip auto-save when not dirty
      if (isDirty === false) {
        console.log("[useAutoSaveTransportV2] Not dirty, skipping");
        return { saved: false };
      }

      // Ne pas sauvegarder si aucune donnée valide (accepter aussi véhicules partiellement remplis)
      const hasValidData = days.some(day => 
        day.vehicules.some(v => 
          v.immatriculation || 
          v.conducteurMatinId || 
          v.conducteurSoirId ||
          v.conducteurMatinNom ||
          v.conducteurSoirNom
        )
      );
      
      if (!hasValidData) {
        console.log("[useAutoSaveTransportV2] No valid data to save, skipping");
        return { saved: false };
      }

      // Même logique que useSaveTransportV2 mais sans toast
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
          
          // Invalider le cache useFicheId pour que le ficheId soit immédiatement disponible
          queryClient.invalidateQueries({ queryKey: ["fiche-id", semaine, chefId, chantierId] });
        }
      }

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

      await supabase
        .from("fiches_transport_jours")
        .delete()
        .eq("fiche_transport_id", transportId);

      const jourEntries: any[] = [];

      days.forEach((day) => {
        day.vehicules.forEach((vehicule) => {
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

      if (jourEntries.length > 0) {
        const { error: joursError } = await supabase
          .from("fiches_transport_jours")
          .insert(jourEntries);

        if (joursError) throw joursError;
      }

      return { saved: true, transportId };
    },
    onSuccess: () => {
      // Ne pas invalider les queries pendant l'auto-save pour éviter la fermeture de l'accordéon
      // Les invalidations seront faites lors de la validation finale
    },
    onError: (error) => {
      console.error("[useAutoSaveTransportV2] Error:", error);
      toast({
        variant: "destructive",
        title: "❌ Erreur de sauvegarde trajet",
        description: "Les modifications de trajet n'ont PAS été enregistrées. Vérifiez votre connexion.",
        duration: 6000,
      });
    },
  });
};
