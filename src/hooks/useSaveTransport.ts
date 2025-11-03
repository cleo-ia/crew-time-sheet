import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SaveTransportParams } from "@/types/transport";

export const useSaveTransport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveTransportParams) => {
      const { ficheId: providedFicheId, semaine, chantierId, days, chefId } = params;

      // 0. Si pas de ficheId, chercher d'abord une fiche existante ou en créer une
      let ficheId = providedFicheId;
      if (!ficheId) {
        const { data: existingFiche, error: findFicheError } = await supabase
          .from("fiches")
          .select("id, created_at")
          .eq("semaine", semaine)
          .eq("chantier_id", chantierId)
          .eq("user_id", chefId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findFicheError) throw findFicheError;

        if (existingFiche) {
          ficheId = existingFiche.id;
        } else {
          const { data: newFiche, error: ficheError } = await supabase
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

          if (ficheError) throw ficheError;
          ficheId = newFiche.id;
        }
      }

      // 1. Créer ou récupérer la fiche transport (prendre la plus récente en cas de doublons)
      const { data: existingTransport } = await supabase
        .from("fiches_transport")
        .select("id, created_at")
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let transportId: string;

      if (existingTransport) {
        transportId = existingTransport.id;
      } else {
        const { data: newTransport, error: insertError } = await supabase
          .from("fiches_transport")
          .insert({
            fiche_id: ficheId,
            semaine,
            chantier_id: chantierId,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        transportId = newTransport.id;
      }

      // 2. Supprimer les anciennes entrées journalières
      await supabase
        .from("fiches_transport_jours")
        .delete()
        .eq("fiche_transport_id", transportId);

      // 3. Insérer les nouvelles entrées (5 jours) - convertir au nouveau format avec periode
      const jourEntries: any[] = [];
      
      days.forEach((day) => {
        // Ligne pour MATIN (conducteur_aller)
        jourEntries.push({
          fiche_transport_id: transportId,
          date: day.date,
          periode: "MATIN",
          conducteur_aller_id: day.conducteurAllerId || null,
          conducteur_retour_id: null,
          immatriculation: day.immatriculation || null,
        });
        
        // Ligne pour SOIR (conducteur_retour)
        jourEntries.push({
          fiche_transport_id: transportId,
          date: day.date,
          periode: "SOIR",
          conducteur_aller_id: null,
          conducteur_retour_id: day.conducteurRetourId || null,
          immatriculation: day.immatriculation || null,
        });
      });

      const { error: joursError } = await supabase
        .from("fiches_transport_jours")
        .insert(jourEntries);

      if (joursError) throw joursError;

      return transportId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      toast({
        title: "Fiche de trajet enregistrée",
        description: "Les informations de trajet ont été enregistrées avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error saving transport:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    },
  });
};
