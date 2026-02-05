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

      // Ne sauvegarder que si au moins un véhicule est COMPLET (3 champs obligatoires)
      const hasValidData = days.some(day => 
        day.vehicules.some(v => 
          v.immatriculation && v.conducteurMatinId && v.conducteurSoirId
        )
      );
      
      if (!hasValidData) {
        console.log("[useAutoSaveTransportV2] No valid data to save, skipping");
        return { saved: false };
      }

      // Validation obligatoire : chantier requis
      if (!chantierId) {
        console.log("[useAutoSaveTransportV2] Missing chantierId, skipping");
        return { saved: false };
      }

      // Même logique que useSaveTransportV2 mais sans toast
      let ficheId = providedFicheId;
      if (!ficheId) {
        const { data: existingFiche } = await supabase
          .from("fiches")
          .select("id")
          .eq("semaine", semaine)
          .eq("user_id", chefId)
          .eq("chantier_id", chantierId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingFiche) {
          ficheId = existingFiche.id;
        } else {
          // entreprise_id auto-filled by trigger set_fiche_entreprise_id
          const { data: newFiche, error } = await supabase
            .from("fiches")
            .insert({
              semaine,
              chantier_id: chantierId,
              user_id: chefId,
              statut: "BROUILLON",
              total_heures: 0,
            } as any)
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
        // entreprise_id auto-filled by trigger set_entreprise_from_fiche
        const { data: newTransport, error } = await supabase
          .from("fiches_transport")
          .insert({
            fiche_id: ficheId,
            semaine,
            chantier_id: chantierId,
          } as any)
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
          // Ne sauvegarder que les véhicules COMPLETS (immat + conducteur matin + conducteur soir)
          if (vehicule.immatriculation && vehicule.conducteurMatinId && vehicule.conducteurSoirId) {
            jourEntries.push({
              fiche_transport_id: transportId,
              date: day.date,
              periode: "MATIN",
              conducteur_aller_id: vehicule.conducteurMatinId,
              conducteur_retour_id: null,
              immatriculation: vehicule.immatriculation,
            });
            jourEntries.push({
              fiche_transport_id: transportId,
              date: day.date,
              periode: "SOIR",
              conducteur_aller_id: null,
              conducteur_retour_id: vehicule.conducteurSoirId,
              immatriculation: vehicule.immatriculation,
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
    onSuccess: (result) => {
      // Invalider le cache pour garantir le rechargement des données fraîches à la réouverture
      if (result?.saved) {
        queryClient.invalidateQueries({ queryKey: ["transport-v2"] });
      }
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
