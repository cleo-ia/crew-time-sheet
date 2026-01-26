import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type RepasType = "PANIER" | "RESTO" | null;

interface DayData {
  hours: number;
  overtime: number;
  absent: boolean;
  panierRepas: boolean;
  repasType?: RepasType;
  trajetPerso?: boolean;  // True si trajet personnel (pas véhicule entreprise)
  codeTrajet?: string | null;  // Code trajet (T_PERSO, T1-T17, T31, T35, GD)
  heuresIntemperie: number;
  chantierId?: string | null;
  chantierCode?: string | null;
  chantierVille?: string | null;
  chantierNom?: string | null;
  commentaire?: string;
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

      // Collecter tous les chantierId utilisés
      const allChantierIds = new Set<string>();
      if (chantierId) allChantierIds.add(chantierId);
      timeEntries.forEach(entry => {
        Object.values(entry.days).forEach(day => {
          if (day.chantierId) allChantierIds.add(day.chantierId);
        });
      });

      // Requête unique pour récupérer tous les codes
      const chantierCodeById = new Map<string, string>();
      if (allChantierIds.size > 0) {
        const { data: chantiers } = await supabase
          .from("chantiers")
          .select("id, code_chantier")
          .in("id", Array.from(allChantierIds));
        
        chantiers?.forEach(c => chantierCodeById.set(c.id, c.code_chantier));
      }

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
        // 1. Chercher fiche existante pour cet employé (peu importe le chantier)
        // Une seule fiche par employé par semaine, le chantier peut varier jour par jour
        let query = supabase
          .from("fiches")
          .select("id, created_at")
          .eq("semaine", weekId)
          .eq("salarie_id", entry.employeeId);

