import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfISOWeek, addWeeks, format, getISOWeek, getISOWeekYear } from "date-fns";
import { fr } from "date-fns/locale";

export interface ExportPaieReadiness {
  status: "ready" | "ready_complete" | "incomplete" | "closed";
  label: string;
  sublabel: string;
  nbSalaries: number;
  nbFichesValidees: number;
  nbFichesTotal: number;
  nbChantiers: number;
  semainesManquantes: string[];
  derniereSemaineMois: string;
  dateDerniereCloture: string | null;
  moisDerniereCloture: string | null;
}

/**
 * Retourne toutes les semaines ISO dont le lundi tombe dans le mois donné
 */
function getWeeksForMonth(periode: string): string[] {
  const [year, month] = periode.split("-").map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  const weeks: string[] = [];
  let current = startOfISOWeek(start);

  // Avancer jusqu'au premier lundi dans le mois
  while (current < start) {
    current = addWeeks(current, 1);
  }

  while (current <= end) {
    const wy = getISOWeekYear(current);
    const wn = getISOWeek(current);
    weeks.push(`${wy}-S${String(wn).padStart(2, "0")}`);
    current = addWeeks(current, 1);
  }

  return weeks;
}

const STATUTS_VALIDES = ["VALIDE_CHEF", "VALIDE_CONDUCTEUR", "ENVOYE_RH"];

export const useExportPaieReadiness = (periode: string) => {
  return useQuery<ExportPaieReadiness>({
    queryKey: ["export-paie-readiness", periode],
    queryFn: async () => {
      const weeks = getWeeksForMonth(periode);
      const derniereSemaine = weeks[weeks.length - 1] || "";

      // Fetch fiches for these weeks
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select("id, semaine, statut, salarie_id, chantier_id")
        .in("semaine", weeks);

      if (fichesError) throw fichesError;

      const allFiches = fiches || [];
      const nbFichesTotal = allFiches.length;
      const nbFichesValidees = allFiches.filter((f) =>
        STATUTS_VALIDES.includes(f.statut)
      ).length;

      // Unique salaries & chantiers
      const salariesSet = new Set(allFiches.map((f) => f.salarie_id).filter(Boolean));
      const chantiersSet = new Set(allFiches.map((f) => f.chantier_id).filter(Boolean));

      // Semaines avec au moins une fiche validée
      const semainesAvecFiches = new Set(
        allFiches
          .filter((f) => STATUTS_VALIDES.includes(f.statut))
          .map((f) => f.semaine)
      );

      // Semaines manquantes (hors dernière semaine)
      const semainesManquantes = weeks
        .filter((w) => w !== derniereSemaine)
        .filter((w) => !semainesAvecFiches.has(w));

      // Check clôture for this period
      const { data: cloture } = await supabase
        .from("periodes_cloturees")
        .select("periode, date_cloture")
        .eq("periode", periode)
        .maybeSingle();

      // Dernière clôture globale
      const { data: derniereCloture } = await supabase
        .from("periodes_cloturees")
        .select("periode, date_cloture")
        .order("date_cloture", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine status
      let status: ExportPaieReadiness["status"];
      let label: string;
      let sublabel: string;

      if (cloture) {
        status = "closed";
        label = "Période clôturée";
        sublabel = `Clôturée le ${format(new Date(cloture.date_cloture), "dd/MM/yyyy à HH:mm", { locale: fr })}`;
      } else if (semainesManquantes.length === 0 && semainesAvecFiches.has(derniereSemaine)) {
        status = "ready_complete";
        label = "Prêt pour l'export — mois complet";
        sublabel = "Toutes les semaines sont validées";
      } else if (semainesManquantes.length === 0) {
        status = "ready";
        label = "Prêt pour l'export";
        sublabel = "Dernière semaine estimée par la paie prévisionnelle — comportement normal";
      } else {
        status = "incomplete";
        label = "Données incomplètes";
        sublabel = `${semainesManquantes.length} semaine(s) sans fiches validées : ${semainesManquantes.join(", ")}`;
      }

      // Dernière clôture info
      let dateDerniereCloture: string | null = null;
      let moisDerniereCloture: string | null = null;
      if (derniereCloture) {
        dateDerniereCloture = format(new Date(derniereCloture.date_cloture), "dd/MM/yyyy", { locale: fr });
        const [y, m] = derniereCloture.periode.split("-");
        moisDerniereCloture = format(new Date(Number(y), Number(m) - 1), "MMMM yyyy", { locale: fr });
      }

      return {
        status,
        label,
        sublabel,
        nbSalaries: salariesSet.size,
        nbFichesValidees,
        nbFichesTotal,
        nbChantiers: chantiersSet.size,
        semainesManquantes,
        derniereSemaineMois: derniereSemaine,
        dateDerniereCloture,
        moisDerniereCloture,
      };
    },
  });
};
