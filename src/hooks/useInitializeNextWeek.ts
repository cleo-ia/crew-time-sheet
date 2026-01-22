import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculatePreviousWeek } from "@/lib/weekUtils";

interface InitializeNextWeekParams {
  conducteurId: string;
  nextWeek: string;
}

export const useInitializeNextWeek = () => {
  return useMutation({
    mutationFn: async ({ conducteurId, nextWeek }: InitializeNextWeekParams) => {
      console.log("🔄 Initializing next week (fiches only, no days):", { conducteurId, nextWeek });

      // Calculer la semaine précédente à partir de nextWeek
      const previousWeek = calculatePreviousWeek(nextWeek);
      console.log("📅 Previous week:", previousWeek);

      // Supprimer toutes les anciennes fiches de nextWeek pour ce conducteur
      const { error: deleteError } = await supabase
        .from("fiches")
        .delete()
        .eq("semaine", nextWeek)
        .eq("user_id", conducteurId)
        .is("chantier_id", null);

      if (deleteError) {
        console.error("❌ Error deleting old fiches:", deleteError);
      } else {
        console.log("🗑️ Deleted old fiches for nextWeek");
      }

      // Récupérer les finisseurs uniques affectés au conducteur la SEMAINE PRÉCÉDENTE
      const { data: previousAffectations } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", previousWeek);

      if (!previousAffectations || previousAffectations.length === 0) {
        console.log("✅ No finisseurs in previous week, nextWeek stays empty");
        return;
      }

      // IDs uniques des finisseurs
      const finisseurIds = [...new Set(previousAffectations.map(a => a.finisseur_id))];
      console.log(`👥 Found ${finisseurIds.length} finisseur(s) in previous week`);

      // Pour chaque finisseur, créer UNIQUEMENT une fiche vide (sans jours)
      for (const finisseurId of finisseurIds) {
        // entreprise_id auto-filled by trigger set_fiche_entreprise_id
        const { error: ficheError } = await supabase
          .from("fiches")
          .insert({
            semaine: nextWeek,
            user_id: conducteurId,
            salarie_id: finisseurId,
            chantier_id: null,
            statut: "BROUILLON",
          } as any);

        if (ficheError) {
          console.error("❌ Error creating fiche:", ficheError);
        } else {
          console.log(`✅ Created empty fiche for finisseur ${finisseurId}`);
        }
      }

      console.log("✅ Next week initialized successfully");
    },
    onError: (error) => {
      console.error("Error initializing next week:", error);
    },
  });
};
