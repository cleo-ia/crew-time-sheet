import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DayData {
  hours: number;
  overtime: number;
  absent: boolean;
  panierRepas: boolean;
  trajet: boolean;
  trajetPerso: boolean;
  heuresIntemperie: number;
  chantierId?: string | null;
  chantierCode?: string | null;
  chantierVille?: string | null;
  chantierNom?: string | null;
}

interface TimeEntry {
  employeeId: string;
  employeeName: string;
  days: {
    [key: string]: DayData;
  };
}

interface SaveFicheParams {
  timeEntries: TimeEntry[];
  weekId: string;
  chantierId: string | null;
  chefId: string;
  forceNormalize?: boolean; // Si true, applique la normalisation 39h pour nouvelle semaine
}

export const useAutoSaveFiche = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveFicheParams) => {
      const { timeEntries, weekId, chantierId, chefId, forceNormalize = false } = params;

      // Calculer les dates de la semaine ISO (Lundi à Vendredi) en UTC pour éviter les décalages de fuseau
      const [yearStr, weekStr] = weekId.split(/-(?:W|S)/);
      const year = parseInt(yearStr, 10);
      const week = parseInt(weekStr, 10);

      const getMondayOfISOWeek = (w: number, y: number) => {
        // ISO: semaine 1 est la semaine avec le 4 janvier; on travaille en UTC
        const jan4 = new Date(Date.UTC(y, 0, 4));
        const day = jan4.getUTCDay() || 7; // 1..7 (lundi=1)
        const mondayOfWeek1 = new Date(jan4);
        mondayOfWeek1.setUTCDate(jan4.getUTCDate() - day + 1);
        const monday = new Date(mondayOfWeek1);
        monday.setUTCDate(mondayOfWeek1.getUTCDate() + (w - 1) * 7);
        return monday;
      };

      const ymd = (d: Date) => d.toISOString().split("T")[0];
      const addDaysUTC = (d: Date, n: number) => {
        const dt = new Date(d);
        dt.setUTCDate(dt.getUTCDate() + n);
        return dt;
      };

      const monday = getMondayOfISOWeek(week, year);
      const dates: { [key: string]: string } = {
        Lundi: ymd(addDaysUTC(monday, 0)),
        Mardi: ymd(addDaysUTC(monday, 1)),
        Mercredi: ymd(addDaysUTC(monday, 2)),
        Jeudi: ymd(addDaysUTC(monday, 3)),
        Vendredi: ymd(addDaysUTC(monday, 4)),
      };
      // Pour chaque employé, créer ou mettre à jour sa fiche
      for (const entry of timeEntries) {
        // 1. Chercher fiche existante pour cet employé
        let query = supabase
          .from("fiches")
          .select("id, created_at")
          .eq("semaine", weekId)
          .eq("salarie_id", entry.employeeId);

        if (chantierId) {
          // Maçons/Chefs: filtrer par chantier ET user_id pour isoler les fiches par chef
          query = query.eq("chantier_id", chantierId).eq("user_id", chefId);
        } else {
          // Finisseurs: UNE fiche partagée entre tous les conducteurs (pas de filtre user_id)
          query = query.is("chantier_id", null);
        }

        const { data: existingFiche, error: findFicheError } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findFicheError) throw findFicheError;

        let ficheId: string;
        if (existingFiche) {
          ficheId = existingFiche.id;
        } else {
          // Créer nouvelle fiche
          const { data: newFiche, error: ficheError } = await supabase
            .from("fiches")
            .insert({
              semaine: weekId,
              chantier_id: chantierId,
              salarie_id: entry.employeeId,
              user_id: chantierId ? chefId : null, // NULL pour finisseurs (fiche partagée), chefId pour maçons
              statut: "BROUILLON",
              total_heures: 0,
            })
            .select()
            .single();

          if (ficheError) throw ficheError;
          ficheId = newFiche.id;

          // Initialiser à 39h UNIQUEMENT si forceNormalize === true (passage à semaine suivante)
          if (forceNormalize) {
            const workDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;
            const defaultHours = [8, 8, 8, 8, 7];
            const initialJours = workDays.map((dayName, index) => ({
              fiche_id: ficheId,
              date: dates[dayName],
              HNORM: defaultHours[index],
              heures: defaultHours[index],
              HI: 0,
              T: 1,
              PA: true,
              pause_minutes: 0,
            }));

            const { error: initJoursError } = await supabase
              .from("fiches_jours")
              .insert(initialJours);

            if (initJoursError) throw initJoursError;
          }
        }

        // 2. Préparer les jours normalisés (corriger "tout à 7h" UNIQUEMENT si forceNormalize === true)
        const workDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;
        const standardHours: Record<(typeof workDays)[number], number> = {
          Lundi: 8,
          Mardi: 8,
          Mercredi: 8,
          Jeudi: 8,
          Vendredi: 7,
        };
        
        const normalizedDays: Record<string, typeof entry.days[string]> = { ...entry.days };
        
        // Normalisation conditionnelle : uniquement si forceNormalize === true ET tout est à 7h
        if (forceNormalize) {
          const isAllSeven = workDays.every((d) => {
            const dd = entry.days[d as keyof typeof entry.days];
            return dd && !dd.absent && (dd.heuresIntemperie ?? 0) === 0 && Number(dd.hours ?? 0) === 7;
          });
          
          if (isAllSeven) {
            workDays.forEach((d) => {
              const cur = normalizedDays[d];
              normalizedDays[d] = {
                ...cur,
                hours: standardHours[d],
                absent: false,
                heuresIntemperie: 0,
                overtime: 0,
                panierRepas: cur?.panierRepas ?? true,
                trajet: cur?.trajet ?? true,
                trajetPerso: cur?.trajetPerso ?? false,
                chantierId: cur?.chantierId,
                chantierCode: cur?.chantierCode,
                chantierVille: cur?.chantierVille,
                chantierNom: cur?.chantierNom,
              };
            });
          }
        }

        // 🔥 CORRECTION FINISSEURS: Ne générer des jours QUE pour ceux effectivement saisis
        // Pour les finisseurs, chaque conducteur ajoute/met à jour uniquement SES jours affectés
        // Pas de suppression des jours existants (merge automatique multi-conducteurs)
        const selectedDays = chantierId === null
          ? workDays.filter(d => normalizedDays[d] !== undefined) // Finisseurs: jours saisis uniquement
          : workDays; // Autres: tous les jours

        const jourEntries = selectedDays.map((dayName) => {
          const dayData = normalizedDays[dayName];
          const defaultHour = standardHours[dayName]; // 8h pour Lundi-Jeudi, 7h pour Vendredi
          
          return {
            fiche_id: ficheId,
            date: dates[dayName],
            heures: dayData?.absent ? 0 : (dayData?.hours ?? defaultHour),
            HNORM: dayData?.absent ? 0 : (dayData?.hours ?? defaultHour),
            HI: dayData?.heuresIntemperie || 0,
            T: (dayData?.trajet ?? true) ? 1 : 0, // 1 si coché, 0 si décoché (défaut: 1)
            trajet_perso: !!dayData?.trajetPerso,
            PA: dayData?.panierRepas ?? true, // true par défaut (panier coché)
            pause_minutes: 0,
            code_chantier_du_jour: dayData?.chantierCode || null,
            ville_du_jour: dayData?.chantierVille || null,
          };
        });
        if (jourEntries.length > 0) {
          const { error: joursError } = await supabase
            .from("fiches_jours")
            .upsert(jourEntries, {
              onConflict: 'fiche_id,date',
              ignoreDuplicates: false
            });

          if (joursError) throw joursError;

          // Logs de contrôle pour le merge multi-conducteurs
          if (chantierId === null) {
            console.log(`[MERGE FINISSEUR] ${entry.employeeName} - Semaine ${weekId}`);
            console.log(`  - Fiche ID: ${ficheId}`);
            console.log(`  - Jours envoyés par conducteur ${chefId}:`, selectedDays);
            console.log(`  - ${jourEntries.length} jours upsertés`);
          }
        }
      }
    },
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      // PAS de toast (sauvegarde silencieuse)
    },
    onError: (error) => {
      // Logger uniquement en console
      console.error("Auto-save fiche failed:", error);
    },
  });
};
