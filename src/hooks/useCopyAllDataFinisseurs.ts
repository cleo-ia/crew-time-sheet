import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addWeeks, format, addDays } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";

/**
 * Hook pour copier TOUTES les données des finisseurs de S vers S+1
 * - affectations_finisseurs_jours (chantiers)
 * - fiches_jours (heures complètes)
 * - fiches_transport_finisseurs + jours (véhicules + conducteurs)
 */
export const useCopyAllDataFinisseurs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conducteurId,
      currentWeek,
      nextWeek,
    }: {
      conducteurId: string;
      currentWeek: string;
      nextWeek: string;
    }) => {
      console.log("[useCopyAllDataFinisseurs] Copie complète de", currentWeek, "vers", nextWeek);

      // 1️⃣ Récupérer tous les finisseurs affectés la semaine courante
      const { data: affectationsS } = await supabase
        .from("affectations_finisseurs_jours")
        .select("*")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", currentWeek);

      if (!affectationsS || affectationsS.length === 0) {
        console.log("❌ Aucune affectation à copier");
        return;
      }

      const finisseurIds = [...new Set(affectationsS.map(a => a.finisseur_id))];
      console.log(`📋 ${finisseurIds.length} finisseur(s) à copier`);

      // 2️⃣ Pour chaque finisseur, copier toutes ses données
      for (const finisseurId of finisseurIds) {
        console.log(`\n🔄 Copie pour finisseur ${finisseurId}`);

        // A) Copier les affectations journalières (décalage +7 jours)
        const finisseurAffectations = affectationsS.filter(a => a.finisseur_id === finisseurId);
        const newAffectations = finisseurAffectations.map(aff => {
          const oldDate = new Date(aff.date + "T00:00:00");
          const newDate = addDays(oldDate, 7);
          return {
            finisseur_id: aff.finisseur_id,
            conducteur_id: aff.conducteur_id,
            chantier_id: aff.chantier_id,
            date: format(newDate, "yyyy-MM-dd"),
            semaine: nextWeek,
          };
        });

        // entreprise_id auto-filled by trigger set_entreprise_from_chantier
        const { error: affError } = await supabase
          .from("affectations_finisseurs_jours")
          .upsert(newAffectations as any, { onConflict: "finisseur_id,date", ignoreDuplicates: false });

        if (affError) {
          console.error("❌ Erreur copie affectations:", affError);
          continue;
        }
        console.log(`✅ ${newAffectations.length} affectations copiées`);

        // B) Récupérer la fiche S
        const { data: ficheS } = await supabase
          .from("fiches")
          .select("id")
          .eq("salarie_id", finisseurId)
          .eq("semaine", currentWeek)
          .is("chantier_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!ficheS) {
          console.log("⚠️ Pas de fiche en S, skip");
          continue;
        }

        // C) Créer ou récupérer la fiche S+1
        const { data: ficheS1Existing } = await supabase
          .from("fiches")
          .select("id")
          .eq("salarie_id", finisseurId)
          .eq("semaine", nextWeek)
          .is("chantier_id", null)
          .maybeSingle();

        let ficheS1Id: string;

        if (ficheS1Existing) {
          ficheS1Id = ficheS1Existing.id;
          console.log("📄 Fiche S+1 existante:", ficheS1Id);
        } else {
          // entreprise_id auto-filled by trigger set_fiche_entreprise_id
          const { data: newFiche, error: ficheError } = await supabase
            .from("fiches")
            .insert({
              semaine: nextWeek,
              user_id: conducteurId,
              salarie_id: finisseurId,
              chantier_id: null,
              statut: "BROUILLON",
            } as any)
            .select("id")
            .single();

          if (ficheError || !newFiche) {
            console.error("❌ Erreur création fiche S+1:", ficheError);
            continue;
          }
          ficheS1Id = newFiche.id;
          console.log("✨ Fiche S+1 créée:", ficheS1Id);
        }

        // D) Copier les fiches_jours (avec TOUS les champs)
        const { data: joursS } = await supabase
          .from("fiches_jours")
          .select("*")
          .eq("fiche_id", ficheS.id)
          .order("date");

        if (joursS && joursS.length > 0) {
          const joursS1 = joursS.map(jour => {
            const oldDate = new Date(jour.date + "T00:00:00");
            const newDate = addDays(oldDate, 7);
            return {
              fiche_id: ficheS1Id,
              date: format(newDate, "yyyy-MM-dd"),
              heure_debut: jour.heure_debut,
              heure_fin: jour.heure_fin,
              pause_minutes: jour.pause_minutes,
              heures: jour.heures,
              HNORM: jour.HNORM,
              HI: jour.HI,
              T: jour.T,
              PA: jour.PA,
              trajet_perso: jour.trajet_perso,
              code_trajet: jour.code_trajet,
              type_absence: jour.type_absence,
              code_chantier_du_jour: jour.code_chantier_du_jour,
              ville_du_jour: jour.ville_du_jour,
              autres_elements: jour.autres_elements,
              regularisation_m1: jour.regularisation_m1,
            };
          });

          // Supprimer les anciens jours S+1 si existants
          await supabase
            .from("fiches_jours")
            .delete()
            .eq("fiche_id", ficheS1Id);

          // entreprise_id auto-filled by trigger set_entreprise_from_fiche
          const { error: joursError } = await supabase
            .from("fiches_jours")
            .insert(joursS1 as any);

          if (joursError) {
            console.error("❌ Erreur copie fiches_jours:", joursError);
          } else {
            console.log(`✅ ${joursS1.length} jours copiés`);
          }
        }

        // E) Copier les fiches_transport_finisseurs
        const { data: transportS } = await supabase
          .from("fiches_transport_finisseurs")
          .select("id")
          .eq("finisseur_id", finisseurId)
          .eq("semaine", currentWeek)
          .maybeSingle();

        if (!transportS) {
          console.log("⚠️ Pas de transport en S, skip transport");
          continue;
        }

        // Créer ou récupérer transport S+1
        const { data: transportS1Existing } = await supabase
          .from("fiches_transport_finisseurs")
          .select("id")
          .eq("finisseur_id", finisseurId)
          .eq("semaine", nextWeek)
          .maybeSingle();

        let transportS1Id: string;

        if (transportS1Existing) {
          transportS1Id = transportS1Existing.id;
          console.log("🚗 Transport S+1 existant:", transportS1Id);
        } else {
          const { data: newTransport, error: transportError } = await supabase
            .from("fiches_transport_finisseurs")
            .insert({
              fiche_id: ficheS1Id,
              finisseur_id: finisseurId,
              semaine: nextWeek,
            })
            .select("id")
            .single();

          if (transportError || !newTransport) {
            console.error("❌ Erreur création transport S+1:", transportError);
            continue;
          }
          transportS1Id = newTransport.id;
          console.log("✨ Transport S+1 créé:", transportS1Id);
        }

        // F) Copier les jours de transport
        const { data: transportJoursS } = await supabase
          .from("fiches_transport_finisseurs_jours")
          .select("*")
          .eq("fiche_transport_finisseur_id", transportS.id)
          .order("date");

        if (transportJoursS && transportJoursS.length > 0) {
          const transportJoursS1 = transportJoursS.map(jour => {
            const oldDate = new Date(jour.date + "T00:00:00");
            const newDate = addDays(oldDate, 7);
            return {
              fiche_transport_finisseur_id: transportS1Id,
              date: format(newDate, "yyyy-MM-dd"),
              conducteur_matin_id: jour.conducteur_matin_id,
              conducteur_soir_id: jour.conducteur_soir_id,
              immatriculation: jour.immatriculation,
            };
          });

          // Supprimer les anciens jours transport S+1 si existants
          await supabase
            .from("fiches_transport_finisseurs_jours")
            .delete()
            .eq("fiche_transport_finisseur_id", transportS1Id);

          const { error: transportJoursError } = await supabase
            .from("fiches_transport_finisseurs_jours")
            .insert(transportJoursS1);

          if (transportJoursError) {
            console.error("❌ Erreur copie transport jours:", transportJoursError);
          } else {
            console.log(`✅ ${transportJoursS1.length} jours transport copiés`);
          }
        }
      }

      console.log("✅ Copie complète terminée");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs-jours"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["transport-finisseur"] });
    },
    onError: (error: any) => {
      console.error("❌ Erreur copie complète:", error);
    },
  });
};
