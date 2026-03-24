import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfISOWeek, addWeeks, format, getISOWeek, getISOWeekYear, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { batchQueryIn } from "@/lib/supabaseBatch";
import { fr } from "date-fns/locale";

export interface FicheNonValidee {
  salarieId: string;
  nom: string;
  prenom: string;
  semaines: string[];
  roleMetier: string | null;
  sansChef: boolean;
}

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
  fichesNonValidees: FicheNonValidee[];
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
        .select("id, semaine, statut, salarie_id, chantier_id, utilisateurs!salarie_id(nom, prenom, role_metier, agence_interim)")
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

      // Generate French label for the period to match both formats in DB
      const [pYear, pMonth] = periode.split("-").map(Number);
      const periodeFrLabel = format(new Date(pYear, pMonth - 1), "MMMM yyyy", { locale: fr });

      // Check clôture for this period (search both yyyy-MM and French label formats)
      const { data: cloture } = await supabase
        .from("periodes_cloturees")
        .select("periode, date_cloture")
        .or(`periode.eq.${periode},periode.eq.${periodeFrLabel}`)
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
        // Robust parsing: if periode matches yyyy-MM, parse it; otherwise use as-is
        const p = derniereCloture.periode;
        if (/^\d{4}-\d{2}$/.test(p)) {
          const [y, m] = p.split("-");
          moisDerniereCloture = format(new Date(Number(y), Number(m) - 1), "MMMM yyyy", { locale: fr });
        } else {
          // Already a human-readable label like "Décembre 2025"
          moisDerniereCloture = p;
        }
      }

      // Build fichesNonValidees: group unvalidated fiches by salarie
      const ROLE_ORDER: Record<string, number> = { chef: 0, macon: 1, finisseur: 2, grutier: 3 };
      const nonValideesMap = new Map<string, { nom: string; prenom: string; semaines: Set<string>; roleMetier: string | null }>();
      for (const f of allFiches) {
        if (!STATUTS_VALIDES.includes(f.statut) && f.salarie_id) {
          const existing = nonValideesMap.get(f.salarie_id);
          const utilisateur = f.utilisateurs as unknown as { nom: string; prenom: string; role_metier: string | null; agence_interim: string | null } | null;
          if (utilisateur?.agence_interim) continue; // Exclure les intérimaires
          if (existing) {
            if (f.semaine) existing.semaines.add(f.semaine);
          } else {
            nonValideesMap.set(f.salarie_id, {
              nom: utilisateur?.nom || "—",
              prenom: utilisateur?.prenom || "",
              semaines: new Set(f.semaine ? [f.semaine] : []),
              roleMetier: utilisateur?.role_metier || null,
            });
          }
        }
      }
      // Fetch affectations_jours_chef to determine sansChef status
      const salarieIds = Array.from(nonValideesMap.keys());
      const affectationsChef = salarieIds.length > 0
        ? await batchQueryIn<{ macon_id: string }>(
            "affectations_jours_chef",
            "macon_id",
            "macon_id",
            salarieIds,
            {
              extraFilters: (q: any) => q.in("semaine", weeks),
            }
          )
        : [];
      const salariesAvecChef = new Set(affectationsChef.map((a) => a.macon_id));

      const fichesNonValidees: FicheNonValidee[] = Array.from(nonValideesMap.entries())
        .map(([salarieId, v]) => ({
          salarieId,
          nom: v.nom,
          prenom: v.prenom,
          semaines: Array.from(v.semaines).sort(),
          roleMetier: v.roleMetier,
          sansChef: !salariesAvecChef.has(salarieId),
        }))
        .sort((a, b) => {
          const ra = ROLE_ORDER[a.roleMetier || ""] ?? 4;
          const rb = ROLE_ORDER[b.roleMetier || ""] ?? 4;
          if (ra !== rb) return ra - rb;
          return a.nom.localeCompare(b.nom);
        });

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
        fichesNonValidees,
      };
    },
  });
};
