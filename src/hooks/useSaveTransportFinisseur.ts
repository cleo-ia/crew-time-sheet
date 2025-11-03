import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaveTransportFinisseurParams } from "@/types/transport";

export const useSaveTransportFinisseur = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveTransportFinisseurParams) => {
      const { ficheId, finisseurId, conducteurId, semaine, days } = params;

      // 1. Créer ou récupérer la fiche si nécessaire
      let finalFicheId = ficheId;
      if (!finalFicheId) {
        const { data: existingFiche } = await supabase
          .from("fiches")
          .select("id")
          .eq("semaine", semaine)
          .eq("salarie_id", finisseurId)
          .is("chantier_id", null)
          .maybeSingle();

        if (existingFiche) {
          finalFicheId = existingFiche.id;
        } else {
          const { data: newFiche, error: ficheError } = await supabase
            .from("fiches")
            .insert({
              semaine,
              user_id: conducteurId,
              salarie_id: finisseurId,
              chantier_id: null,
              statut: "BROUILLON",
            })
            .select("id")
            .single();

          if (ficheError) throw ficheError;
          finalFicheId = newFiche.id;
        }
      }

      // 2. Créer ou récupérer la fiche transport finisseur
      const { data: existingTransport } = await supabase
        .from("fiches_transport_finisseurs")
        .select("id")
        .eq("fiche_id", finalFicheId)
        .eq("finisseur_id", finisseurId)
        .maybeSingle();

      let transportId: string;
      if (existingTransport) {
        transportId = existingTransport.id;
        
        // Mettre à jour la semaine si nécessaire
        await supabase
          .from("fiches_transport_finisseurs")
          .update({ semaine })
          .eq("id", transportId);
      } else {
        const { data: newTransport, error: transportError } = await supabase
          .from("fiches_transport_finisseurs")
          .insert({
            fiche_id: finalFicheId,
            finisseur_id: finisseurId,
            semaine,
          })
          .select("id")
          .single();

        if (transportError) throw transportError;
        transportId = newTransport.id;
      }

      // 3. Supprimer les anciens jours
      await supabase
        .from("fiches_transport_finisseurs_jours")
        .delete()
        .eq("fiche_transport_finisseur_id", transportId);

      // 4. Insérer les nouveaux jours
      const joursToInsert = days.map((day) => ({
        fiche_transport_finisseur_id: transportId,
        date: day.date,
        conducteur_matin_id: day.conducteurMatinId || null,
        conducteur_soir_id: day.conducteurSoirId || null,
        immatriculation: day.immatriculation || null,
      }));

      const { error: joursError } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .insert(joursToInsert);

      if (joursError) throw joursError;

      return { transportId, ficheId: finalFicheId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-finisseur"] });
      queryClient.invalidateQueries({ queryKey: ["finisseurs-conducteur"] });
      toast.success("Fiche trajet sauvegardée");
    },
    onError: (error) => {
      console.error("Error saving transport finisseur:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });
};
