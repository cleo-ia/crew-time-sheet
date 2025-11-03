import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFicheDetailForEdit = (chantierId: string, semaine: string) => {
  return useQuery({
    queryKey: ["fiche-detail-edit", chantierId, semaine],
    queryFn: async () => {
      const { data: fiches, error } = await supabase
        .from("fiches")
        .select(`
          id,
          salarie_id,
          statut,
          chantier_id,
          semaine,
          fiches_jours (
            id,
            date,
            heures,
            HNORM,
            HI,
            PA,
            T,
            pause_minutes,
            code_chantier_du_jour,
            ville_du_jour,
            trajet_perso,
            total_jour
          )
        `)
        .eq("chantier_id", chantierId)
        .eq("semaine", semaine);
      
      if (error) throw error;

      // Enrich with salarie info
      const enrichedFiches = await Promise.all(
        (fiches || []).map(async (fiche) => {
          // D'abord essayer de récupérer depuis utilisateurs (source de vérité)
          let salarieInfo = null;

          const { data: utilisateur } = await supabase
            .from("utilisateurs")
            .select("id, nom, prenom, email, agence_interim")
            .eq("id", fiche.salarie_id)
            .maybeSingle();

          if (utilisateur) {
            salarieInfo = {
              id: utilisateur.id,
              nom: utilisateur.nom,
              prenom: utilisateur.prenom,
              email: utilisateur.email,
              agence_interim: utilisateur.agence_interim,
            };
          } else {
            // Fallback vers affectations_view si utilisateur non trouvé
            const { data: affectation } = await supabase
              .from("affectations_view")
              .select("macon_id, macon_nom, macon_prenom, macon_email")
              .eq("chantier_id", chantierId)
              .eq("macon_id", fiche.salarie_id)
              .maybeSingle();
            
            if (affectation) {
              salarieInfo = {
                id: affectation.macon_id,
                nom: affectation.macon_nom,
                prenom: affectation.macon_prenom,
                email: affectation.macon_email,
              };
            }
          }

          return {
            ...fiche,
            salarie: salarieInfo,
          };
        })
      );
      
      return enrichedFiches;
    },
    enabled: !!chantierId && !!semaine,
  });
};
