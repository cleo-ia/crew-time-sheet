import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EmployeeData {
  employeeId: string;
  employeeName: string;
  dailyHours: {
    date: string;
    heures: number;
    pause_minutes: number;
    heure_debut?: string;
    heure_fin?: string;
    HNORM?: number;
    HI?: number;
    T?: number;
    PA?: boolean;
    trajet_perso?: boolean;
    code_chantier_du_jour?: string;
    ville_du_jour?: string;
  }[];
}

export interface SaveFicheParams {
  semaine: string;
  chantierId: string | null;
  employeesData: EmployeeData[];
  statut?: "BROUILLON" | "EN_SIGNATURE" | "VALIDE_CHEF" | "AUTO_VALIDE";
  userId: string; // Chef ou Conducteur qui crée la fiche
}

export const useSaveFiche = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveFicheParams) => {
      const { semaine, chantierId, employeesData, statut = "BROUILLON", userId } = params;

      // Normaliser la semaine au format ISO attendu: YYYY-Sww
      let semaineValue = semaine;
      const isoWeekRegex = /^\d{4}-(W|S)\d{2}$/;
      if (!isoWeekRegex.test(semaineValue)) {
        try {
          const d = new Date(semaine);
          if (!isNaN(d.getTime())) {
            // date-fns v3 tokens
            const { format } = await import("date-fns");
            semaineValue = format(d, "yyyy-'S'II");
          }
        } catch {}
      }

      // Pour chaque employé, créer une fiche
      const fichePromises = employeesData.map(async (employee) => {
      // 1. Vérifier si la fiche existe
        let query = supabase
          .from("fiches")
          .select("id, statut, user_id")
          .eq("semaine", semaineValue)
          .eq("salarie_id", employee.employeeId);
          // user_id supprimé du filtre pour éviter les doublons si plusieurs chefs modifient

        if (chantierId) {
          query = query.eq("chantier_id", chantierId);
        } else {
          query = query.is("chantier_id", null);
        }

        const { data: existingFiche } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 🔒 BLOQUER SI DÉJÀ TRANSMISE AU CONDUCTEUR OU AUX RH
        const statutsBloquants = ["VALIDE_CONDUCTEUR", "ENVOYE_RH"];
        if (existingFiche && statutsBloquants.includes(existingFiche.statut)) {
          const message = existingFiche.statut === "VALIDE_CONDUCTEUR"
            ? "Cette fiche a déjà été transmise au conducteur et ne peut plus être modifiée."
            : "Cette fiche a déjà été envoyée aux RH et ne peut plus être modifiée.";
          throw new Error(message);
        }

        let ficheId: string;

        if (existingFiche) {
          // Mettre à jour la fiche existante
          const { data: updatedFiche, error: updateError } = await supabase
            .from("fiches")
            .update({
              statut,
              total_heures: employee.dailyHours.reduce((sum, day) => sum + day.heures, 0),
            })
            .eq("id", existingFiche.id)
            .select()
            .single();

          if (updateError) throw updateError;
          ficheId = updatedFiche.id;
        } else {
          // Créer une nouvelle fiche
          const { data: newFiche, error: insertError } = await supabase
            .from("fiches")
            .insert({
              semaine: semaineValue,
              chantier_id: chantierId,
              salarie_id: employee.employeeId,
              user_id: userId,
              statut,
              total_heures: employee.dailyHours.reduce((sum, day) => sum + day.heures, 0),
            })
            .select()
            .single();

          if (insertError) throw insertError;
          ficheId = newFiche.id;
        }

        // 2. Supprimer les anciennes entrées journalières
        await supabase.from("fiches_jours").delete().eq("fiche_id", ficheId);

        // 3. Insérer les nouvelles entrées journalières
        const jourEntries = employee.dailyHours.map((day) => ({
          fiche_id: ficheId,
          date: day.date,
          heures: day.heures,
          pause_minutes: day.pause_minutes,
          heure_debut: day.heure_debut,
          heure_fin: day.heure_fin,
          HNORM: day.HNORM,
          HI: day.HI,
          T: day.T,
          PA: day.PA,
          trajet_perso: day.trajet_perso ?? false,
          code_chantier_du_jour: day.code_chantier_du_jour || null,
          ville_du_jour: day.ville_du_jour || null,
          // total_jour est une colonne générée, ne pas l'insérer
        }));

        const { error: joursError } = await supabase
          .from("fiches_jours")
          .insert(jourEntries);

        if (joursError) throw joursError;

        return ficheId;
      });

      const ficheIds = await Promise.all(fichePromises);
      return ficheIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      toast({
        title: "Fiche enregistrée",
        description: "Les heures ont été enregistrées avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error saving fiche:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message
        : "Une erreur est survenue lors de l'enregistrement.";
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};
