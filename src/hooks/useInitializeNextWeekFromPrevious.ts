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
              heures: jour.heures,
              HNORM: jour.HNORM,
              HI: jour.HI,
              T: jour.T,
              trajet_perso: jour.trajet_perso,
              PA: jour.PA,
              pause_minutes: jour.pause_minutes,
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
      
      // Trouver la fiche du chef pour récupérer le transport
      let chefFicheQuery = supabase
        .from("fiches")
        .select("id")
        .eq("semaine", currentWeek)
        .eq("user_id", chefId)
        .eq("salarie_id", chefId);

      if (chantierId) {
        chefFicheQuery = chefFicheQuery.eq("chantier_id", chantierId);
      } else {
        chefFicheQuery = chefFicheQuery.is("chantier_id", null);
      }

      const { data: chefFiche } = await chefFicheQuery.maybeSingle();

      if (chefFiche) {
        // Récupérer la fiche transport de S
        const { data: transportActuel } = await supabase
          .from("fiches_transport")
          .select(`
            id,
            fiches_transport_jours (
              date,
              immatriculation,
              conducteur_aller_id,
              conducteur_retour_id,
              periode
            )
          `)
          .eq("fiche_id", chefFiche.id)
          .maybeSingle();

        if (transportActuel && transportActuel.fiches_transport_jours) {
          // Trouver la nouvelle fiche du chef pour S+1
          let newChefFicheQuery = supabase
            .from("fiches")
            .select("id")
            .eq("semaine", nextWeek)
            .eq("user_id", chefId)
            .eq("salarie_id", chefId);

          if (chantierId) {
            newChefFicheQuery = newChefFicheQuery.eq("chantier_id", chantierId);
          } else {
            newChefFicheQuery = newChefFicheQuery.is("chantier_id", null);
          }

          const { data: newChefFiche } = await newChefFicheQuery.maybeSingle();

          if (newChefFiche) {
            // Créer la nouvelle fiche transport pour S+1
            const { data: newTransport, error: transportError } = await supabase
              .from("fiches_transport")
              .insert({
                fiche_id: newChefFiche.id,
                semaine: nextWeek,
                chantier_id: chantierId,
              })
              .select("id")
              .single();

            if (!transportError && newTransport) {
              // Copier les jours de transport en ajustant les dates
              const joursTransportToInsert = transportActuel.fiches_transport_jours.map((jour: any) => {
                const oldDate = new Date(jour.date);
                const newDate = new Date(oldDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
                
                return {
                  fiche_transport_id: newTransport.id,
                  date: format(newDate, "yyyy-MM-dd"),
                  immatriculation: jour.immatriculation,
                  conducteur_aller_id: jour.conducteur_aller_id,
                  conducteur_retour_id: jour.conducteur_retour_id,
                  periode: jour.periode,
                };
              });

              const { error: joursTransportError } = await supabase
                .from("fiches_transport_jours")
                .insert(joursTransportToInsert);

              if (!joursTransportError) {
                transportCopied = true;
                console.log("✅ Transport copié avec succès");
              } else {
                console.error("Erreur copie transport jours:", joursTransportError);
              }
            }
          }
        }
      }

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
