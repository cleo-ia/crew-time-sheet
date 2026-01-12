import { supabase } from "@/integrations/supabase/client";
import { parseISOWeek } from "@/lib/weekUtils";
import { format, addDays, isWeekend } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type TypeAbsence = Database["public"]["Enums"]["type_absence"];

/**
 * Mapping des types de congé vers les types d'absence des fiches_jours
 */
const typeCongeToAbsence: Record<string, TypeAbsence> = {
  "CP": "CP",
  "RTT": "RTT",
  "MALADIE": "AM",
  "AUTRE": "CPSS"
};

/**
 * Récupère les dates ouvrées (lundi-vendredi) d'une semaine
 */
function getWeekWorkDays(semaine: string): string[] {
  const monday = parseISOWeek(semaine);
  const dates: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    const date = addDays(monday, i);
    if (!isWeekend(date)) {
      dates.push(format(date, "yyyy-MM-dd"));
    }
  }
  
  return dates;
}

interface FicheToProcess {
  id: string;
  salarie_id: string | null;
  semaine: string | null;
}

/**
 * Injecte automatiquement les types d'absence pour les congés validés par RH.
 * Cette fonction est appelée lorsque des fiches sont transmises au service RH.
 * 
 * Pour chaque fiche transmise:
 * 1. Vérifie si le salarié a des demandes de congés validées par RH
 * 2. Pour chaque jour de la semaine couvert par une demande validée
 * 3. Met à jour le fiches_jours avec le type d'absence correspondant
 *    (seulement si aucune heure n'est déjà saisie)
 */
export async function injectValidatedLeaves(fiches: FicheToProcess[]): Promise<void> {
  if (!fiches || fiches.length === 0) return;

  console.log("🔄 Injection des congés validés pour", fiches.length, "fiche(s)");

  for (const fiche of fiches) {
    if (!fiche.salarie_id || !fiche.semaine) continue;

    try {
      // 1. Récupérer les demandes de congés validées RH pour ce salarié
      const { data: demandes, error: demandesError } = await supabase
        .from("demandes_conges")
        .select("id, date_debut, date_fin, type_conge")
        .eq("demandeur_id", fiche.salarie_id)
        .eq("statut", "VALIDEE_RH");

      if (demandesError) {
        console.error("Erreur récupération demandes congés:", demandesError);
        continue;
      }

      if (!demandes || demandes.length === 0) continue;

      // 2. Calculer les dates de la semaine (lundi-vendredi)
      const weekDates = getWeekWorkDays(fiche.semaine);

      // 3. Pour chaque jour de la semaine
      for (const dateStr of weekDates) {
        // Vérifier si une demande couvre ce jour
        const demandeCorrespondante = demandes.find(d => 
          dateStr >= d.date_debut && dateStr <= d.date_fin
        );

        if (!demandeCorrespondante) continue;

        // Mapper le type_conge vers type_absence
        const typeAbsence: TypeAbsence = typeCongeToAbsence[demandeCorrespondante.type_conge] || "CPSS";

        // 4. Vérifier si un fiches_jours existe déjà pour ce jour
        const { data: existingJour, error: existingError } = await supabase
          .from("fiches_jours")
          .select("id, heures, type_absence")
          .eq("fiche_id", fiche.id)
          .eq("date", dateStr)
          .maybeSingle();

        if (existingError) {
          console.error("Erreur vérification fiches_jours:", existingError);
          continue;
        }

        if (existingJour) {
          // Ne pas écraser si des heures sont déjà saisies (l'employé était présent)
          if (existingJour.heures > 0) {
            console.log(`⏭️ Jour ${dateStr} ignoré - ${existingJour.heures}h saisies`);
            continue;
          }

          // Mettre à jour le type_absence si non déjà défini ou différent
          if (existingJour.type_absence !== typeAbsence) {
            const { error: updateError } = await supabase
              .from("fiches_jours")
              .update({ type_absence: typeAbsence })
              .eq("id", existingJour.id);

            if (updateError) {
              console.error("Erreur mise à jour type_absence:", updateError);
            } else {
              console.log(`✅ Jour ${dateStr} mis à jour avec type_absence: ${typeAbsence}`);
            }
          }
        } else {
          // Créer une nouvelle entrée fiches_jours
          const { error: insertError } = await supabase
            .from("fiches_jours")
            .insert([{
              fiche_id: fiche.id,
              date: dateStr,
              heures: 0,
              HNORM: 0,
              HI: 0,
              PA: false,
              T: 0,
              type_absence: typeAbsence,
              pause_minutes: 0
            }]);

          if (insertError) {
            console.error("Erreur création fiches_jours:", insertError);
          } else {
            console.log(`✅ Nouveau jour ${dateStr} créé avec type_absence: ${typeAbsence}`);
          }
        }
      }
    } catch (error) {
      console.error("Erreur injection congés pour fiche", fiche.id, ":", error);
    }
  }

  console.log("✅ Injection des congés validés terminée");
}
