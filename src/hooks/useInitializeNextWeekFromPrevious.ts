import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISOWeek } from "@/lib/weekUtils";
import { format, addDays } from "date-fns";

interface InitializeNextWeekParams {
  currentWeek: string;
  nextWeek: string;
  chefId: string;
  chantierId: string | null;
}

export const useInitializeNextWeekFromPrevious = () => {
  return useMutation({
    mutationFn: async ({ currentWeek, nextWeek, chefId, chantierId }: InitializeNextWeekParams) => {
      console.log(`[useInitializeNextWeekFromPrevious] Copie de ${currentWeek} vers ${nextWeek}`);

      // 1. Récupérer toutes les fiches de la semaine actuelle pour ce chef/chantier
      let query = supabase
        .from("fiches")
        .select(`
          id,
          salarie_id,
          chantier_id,
          total_heures,
          fiches_jours (
            date,
            heures,
            HNORM,
            HI,
            T,
            trajet_perso,
            code_trajet,
            PA,
            pause_minutes,
            code_chantier_du_jour,
            ville_du_jour
          )
        `)
        .eq("semaine", currentWeek)
        .eq("user_id", chefId);

      if (chantierId) {
        query = query.eq("chantier_id", chantierId);
      } else {
        query = query.is("chantier_id", null);
      }

      const { data: fichesActuelles, error: fetchError } = await query;

      if (fetchError) {
        console.error("Erreur récupération fiches:", fetchError);
        throw fetchError;
      }

      if (!fichesActuelles || fichesActuelles.length === 0) {
        console.log("Aucune fiche à copier");
        return { copiedFiches: 0, copiedTransport: false };
      }

      console.log(`${fichesActuelles.length} fiches trouvées à copier`);

      // 2. Pour chaque fiche, créer une nouvelle fiche en S+1 avec les mêmes données
      const currentWeekStart = parseISOWeek(currentWeek);
      const nextWeekStart = parseISOWeek(nextWeek);
      const daysDiff = Math.round((nextWeekStart.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24));

      for (const fiche of fichesActuelles) {
        // Créer la nouvelle fiche pour S+1
        const { data: newFiche, error: ficheError } = await supabase
          .from("fiches")
          .insert({
            semaine: nextWeek,
            user_id: chefId,
            salarie_id: fiche.salarie_id,
            chantier_id: fiche.chantier_id,
            statut: "BROUILLON",
            total_heures: fiche.total_heures,
          })
          .select("id")
          .single();

        if (ficheError || !newFiche) {
          console.error(`Erreur création fiche pour ${fiche.salarie_id}:`, ficheError);
          continue;
        }

        // Copier les fiches_jours en ajustant les dates
        if (fiche.fiches_jours && fiche.fiches_jours.length > 0) {
          const joursToInsert = fiche.fiches_jours.map((jour: any) => {
            const oldDate = new Date(jour.date);
            const newDate = new Date(oldDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
            
            return {
              fiche_id: newFiche.id,
              date: format(newDate, "yyyy-MM-dd"),
              HNORM: jour.HNORM,
              heures: jour.heures,
              HI: jour.HI || 0,
              T: jour.T || 0,
              trajet_perso: jour.trajet_perso || false,
              code_trajet: jour.code_trajet || null,
              PA: jour.PA || false,
              pause_minutes: jour.pause_minutes || 0,
              code_chantier_du_jour: jour.code_chantier_du_jour,
              ville_du_jour: jour.ville_du_jour,
            };
          });

          const { error: joursError } = await supabase
            .from("fiches_jours")
            .insert(joursToInsert);

          if (joursError) {
            console.error(`Erreur copie fiches_jours pour ${fiche.salarie_id}:`, joursError);
          }
        }
      }

      // 3. Copier les données de transport
      let transportCopied = false;
      
      console.log(`[Copy Transport] Début copie transport S=${currentWeek} → S+1=${nextWeek}, chantier=${chantierId || 'null'}`);
      
      // Étape 1 : Lire le transport source directement par chantier/semaine
      let transportSourceQuery = supabase
        .from("fiches_transport")
        .select("id, fiche_id, semaine")
        .eq("semaine", currentWeek);

      if (chantierId) {
        transportSourceQuery = transportSourceQuery.eq("chantier_id", chantierId);
      } else {
        transportSourceQuery = transportSourceQuery.is("chantier_id", null);
      }

      const { data: transportSource } = await transportSourceQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("[Copy Transport] Transport source:", transportSource ? `trouvé (id=${transportSource.id})` : "non trouvé");

      if (!transportSource) {
        console.log("[Copy Transport] Aucune fiche transport à copier pour ce chantier/semaine");
        return { copiedFiches: fichesActuelles.length, copiedTransport: false };
      }

      // Étape 2 : Lire les jours de transport source
      const { data: joursTransportSource, error: joursError } = await supabase
        .from("fiches_transport_jours")
        .select("date, immatriculation, conducteur_aller_id, conducteur_retour_id, periode")
        .eq("fiche_transport_id", transportSource.id)
        .order("date");

      if (joursError || !joursTransportSource || joursTransportSource.length === 0) {
        console.log("[Copy Transport] Aucun jour de transport à copier");
        return { copiedFiches: fichesActuelles.length, copiedTransport: false };
      }

      console.log(`[Copy Transport] ${joursTransportSource.length} jours de transport trouvés`);

      // Étape 3 : Trouver/créer la fiche destination (S+1) - Aligné sur useSaveTransportV2
      let ficheDestQuery = supabase
        .from("fiches")
        .select("id")
        .eq("semaine", nextWeek)
        .eq("user_id", chefId);

      if (chantierId) {
        ficheDestQuery = ficheDestQuery.eq("chantier_id", chantierId);
      } else {
        ficheDestQuery = ficheDestQuery.is("chantier_id", null);
      }

      const { data: ficheDest } = await ficheDestQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let ficheDestId: string;

      if (ficheDest) {
        ficheDestId = ficheDest.id;
        console.log("[Copy Transport] Fiche destination trouvée:", ficheDestId);
      } else {
        // Créer une nouvelle fiche pour le transport
        const { data: newFiche, error: ficheError } = await supabase
          .from("fiches")
          .insert({
            semaine: nextWeek,
            user_id: chefId,
            chantier_id: chantierId,
            statut: "BROUILLON",
            total_heures: 0,
          })
          .select("id")
          .single();

        if (ficheError || !newFiche) {
          console.error("[Copy Transport] Erreur création fiche destination:", ficheError);
          return { copiedFiches: fichesActuelles.length, copiedTransport: false };
        }

        ficheDestId = newFiche.id;
        console.log("[Copy Transport] Fiche destination créée:", ficheDestId);
      }

      // Étape 4 : Créer/réutiliser la fiche transport destination
      const { data: existingTransportDest } = await supabase
        .from("fiches_transport")
        .select("id")
        .eq("fiche_id", ficheDestId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let transportDestId: string;

      if (existingTransportDest) {
        transportDestId = existingTransportDest.id;
        console.log("[Copy Transport] Transport destination trouvé, suppression des anciens jours...");
        
        // Supprimer les anciens jours pour éviter les doublons
        const { error: deleteError } = await supabase
          .from("fiches_transport_jours")
          .delete()
          .eq("fiche_transport_id", transportDestId);

        if (deleteError) {
          console.error("[Copy Transport] Erreur suppression anciens jours:", deleteError);
        }
      } else {
        // Créer une nouvelle fiche transport
        const { data: newTransportDest, error: transportError } = await supabase
          .from("fiches_transport")
          .insert({
            fiche_id: ficheDestId,
            semaine: nextWeek,
            chantier_id: chantierId,
          })
          .select("id")
          .single();

        if (transportError || !newTransportDest) {
          console.error("[Copy Transport] Erreur création transport destination:", transportError);
          return { copiedFiches: fichesActuelles.length, copiedTransport: false };
        }

        transportDestId = newTransportDest.id;
        console.log("[Copy Transport] Transport destination créé:", transportDestId);
      }

      // Étape 5 : Copier les jours avec décalage de dates
      const joursToInsert = joursTransportSource.map((jour: any) => {
        const oldDate = new Date(jour.date);
        const newDate = new Date(oldDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
        
        return {
          fiche_transport_id: transportDestId,
          date: format(newDate, "yyyy-MM-dd"),
          immatriculation: jour.immatriculation,
          conducteur_aller_id: jour.conducteur_aller_id,
          conducteur_retour_id: jour.conducteur_retour_id,
          periode: jour.periode,
        };
      });

      const { error: insertError } = await supabase
        .from("fiches_transport_jours")
        .insert(joursToInsert);

      if (insertError) {
        console.error("[Copy Transport] Erreur insertion jours:", insertError);
        return { copiedFiches: fichesActuelles.length, copiedTransport: false };
      }

      transportCopied = true;
      console.log(`✅ [Copy Transport] ${joursToInsert.length} jours copiés avec succès vers S+1`);

      return {
        copiedFiches: fichesActuelles.length,
        copiedTransport: transportCopied,
      };
    },
    onError: (error) => {
      console.error("Erreur lors de la copie vers semaine suivante:", error);
    },
  });
};
