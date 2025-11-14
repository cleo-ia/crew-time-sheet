import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISOWeek } from "@/lib/weekUtils";
import { addDays, format } from "date-fns";

interface InitializeNextWeekMaconsParams {
  chantierId: string;
  semaine: string;
  chefId: string;
}

export const useInitializeNextWeekMacons = () => {
  return useMutation({
    mutationFn: async ({ chantierId, semaine, chefId }: InitializeNextWeekMaconsParams) => {
      console.log("🔄 Initializing next week for macons:", { chantierId, semaine, chefId });

      // 1. Récupérer les maçons affectés au chantier
      const { data: affectations } = await supabase
        .from("affectations")
        .select("macon_id")
        .eq("chantier_id", chantierId)
        .or(`date_fin.is.null,date_fin.gte.${format(parseISOWeek(semaine), "yyyy-MM-dd")}`);

      if (!affectations || affectations.length === 0) {
        console.log("✅ No macons to initialize");
        return;
      }

      const maconIds = [...new Set(affectations.map(a => a.macon_id))];

      // 2. Calculer les 5 dates de la semaine (Lundi-Vendredi)
      const monday = parseISOWeek(semaine);
      const weekDates = [0, 1, 2, 3, 4].map(offset => 
        format(addDays(monday, offset), "yyyy-MM-dd")
      );

      // 3. Récupérer les infos du chantier
      const { data: chantierData } = await supabase
        .from("chantiers")
        .select("code_chantier, ville")
        .eq("id", chantierId)
        .single();

      const chantierCode = chantierData?.code_chantier || null;
      const chantierVille = chantierData?.ville || null;

      // 4. Pour chaque maçon, créer ou vérifier la fiche
      for (const maconId of maconIds) {
        // Vérifier si la fiche existe déjà
        const { data: existingFiche } = await supabase
          .from("fiches")
          .select("id")
          .eq("semaine", semaine)
          .eq("salarie_id", maconId)
          .eq("chantier_id", chantierId)
          .maybeSingle();

        let ficheId: string;

        if (existingFiche) {
          ficheId = existingFiche.id;
          console.log(`ℹ️ Fiche already exists for macon ${maconId}`);
        } else {
          // Créer la fiche
          const { data: newFiche, error: ficheError } = await supabase
            .from("fiches")
            .insert({
              semaine,
              user_id: chefId,
              salarie_id: maconId,
              chantier_id: chantierId,
              statut: "BROUILLON",
            })
            .select("id")
            .single();

          if (ficheError) {
            console.error("Error creating fiche:", ficheError);
            continue;
          }

          ficheId = newFiche.id;
          console.log(`✅ Created fiche for macon ${maconId}`);
        }

        // 5. Créer les jours avec 39h réparties (7.8h × 5 jours)
        const { data: existingJours } = await supabase
          .from("fiches_jours")
          .select("id, date")
          .eq("fiche_id", ficheId);

        const existingDates = new Set(existingJours?.map(j => j.date) || []);
        const datesToCreate = weekDates.filter(d => !existingDates.has(d));

        if (datesToCreate.length > 0) {
          const joursToInsert = datesToCreate.map((date, index) => {
            // Répartition fixe : 8h du lundi au jeudi, 7h le vendredi (total = 39h)
            const hoursForDay = index === 4 ? 7 : 8;

            return {
              fiche_id: ficheId,
              date,
              HNORM: hoursForDay,
              heures: hoursForDay,
              HI: 0,
              code_trajet: null,  // ✅ Utilisateur devra choisir
              PA: true,
              pause_minutes: 0,
              code_chantier_du_jour: chantierCode,
              ville_du_jour: chantierVille,
            };
          });

          const { error: joursError } = await supabase
            .from("fiches_jours")
            .insert(joursToInsert);

          if (joursError) {
            console.error("Error creating jours:", joursError);
          } else {
            console.log(`✅ Created ${datesToCreate.length} day(s) (39h total) for macon ${maconId}`);
          }
        } else {
          console.log(`ℹ️ All days already exist for macon ${maconId}`);
        }
      }

      console.log("✅ Next week initialized successfully for macons");
    },
    onError: (error) => {
      console.error("Error initializing next week for macons:", error);
    },
  });
};
