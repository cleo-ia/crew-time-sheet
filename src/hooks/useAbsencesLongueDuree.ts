import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentWeek, parseISOWeek } from "@/lib/weekUtils";
import { format, addDays } from "date-fns";

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
        .order("created_at", { ascending: false });

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
