import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentWeek, parseISOWeek } from "@/lib/weekUtils";
import { format, addDays, eachDayOfInterval, isBefore, isAfter, addWeeks } from "date-fns";

export type AbsenceLongueDuree = {
  id: string;
  salarie_id: string;
  entreprise_id: string;
  type_absence: string;
  date_debut: string;
  date_fin: string | null;
  motif: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  salarie?: {
    id: string;
    nom: string | null;
    prenom: string | null;
  };
};

export const useAbsencesLongueDuree = (entrepriseId?: string | null) => {
  return useQuery({
    queryKey: ["absences-longue-duree", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("absences_longue_duree" as any)
        .select(`
          *,
          salarie:utilisateurs!absences_longue_duree_salarie_id_fkey(id, nom, prenom)
        `)
        .eq("entreprise_id", entrepriseId)
        .order("date_debut", { ascending: true });

      if (error) {
        console.error("Erreur chargement absences longue durée:", error);
        throw error;
      }

      return (data || []) as unknown as AbsenceLongueDuree[];
    },
    enabled: !!entrepriseId,
  });
};

/**
 * Génère immédiatement la fiche fantôme (fiche + fiches_jours) pour la semaine en cours
 * si l'absence chevauche cette semaine. Réplique la logique de sync-planning-to-teams.
 */
async function generateGhostFicheForCurrentWeek(params: {
  salarie_id: string;
  entreprise_id: string;
  type_absence: string;
  date_debut: string;
  date_fin?: string | null;
}) {
  try {
    const currentWeek = getCurrentWeek();
    const monday = parseISOWeek(currentWeek);
    const friday = addDays(monday, 4);

    const mondayStr = format(monday, "yyyy-MM-dd");
    const fridayStr = format(friday, "yyyy-MM-dd");

    // Vérifier le chevauchement : date_debut <= vendredi ET (date_fin null OU date_fin >= lundi)
    const absenceStart = params.date_debut;
    const absenceEnd = params.date_fin;

    if (absenceStart > fridayStr) return; // L'absence commence après cette semaine
    if (absenceEnd && absenceEnd < mondayStr) return; // L'absence est finie avant cette semaine

    // Vérifier qu'une fiche ghost n'existe pas déjà
    const { data: existingGhost } = await supabase
      .from("fiches")
      .select("id")
      .eq("salarie_id", params.salarie_id)
      .is("chantier_id", null)
      .eq("semaine", currentWeek)
      .maybeSingle();

    if (existingGhost) {
      console.log("Fiche fantôme déjà existante pour", currentWeek);
      return;
    }

    // Créer la fiche fantôme
    const { data: newFiche, error: ficheError } = await supabase
      .from("fiches")
      .insert({
        salarie_id: params.salarie_id,
        entreprise_id: params.entreprise_id,
        chantier_id: null,
        semaine: currentWeek,
        statut: "ENVOYE_RH" as any,
        total_heures: 0,
      })
      .select("id")
      .single();

    if (ficheError) {
      console.error("Erreur création fiche fantôme:", ficheError);
      return;
    }

    // Créer les fiches_jours pour chaque jour Lun-Ven qui tombe dans la période d'absence
    const fichesJours: any[] = [];
    for (let i = 0; i < 5; i++) {
      const dayDate = addDays(monday, i);
      const dayStr = format(dayDate, "yyyy-MM-dd");

      // Le jour doit être dans la période d'absence
      if (dayStr < absenceStart) continue;
      if (absenceEnd && dayStr > absenceEnd) continue;

      fichesJours.push({
        fiche_id: newFiche.id,
        date: dayStr,
        entreprise_id: params.entreprise_id,
        heures: 0,
        type_absence: params.type_absence,
        PA: false,
        HNORM: 0,
        HI: 0,
        T: 0,
        pause_minutes: 0,
        code_trajet: null,
        code_chantier_du_jour: null,
        ville_du_jour: null,
        repas_type: null,
      });
    }

    if (fichesJours.length > 0) {
      const { error: joursError } = await supabase
        .from("fiches_jours")
        .insert(fichesJours);

      if (joursError) {
        console.error("Erreur création fiches_jours fantômes:", joursError);
      } else {
        console.log(`Fiche fantôme créée pour ${currentWeek}: ${fichesJours.length} jours`);
      }
    }
  } catch (err) {
    console.error("Erreur génération fiche fantôme:", err);
  }
}

