import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWeekDays } from "@/hooks/usePlanningAffectations";

export interface AbsenceLD {
  dates: Set<string>;
  type: string;
}

/**
 * Pour une semaine donnée, retourne une Map<employe_id, AbsenceLD>
 * contenant les jours L-V bloqués par une absence longue durée.
 */
export const useAbsencesLongueDureePlanning = (semaine: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["absences-ld-planning", semaine, entrepriseId],
    queryFn: async () => {
      if (!entrepriseId || !semaine) return new Map<string, AbsenceLD>();

      const weekDays = getWeekDays(semaine);
      const firstDay = weekDays[0].date;
      const lastDay = weekDays[weekDays.length - 1].date;

      // Charger les absences dont la période chevauche la semaine
      // date_debut <= lastDay AND (date_fin IS NULL OR date_fin >= firstDay)
      const { data, error } = await supabase
        .from("absences_longue_duree")
        .select("salarie_id, date_debut, date_fin, type_absence")
        .eq("entreprise_id", entrepriseId)
        .lte("date_debut", lastDay)
        .or(`date_fin.is.null,date_fin.gte.${firstDay}`);

      if (error) throw error;

      // 2e requête : congés classiques validés
      const { data: conges, error: congesError } = await supabase
        .from("demandes_conges")
        .select("demandeur_id, date_debut, date_fin, type_conge, statut")
        .eq("entreprise_id", entrepriseId)
        .in("statut", ["VALIDEE_CONDUCTEUR", "VALIDEE_RH"])
        .lte("date_debut", lastDay)
        .gte("date_fin", firstDay);

      if (congesError) throw congesError;

      const map = new Map<string, AbsenceLD>();

      // Fusionner absences longue durée
      (data || []).forEach((absence) => {
        const existing = map.get(absence.salarie_id);
        const dates = existing?.dates || new Set<string>();
        const type = existing?.type || absence.type_absence;

        weekDays.forEach((day) => {
          const d = day.date;
          if (
            d >= absence.date_debut &&
            (absence.date_fin === null || d <= absence.date_fin)
          ) {
            dates.add(d);
          }
        });

        if (dates.size > 0) {
          map.set(absence.salarie_id, { dates, type });
        }
      });

      // Fusionner congés classiques validés
      (conges || []).forEach((conge) => {
        const existing = map.get(conge.demandeur_id);
        const dates = existing?.dates || new Set<string>();
        const type = existing?.type || conge.type_conge;

        weekDays.forEach((day) => {
          const d = day.date;
          if (d >= conge.date_debut && d <= conge.date_fin) {
            dates.add(d);
          }
        });

        if (dates.size > 0) {
          map.set(conge.demandeur_id, { dates, type });
        }
      });

      return map;
    },
    enabled: !!entrepriseId && !!semaine,
  });
};