        if (!chantierId) {
          // 🔥 FIX: Pour les finisseurs sans chantierId au niveau parent,
          // on cherche le chantierId depuis les jours individuels (mode multi-chantier)
          const dayChantierIds = new Set(
            Object.values(entry.days)
              .map(d => d.chantierId)
              .filter(Boolean)
          );
          
          if (dayChantierIds.size > 0) {
            // L'employé a des chantiers dans ses jours - chercher sa fiche par le premier chantier
            const firstChantierId = [...dayChantierIds][0];
            query = query.eq("chantier_id", firstChantierId);
          } else {
            // 🔥 FIX: Ne pas créer de fiche "sans chantier" si l'employé a déjà des fiches AVEC chantier
            // Cela évite les doublons d'heures pour les finisseurs multi-chantier
            const { data: fichesAvecChantier } = await supabase
              .from("fiches")
              .select("id")
              .eq("semaine", weekId)
              .eq("salarie_id", entry.employeeId)
              .not("chantier_id", "is", null)
              .limit(1);
            
            if (fichesAvecChantier && fichesAvecChantier.length > 0) {
              // L'employé a des fiches chantier → NE PAS créer de fiche sans chantier
              console.log(`[AutoSave] Skip: ${entry.employeeName} a déjà des fiches chantier pour ${weekId}`);
              continue; // Passer à l'employé suivant
            }
            
            // Aucun chantier trouvé nulle part - skip
            console.warn(`[AutoSave] Skip: ${entry.employeeName} n'a aucun chantierId assigné`);
            continue;
          }
        } else {
          // Maçons: filtrer par CE chantier spécifique (permet multi-chef)
          query = query.eq("chantier_id", chantierId);
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
          // Déterminer le chantierId pour l'insert
          let insertChantierId = chantierId;
          if (!insertChantierId) {
            // Récupérer depuis les jours si pas fourni au niveau parent
            const dayChantierIds = Object.values(entry.days)
              .map(d => d.chantierId)
              .filter(Boolean);
            insertChantierId = dayChantierIds[0] || null;
          }
          
          if (!insertChantierId) {
            console.warn(`[AutoSave] Skip create fiche: ${entry.employeeName} n'a aucun chantierId`);
            continue;
          }

          // Créer nouvelle fiche (entreprise_id auto-filled by trigger set_fiche_entreprise_id)
          const { data: newFiche, error: ficheError } = await supabase
            .from("fiches")
            .insert({
              semaine: weekId,
              chantier_id: insertChantierId,
              salarie_id: entry.employeeId,
              user_id: chefId, // Toujours le chefId maintenant
              statut: "BROUILLON",
              total_heures: 0,
            } as any)
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
              T: 1,  // Trajet coché par défaut
              code_trajet: 'A_COMPLETER',  // RH devra compléter
              PA: true,
              pause_minutes: 0,
            }));

            // entreprise_id auto-filled by trigger set_entreprise_from_fiche
            const { error: initJoursError } = await supabase
              .from("fiches_jours")
              .insert(initialJours as any);

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
                codeTrajet: cur?.codeTrajet ?? null,
                chantierId: cur?.chantierId,
                chantierCode: cur?.chantierCode,
                chantierVille: cur?.chantierVille,
                chantierNom: cur?.chantierNom,
              };
            });
          }
        }

        // 🔥 CORRECTION MULTI-CHEF: Ne sauvegarder que les jours assignés à ce chef
        // Pour les finisseurs: jours saisis uniquement (multi-conducteur)
        // Pour les maçons: jours assignés via affectations_jours_chef (ou fallback 5 jours)
        let selectedDays: typeof workDays[number][] = [...workDays];

        if (chantierId !== null) {
          // Maçons: vérifier s'il y a des jours spécifiques assignés à ce chef
          const { data: affectationsJours } = await supabase
            .from("affectations_jours_chef")
            .select("jour")
            .eq("macon_id", entry.employeeId)
            .eq("chef_id", chefId)
            .eq("chantier_id", chantierId)
            .eq("semaine", weekId);

          if (affectationsJours && affectationsJours.length > 0) {
            // Convertir les dates ISO en noms de jours (Lundi, Mardi, etc.)
            const dayNameByDate = Object.fromEntries(
              Object.entries(dates).map(([name, dateISO]) => [dateISO, name])
            );
            const assignedDayNames = affectationsJours
              .map(a => dayNameByDate[a.jour])
              .filter((name): name is typeof workDays[number] => !!name);
            
            if (assignedDayNames.length > 0) {
              selectedDays = assignedDayNames;
            }
            // Si pas de correspondance, garder workDays (fallback)
          }
          // Si aucune affectation jour n'existe, garder workDays (rétro-compatibilité)
        } else {
          // Finisseurs: seulement les jours effectivement saisis
          selectedDays = workDays.filter(d => normalizedDays[d] !== undefined);
        }

        const jourEntries = selectedDays.map((dayName) => {
          const dayData = normalizedDays[dayName];
          const defaultHour = standardHours[dayName]; // 8h pour Lundi-Jeudi, 7h pour Vendredi
          
          // Base payload
          const baseEntry: any = {
            fiche_id: ficheId,
            date: dates[dayName],
            heures: dayData?.absent ? 0 : (dayData?.hours ?? defaultHour),
            HNORM: dayData?.absent ? 0 : (dayData?.hours ?? defaultHour),
            HI: dayData?.heuresIntemperie || 0,
            // 🔧 FIX: Sauvegarder trajet_perso pour persistance après refresh
            trajet_perso: dayData?.trajetPerso || dayData?.codeTrajet === "T_PERSO",
            T: dayData?.codeTrajet === null || dayData?.codeTrajet === undefined ? 1 : (dayData.codeTrajet ? 1 : 0),
            code_trajet: dayData?.codeTrajet || 'A_COMPLETER',  // A_COMPLETER par défaut si pas déjà défini
            PA: dayData?.panierRepas ?? true, // true par défaut (panier coché)
            repas_type: dayData?.repasType ?? (dayData?.panierRepas === false ? null : "PANIER"), // PANIER par défaut
            pause_minutes: 0,
            commentaire: dayData?.commentaire || null,
          };
          
          // N'ajouter code_chantier_du_jour QUE si on a une valeur valide
          const code = dayData?.chantierCode
            ?? chantierCodeById.get(dayData?.chantierId || "")
            ?? chantierCodeById.get(chantierId || "");
          if (code) {
            baseEntry.code_chantier_du_jour = code;
          }
          
          // N'ajouter ville_du_jour QUE si fournie
          if (dayData?.chantierVille) {
            baseEntry.ville_du_jour = dayData.chantierVille;
          }
          
          return baseEntry;
        });
        if (jourEntries.length > 0) {
          // entreprise_id auto-filled by trigger set_entreprise_from_fiche
          const { error: joursError } = await supabase
            .from("fiches_jours")
            .upsert(jourEntries as any, {
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
      queryClient.invalidateQueries({ queryKey: ["finisseurs-conducteur"] });
      // PAS de toast (sauvegarde silencieuse)
    },
    onError: (error) => {
      console.error("Auto-save fiche failed:", error);
      toast({
        variant: "destructive",
        title: "❌ Erreur de sauvegarde automatique",
        description: "Vos modifications n'ont PAS été enregistrées. Vérifiez votre connexion et réessayez.",
        duration: 6000,
      });
    },
  });
};
