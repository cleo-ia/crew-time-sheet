import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FicheJour {
  date: string;
  heures?: number;
  HNORM: number;
  HI: number;
  T: number;
  PA: boolean;
  trajet_perso?: boolean;
  code_trajet?: string | null;
  code_chantier_du_jour?: string | null;
  ville_du_jour?: string | null;
  commentaire?: string | null;
  repas_type?: "PANIER" | "RESTO" | null;
}

export interface FinisseurWithFiche {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  totalHeures: number;
  paniers: number;
  trajets: number;
  intemperie: number;
  hasSigned: boolean;
  ficheJours?: FicheJour[];
  isConducteur?: boolean;
  affectedDays?: Array<{ date: string; chantier_id: string }>; // Dates ISO + ID chantier des jours affectés
}

export const useFinisseursByConducteur = (
  conducteurId: string | null,
  semaine: string
) => {
  return useQuery({
    queryKey: ["finisseurs-conducteur", conducteurId, semaine],
    queryFn: async () => {
      if (!conducteurId || !semaine) return [];

      // 1. PRIORITÉ : Récupérer TOUS les finisseurs affectés depuis affectations_finisseurs_jours
      const { data: affectations, error: affError } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id, date, chantier_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", semaine);

      if (affError) throw affError;

      // 2. Extraire les IDs uniques des finisseurs
      const finisseurIds = [...new Set((affectations || []).map(a => a.finisseur_id))];

      if (finisseurIds.length === 0) return [];

      // 3. Construire la map d'affectations par finisseur
      const finisseurAffectationsMap = new Map<string, Array<{ date: string; chantier_id: string }>>();
      (affectations || []).forEach(a => {
        if (!finisseurAffectationsMap.has(a.finisseur_id)) {
          finisseurAffectationsMap.set(a.finisseur_id, []);
        }
        finisseurAffectationsMap.get(a.finisseur_id)!.push({ 
          date: a.date, 
          chantier_id: a.chantier_id 
        });
      });

      // 4. Charger les informations utilisateurs de ces finisseurs
      const { data: utilisateurs, error: usersError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, email")
        .in("id", finisseurIds);

      if (usersError) throw usersError;

      const finisseurs: FinisseurWithFiche[] = (utilisateurs || []).map(u => ({
        id: u.id,
        nom: u.nom || "",
        prenom: u.prenom || "",
        email: u.email,
        totalHeures: 0,
        paniers: 0,
        trajets: 0,
        intemperie: 0,
        hasSigned: false,
        affectedDays: finisseurAffectationsMap.get(u.id) || [],
      }));

      // 5. Pour chaque finisseur, récupérer TOUTES ses fiches (multi-chantier)
      for (const finisseur of finisseurs) {
        const { data: fichesEmploye } = await supabase
          .from("fiches")
          .select("id, total_heures, chantier_id")
          .eq("semaine", semaine)
          .eq("salarie_id", finisseur.id);

        if (fichesEmploye && fichesEmploye.length > 0) {
          // Charger les ficheJours de TOUTES les fiches
          const allFicheJours: FicheJour[] = [];
          let totalHeures = 0;
          let allSigned = true;

          for (const fiche of fichesEmploye) {
            totalHeures += fiche.total_heures || 0;

            const { data: jours } = await supabase
              .from("fiches_jours")
              .select("date, heures, HNORM, HI, T, PA, trajet_perso, code_trajet, code_chantier_du_jour, ville_du_jour, commentaire, repas_type")
              .eq("fiche_id", fiche.id)
              .order("date");

            if (jours) {
              allFicheJours.push(...(jours as FicheJour[]));
            }

            const { data: signature } = await supabase
              .from("signatures")
              .select("id")
              .eq("fiche_id", fiche.id)
              .eq("signed_by", finisseur.id)
              .maybeSingle();

            if (!signature) allSigned = false;
          }

          finisseur.ficheJours = allFicheJours;
          finisseur.totalHeures = totalHeures;
          finisseur.paniers = allFicheJours.filter(j => j.PA).length;
          finisseur.trajets = allFicheJours.reduce((sum, j) => sum + (j.T || 0), 0);
          finisseur.intemperie = allFicheJours.reduce((sum, j) => sum + (j.HI || 0), 0);
          finisseur.hasSigned = allSigned;
        } else {
          finisseur.ficheJours = [];
        }
      }

      return finisseurs;
    },
    enabled: !!conducteurId && !!semaine,
    refetchOnMount: "always",    // ✅ Toujours refetch au montage (après save + retour)
    staleTime: 0,                // ✅ Données toujours considérées stale (force refetch)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
  });
};