/**
 * Purge les affectations planning et les fiches parasites pour un salarié
 * sur les dates couvertes par un ALD. Cela empêche le badge "absence à qualifier"
 * de s'afficher pour des fiches fantômes créées avant la déclaration de l'ALD.
 */
async function purgeAffectationsForALD(params: {
  salarie_id: string;
  entreprise_id: string;
  date_debut: string;
  date_fin?: string | null;
}) {
  try {
    // Calculer la borne de fin : date_fin ou aujourd'hui + 2 semaines
    const endDate = params.date_fin
      ? new Date(params.date_fin)
      : addWeeks(new Date(), 2);
    const startDate = new Date(params.date_debut);

    if (isAfter(startDate, endDate)) return;

    // Générer toutes les dates couvertes (jours ouvrés uniquement : lun-ven)
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekdayDates = allDays
      .filter(d => d.getDay() >= 1 && d.getDay() <= 5) // Lun-Ven
      .map(d => format(d, "yyyy-MM-dd"));

    if (weekdayDates.length === 0) return;

    console.log(`[purgeALD] Purge pour ${params.salarie_id}: ${weekdayDates.length} jours du ${params.date_debut} au ${params.date_fin || 'indéfini'}`);

    // 1. Supprimer les planning_affectations
    const { error: paError } = await supabase
      .from("planning_affectations")
      .delete()
      .eq("employe_id", params.salarie_id)
      .eq("entreprise_id", params.entreprise_id)
      .in("jour", weekdayDates);

    if (paError) console.error("[purgeALD] Erreur suppression planning_affectations:", paError);

    // 2. Supprimer les affectations_jours_chef (macon_id = salarie)
    const { error: ajcError } = await supabase
      .from("affectations_jours_chef")
      .delete()
      .eq("macon_id", params.salarie_id)
      .eq("entreprise_id", params.entreprise_id)
      .in("jour", weekdayDates);

    if (ajcError) console.error("[purgeALD] Erreur suppression affectations_jours_chef:", ajcError);

    // 3. Supprimer les affectations_finisseurs_jours (finisseur_id = salarie)
    const { error: afjError } = await supabase
      .from("affectations_finisseurs_jours")
      .delete()
      .eq("finisseur_id", params.salarie_id)
      .eq("entreprise_id", params.entreprise_id)
      .in("date", weekdayDates);

    if (afjError) console.error("[purgeALD] Erreur suppression affectations_finisseurs_jours:", afjError);

    // 4. Chercher et supprimer les fiches_jours parasites (0h, pas de type_absence)
    //    sur des fiches avec chantier_id non null (pas les fiches ghost)
    const { data: fichesChantier } = await supabase
      .from("fiches")
      .select("id")
      .eq("salarie_id", params.salarie_id)
      .eq("entreprise_id", params.entreprise_id)
      .not("chantier_id", "is", null);

    if (fichesChantier && fichesChantier.length > 0) {
      const ficheIds = fichesChantier.map(f => f.id);

      // Supprimer les fiches_jours parasites : heures = 0 ET type_absence IS NULL
      const { data: deletedJours, error: fjError } = await supabase
        .from("fiches_jours")
        .delete()
        .in("fiche_id", ficheIds)
        .in("date", weekdayDates)
        .eq("heures", 0)
        .is("type_absence", null)
        .select("fiche_id");

      if (fjError) {
        console.error("[purgeALD] Erreur suppression fiches_jours parasites:", fjError);
      } else if (deletedJours && deletedJours.length > 0) {
        console.log(`[purgeALD] ${deletedJours.length} fiches_jours parasites supprimées`);

        // 5. Supprimer les fiches qui n'ont plus de fiches_jours
        const affectedFicheIds = [...new Set(deletedJours.map(d => d.fiche_id))];
        for (const ficheId of affectedFicheIds) {
          const { data: remaining } = await supabase
            .from("fiches_jours")
            .select("id")
            .eq("fiche_id", ficheId)
            .limit(1);

          if (!remaining || remaining.length === 0) {
            // Supprimer la fiche vide (sauf si statut protégé)
            const { data: ficheToDelete } = await supabase
              .from("fiches")
              .select("id, statut")
              .eq("id", ficheId)
              .single();

            const STATUTS_PROTEGES = ['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE'];
            if (ficheToDelete && !STATUTS_PROTEGES.includes(ficheToDelete.statut)) {
              await supabase.from("fiches").delete().eq("id", ficheId);
              console.log(`[purgeALD] Fiche ${ficheId} supprimée (0 jours restants)`);
            }
          }
        }
      }
    }

    console.log(`[purgeALD] Purge terminée pour ${params.salarie_id}`);
  } catch (err) {
    console.error("[purgeALD] Erreur lors de la purge:", err);
  }
}

