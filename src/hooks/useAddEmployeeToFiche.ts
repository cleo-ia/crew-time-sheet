import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { dayNameToDate } from "@/lib/date";

interface AddEmployeeToFicheParams {
  chantierId: string;
  semaine: string;
  salarieId: string;
  conducteurId?: string;
}

export const useAddEmployeeToFiche = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chantierId, semaine, salarieId, conducteurId }: AddEmployeeToFicheParams) => {
      // 1. Vérifier si la fiche existe déjà pour cet employé cette semaine (peu importe le chantier)
      const { data: existingFiche } = await supabase
        .from("fiches")
        .select("id")
        .eq("semaine", semaine)
        .eq("salarie_id", salarieId)
        .maybeSingle();

      if (existingFiche) {
        throw new Error("Cet employé a déjà une fiche pour cette semaine. Un employé ne peut avoir qu'une seule fiche par semaine.");
      }

      // 2. Récupérer les informations du chantier pour avoir le code et la ville
      const { data: chantier, error: chantierError } = await supabase
        .from("chantiers")
        .select("code_chantier, ville, is_ecole")
        .eq("id", chantierId)
        .single();

      if (chantierError) throw chantierError;

      // 3. Determine if ECOLE chantier
      const isEcole = !!(chantier as any).is_ecole;

      // 3. Créer la fiche (entreprise_id auto-filled by trigger set_fiche_entreprise_id)
      const { data: newFiche, error: ficheError } = await supabase
        .from("fiches")
        .insert([{
          chantier_id: chantierId,
          semaine,
          salarie_id: salarieId,
          statut: "BROUILLON" as const,
          user_id: conducteurId,
          total_heures: isEcole ? 0 : 39, // 8+8+8+8+7 or 0 for ECOLE
        }] as any)
        .select()
        .single();

      if (ficheError) throw ficheError;

      // 4. Créer les 5 fiches_jours (Lundi-Vendredi) avec valeurs par défaut
      // entreprise_id auto-filled by trigger set_entreprise_from_fiche
      const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;
      const heuresParJour = isEcole 
        ? { Lundi: 0, Mardi: 0, Mercredi: 0, Jeudi: 0, Vendredi: 0 }
        : { Lundi: 8, Mardi: 8, Mercredi: 8, Jeudi: 8, Vendredi: 7 };

      const fichesJours = jours.map((jour) => {
        const date = dayNameToDate(semaine, jour);
        return {
          fiche_id: newFiche.id,
          date,
          heures: heuresParJour[jour],
          HNORM: heuresParJour[jour],
          HI: 0,
          T: isEcole ? 0 : 1,
          PA: isEcole ? false : true,
          repas_type: isEcole ? null : ("PANIER" as const),
          code_chantier_du_jour: chantier.code_chantier,
          ville_du_jour: chantier.ville,
          trajet_perso: false,
          code_trajet: isEcole ? null : "A_COMPLETER",
        };
      });

      const { error: joursError } = await supabase
        .from("fiches_jours")
        .insert(fichesJours as any);

      if (joursError) throw joursError;

      return newFiche;
    },
    onSuccess: () => {
      // Invalider les queries pour recharger les données
      queryClient.invalidateQueries({ queryKey: ["fiche-detail-edit"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-detail"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });

      toast({
        title: "Employé ajouté",
        description: "L'employé a été ajouté avec succès à la fiche.",
      });
    },
    onError: (error: any) => {
      console.error("Erreur lors de l'ajout de l'employé:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter l'employé.",
        variant: "destructive",
      });
    },
  });
};