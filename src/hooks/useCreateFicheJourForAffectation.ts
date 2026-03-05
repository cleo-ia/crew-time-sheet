import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateFicheJourParams {
  finisseurId: string;
  conducteurId: string;
  date: string;
  semaine: string;
  chantierId: string; // ✅ Maintenant obligatoire
}

export const useCreateFicheJourForAffectation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ finisseurId, conducteurId, date, semaine, chantierId }: CreateFicheJourParams) => {
      console.log(`[useCreateFicheJourForAffectation] Creating fiche_jour for ${finisseurId} on ${date} (chantier: ${chantierId})`);

      // ✅ CORRECTION: chantier_id est maintenant obligatoire
      if (!chantierId) {
        throw new Error("chantierId est obligatoire pour créer une fiche");
      }

      // Fetch is_ecole flag
      const { data: chantierData } = await supabase
        .from("chantiers")
        .select("is_ecole")
        .eq("id", chantierId)
        .maybeSingle();
      const isEcole = !!(chantierData as any)?.is_ecole;

      // 1. Vérifier/créer la fiche avec chantier_id
      const { data: existingFiche } = await supabase
        .from("fiches")
        .select("id")
        .eq("semaine", semaine)
        .eq("salarie_id", finisseurId)
        .eq("chantier_id", chantierId)
        .maybeSingle();

      let ficheId: string;

      if (existingFiche) {
        ficheId = existingFiche.id;
      } else {
        // entreprise_id auto-filled by trigger set_fiche_entreprise_id
        const { data: newFiche, error: ficheError } = await supabase
          .from("fiches")
          .insert({
            semaine,
            user_id: conducteurId,
            salarie_id: finisseurId,
            chantier_id: chantierId, // ✅ chantier_id obligatoire
            statut: "BROUILLON",
          } as any)
          .select("id")
          .single();

        if (ficheError) throw ficheError;
        ficheId = newFiche.id;
      }

      // 2. Vérifier si le fiche_jour existe déjà pour cette date
      const { data: existingJour } = await supabase
        .from("fiches_jours")
        .select("id")
        .eq("fiche_id", ficheId)
        .eq("date", date)
        .maybeSingle();

      if (existingJour) {
        console.log(`[useCreateFicheJourForAffectation] Jour already exists for ${date}`);
        return { ficheId, created: false };
      }

      // 3. Déterminer les heures par défaut selon le jour de la semaine
      const dateObj = new Date(date + "T00:00:00");
      const dayOfWeek = dateObj.getDay(); // 0=Dimanche, 1=Lundi, ..., 5=Vendredi
      const defaultHours = isEcole ? 7 : (dayOfWeek === 5 ? 7 : 8);

      console.log(`[CreateFicheJour] Création pour date=${date}, jour=${dayOfWeek}, heures=${defaultHours}, isEcole=${isEcole}`);

      // 4. Créer le fiche_jour avec les valeurs par défaut harmonisées
      // entreprise_id auto-filled by trigger set_entreprise_from_fiche
      const { error: jourError } = await supabase
        .from("fiches_jours")
        .insert({
          fiche_id: ficheId,
          date,
          heures: defaultHours,
          HNORM: defaultHours,
          HI: 0,
          PA: isEcole ? false : true,
          repas_type: isEcole ? null : 'PANIER',
          T: isEcole ? 0 : 1,
          code_trajet: isEcole ? null : 'A_COMPLETER',
          trajet_perso: false,
          heure_debut: null,
          heure_fin: null,
          pause_minutes: 0,
          code_chantier_du_jour: null,
          ville_du_jour: null,
        } as any);

      if (jourError) throw jourError;

      console.log(`[useCreateFicheJourForAffectation] Created fiche_jour with ${defaultHours}h`);
      return { ficheId, created: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiches_jours"] });
    },
    onError: (error) => {
      console.error("[useCreateFicheJourForAffectation] Error:", error);
    },
  });
};