export const useCreateAbsenceLongueDuree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      salarie_id: string;
      entreprise_id: string;
      type_absence: string;
      date_debut: string;
      date_fin?: string | null;
      motif?: string | null;
      created_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("absences_longue_duree" as any)
        .insert(params as any)
        .select()
        .single();

      if (error) throw error;

      // Générer immédiatement la fiche fantôme pour la semaine en cours
      await generateGhostFicheForCurrentWeek({
        salarie_id: params.salarie_id,
        entreprise_id: params.entreprise_id,
        type_absence: params.type_absence,
        date_debut: params.date_debut,
        date_fin: params.date_fin,
      });

      // Purger les affectations et fiches parasites existantes
      await purgeAffectationsForALD({
        salarie_id: params.salarie_id,
        entreprise_id: params.entreprise_id,
        date_debut: params.date_debut,
        date_fin: params.date_fin,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences-longue-duree"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
      toast.success("Absence longue durée créée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création", { description: error.message });
    },
  });
};

export const useUpdateAbsenceLongueDuree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      date_fin?: string | null;
      motif?: string | null;
      type_absence?: string;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("absences_longue_duree" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Propager le type_absence aux fiches_jours ghost existantes
      if (params.type_absence && data) {
        const absData = data as any;
        try {
          // Chercher les fiches ghost non clôturées du salarié
          const { data: ghostFiches } = await supabase
            .from("fiches")
            .select("id")
            .eq("salarie_id", absData.salarie_id)
            .is("chantier_id", null)
            .neq("statut", "CLOTURE");

          if (ghostFiches && ghostFiches.length > 0) {
            const ficheIds = ghostFiches.map((f: any) => f.id);

            // Construire la requête de mise à jour des fiches_jours
            let query = supabase
              .from("fiches_jours")
              .update({ type_absence: params.type_absence } as any)
              .in("fiche_id", ficheIds)
              .gte("date", absData.date_debut);

            if (absData.date_fin) {
              query = query.lte("date", absData.date_fin);
            }

            // Filtrer uniquement les jours qui avaient déjà un type_absence (pas les jours travaillés)
            query = query.not("type_absence", "is", null);

            const { error: updateError } = await query;
            if (updateError) {
              console.error("Erreur propagation type_absence aux fiches_jours:", updateError);
            } else {
              console.log(`type_absence propagé à ${ficheIds.length} fiche(s) ghost`);
            }
          }
        } catch (err) {
          console.error("Erreur lors de la propagation type_absence:", err);
        }
      }

      // Purger les affectations et fiches parasites sur la plage de l'ALD
      if (data) {
        const absData = data as any;
        await purgeAffectationsForALD({
          salarie_id: absData.salarie_id,
          entreprise_id: absData.entreprise_id,
          date_debut: absData.date_debut,
          date_fin: absData.date_fin,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences-longue-duree"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
      toast.success("Absence mise à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour", { description: error.message });
    },
  });
};

export const useDeleteAbsenceLongueDuree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("absences_longue_duree" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences-longue-duree"] });
      queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
      toast.success("Absence supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression", { description: error.message });
    },
  });
};
