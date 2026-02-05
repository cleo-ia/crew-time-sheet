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

      // Validation obligatoire : chantier requis
      if (!chantierId) {
        throw new Error("Le chantier est obligatoire pour enregistrer une fiche de trajet");
      }

      console.log("[useSaveTransportV2] Starting save", { providedFicheId, semaine, chantierId });

      // Gérer ficheId - chercher une fiche existante AVEC salarié (pas de création orpheline)
      let ficheId = providedFicheId;
      if (!ficheId) {
        // Chercher n'importe quelle fiche du chantier/semaine qui a un salarié
        const { data: existingFiche, error: findError } = await supabase
          .from("fiches")
          .select("id")
          .eq("semaine", semaine)
          .eq("chantier_id", chantierId)
          .not("salarie_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findError) throw findError;

        if (existingFiche) {
          ficheId = existingFiche.id;
        } else {
          // Pas de fiche salarié existante → erreur explicite
          throw new Error("Aucune fiche salarié trouvée pour ce chantier/semaine. Saisissez d'abord les heures d'un employé.");
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
          } as any)
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
