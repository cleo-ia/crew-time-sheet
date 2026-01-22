import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addWeeks, format, addDays } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";

export const useCopyPreviousWeekFinisseurs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conducteurId,
      currentWeek,
      finisseurId,
    }: {
      conducteurId: string;
      currentWeek: string;
      finisseurId?: string;
    }) => {
      // Calculer la semaine précédente
      const currentMonday = parseISOWeek(currentWeek);
      const previousMonday = addWeeks(currentMonday, -1);
      const previousWeek = format(previousMonday, "RRRR-'S'II");

      console.log("[useCopyPreviousWeekFinisseurs] Copying from", previousWeek, "to", currentWeek);

      // Récupérer les affectations de la semaine précédente
      let query = supabase
        .from("affectations_finisseurs_jours")
        .select("*")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", previousWeek);

      if (finisseurId) {
        query = query.eq("finisseur_id", finisseurId);
      }

      const { data: previousAffectations, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!previousAffectations?.length) {
        throw new Error("Aucune affectation trouvée la semaine précédente");
      }

      // Calculer les nouvelles dates (décalage de 7 jours)
      const newAffectations = previousAffectations.map(aff => {
        const oldDate = new Date(aff.date + "T00:00:00");
        const newDate = addDays(oldDate, 7);

        return {
          finisseur_id: aff.finisseur_id,
          conducteur_id: aff.conducteur_id,
          chantier_id: aff.chantier_id,
          date: format(newDate, "yyyy-MM-dd"),
          semaine: currentWeek,
        };
      });

      // entreprise_id auto-filled by trigger set_entreprise_from_chantier
      const { error: upsertError } = await supabase
        .from("affectations_finisseurs_jours")
        .upsert(newAffectations as any, { 
          onConflict: "finisseur_id,date",
          ignoreDuplicates: false 
        });

      if (upsertError) throw upsertError;

      // Créer les fiches_jours correspondants pour chaque finisseur
      const finisseursToInit = finisseurId 
        ? [finisseurId] 
        : [...new Set(newAffectations.map(a => a.finisseur_id))];

      for (const fId of finisseursToInit) {
        // Récupérer les dates copiées pour ce finisseur
        const finisseurAffectations = newAffectations
          .filter(a => a.finisseur_id === fId)
          .sort((a, b) => a.date.localeCompare(b.date));

        if (finisseurAffectations.length === 0) continue;

        // Vérifier/créer la fiche
        const { data: existingFiche } = await supabase
          .from("fiches")
          .select("id")
          .eq("semaine", currentWeek)
          .eq("salarie_id", fId)
          .is("chantier_id", null)
          .maybeSingle();

        let ficheId: string;

        if (existingFiche) {
          ficheId = existingFiche.id;
        } else {
          // entreprise_id auto-filled by trigger set_fiche_entreprise_id
          const { data: newFiche, error: ficheError } = await supabase
            .from("fiches")
            .insert({
              semaine: currentWeek,
              user_id: conducteurId,
              salarie_id: fId,
              chantier_id: null,
              statut: "BROUILLON",
            } as any)
            .select("id")
            .single();

          if (ficheError) {
            console.error("[useCopyPreviousWeekFinisseurs] Error creating fiche:", ficheError);
            continue;
          }
          ficheId = newFiche.id;
        }

        // Créer les fiches_jours pour les dates affectées
        const { data: existingJours } = await supabase
          .from("fiches_jours")
          .select("date")
          .eq("fiche_id", ficheId);

        const existingDates = new Set(existingJours?.map(j => j.date) || []);
        const datesToCreate = finisseurAffectations
          .filter(a => !existingDates.has(a.date));

        if (datesToCreate.length > 0) {
          const nbDays = finisseurAffectations.length;
          const totalHours = nbDays * 8;

          const joursToInsert = datesToCreate.map((affectation, index) => {
            const realIndex = finisseurAffectations.findIndex(a => a.date === affectation.date);
            const isLastDay = realIndex === nbDays - 1;
            const hoursForDay = isLastDay ? (totalHours - (nbDays - 1) * 8) : 8;

            return {
              fiche_id: ficheId,
              date: affectation.date,
              HNORM: hoursForDay,
              heures: hoursForDay,
              HI: 0,
              code_trajet: null,
              PA: false,
              pause_minutes: 0,
            };
          });

          // entreprise_id auto-filled by trigger set_entreprise_from_fiche
          const { error: joursError } = await supabase
            .from("fiches_jours")
            .insert(joursToInsert as any);

          if (joursError) {
            console.error("[useCopyPreviousWeekFinisseurs] Error creating jours:", joursError);
          }
        }
      }

      return newAffectations.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs-jours"] });
      
      const message = variables.finisseurId
        ? "Planning du finisseur copié depuis la semaine dernière"
        : `${count} affectation(s) copiée(s) depuis la semaine dernière`;
      
      toast({
        title: "✅ Copie réussie",
        description: message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error.message || "Impossible de copier les affectations",
      });
    },
  });
};
