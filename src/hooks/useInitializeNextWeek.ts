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
      console.log("🔄 Initializing next week (fiches with chantier):", { conducteurId, nextWeek });

      // Calculer la semaine précédente à partir de nextWeek
      const previousWeek = calculatePreviousWeek(nextWeek);
      console.log("📅 Previous week:", previousWeek);

      // Récupérer les affectations de la semaine précédente avec les chantiers
      const { data: previousAffectations } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id, chantier_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", previousWeek);

      if (!previousAffectations || previousAffectations.length === 0) {
        console.log("✅ No affectations in previous week, nextWeek stays empty");
        return;
      }

      // Regrouper par finisseur avec leurs chantiers
      const finisseurChantiers = new Map<string, string>();
      previousAffectations.forEach(a => {
        if (a.chantier_id && !finisseurChantiers.has(a.finisseur_id)) {
          // Prendre le premier chantier trouvé pour chaque finisseur
          finisseurChantiers.set(a.finisseur_id, a.chantier_id);
        }
      });

      console.log(`👥 Found ${finisseurChantiers.size} finisseur(s) in previous week`);

      // Pour chaque finisseur, vérifier/créer une fiche avec son chantier_id
      for (const [finisseurId, chantierId] of finisseurChantiers.entries()) {
        // Vérifier si une fiche existe déjà pour ce finisseur/semaine/chantier
        const { data: existingFiche } = await supabase
          .from("fiches")
          .select("id")
          .eq("semaine", nextWeek)
          .eq("salarie_id", finisseurId)
          .eq("chantier_id", chantierId)
          .maybeSingle();

        if (existingFiche) {
          console.log(`📄 Fiche already exists for finisseur ${finisseurId}`);
          continue;
        }

        // Créer une fiche avec le chantier_id obligatoire
        // entreprise_id auto-filled by trigger set_fiche_entreprise_id
        const { error: ficheError } = await supabase
          .from("fiches")
          .insert({
            semaine: nextWeek,
            user_id: conducteurId,
            salarie_id: finisseurId,
            chantier_id: chantierId, // ✅ chantier_id obligatoire
            statut: "BROUILLON",
          } as any);

        if (ficheError) {
          console.error("❌ Error creating fiche:", ficheError);
        } else {
          console.log(`✅ Created fiche for finisseur ${finisseurId} on chantier ${chantierId}`);
        }
      }

      console.log("✅ Next week initialized successfully");
    },
    onError: (error) => {
      console.error("Error initializing next week:", error);
    },
  });
};
