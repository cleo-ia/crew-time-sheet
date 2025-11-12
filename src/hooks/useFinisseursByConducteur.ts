import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FicheJour {
  date: string;
  HNORM: number;
  HI: number;
  T: number;
  PA: boolean;
  trajet_perso?: boolean;
  code_chantier_du_jour?: string | null;
  ville_du_jour?: string | null;
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
  affectedDays?: Array<{ date: string; chantier_id: string; code_chantier?: string }>; // Dates ISO + ID chantier + code chantier des jours affectés
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
        .select("finisseur_id, date, chantier_id, chantiers!inner(code_chantier)")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", semaine);

      if (affError) throw affError;

      // 2. Extraire les IDs uniques des finisseurs
      const finisseurIds = [...new Set((affectations || []).map(a => a.finisseur_id))];

      if (finisseurIds.length === 0) return [];

      // 3. Construire la map d'affectations par finisseur
      const finisseurAffectationsMap = new Map<string, Array<{ date: string; chantier_id: string; code_chantier?: string }>>();
      (affectations || []).forEach((a: any) => {
        if (!finisseurAffectationsMap.has(a.finisseur_id)) {
          finisseurAffectationsMap.set(a.finisseur_id, []);
        }
        finisseurAffectationsMap.get(a.finisseur_id)!.push({ 
          date: a.date, 
          chantier_id: a.chantier_id,
          code_chantier: a.chantiers?.code_chantier || ""
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

      // 5. Pour chaque finisseur, récupérer sa fiche SI elle existe
      for (const finisseur of finisseurs) {
        const query = supabase
          .from("fiches")
          .select("id, total_heures")
          .eq("semaine", semaine)
          .eq("salarie_id", finisseur.id)
          .is("chantier_id", null);

        const { data: fiche } = await query
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fiche) {
          // Fiche existante : charger les données
          finisseur.totalHeures = fiche.total_heures || 0;

          // Récupérer les jours
          const { data: jours } = await supabase
            .from("fiches_jours")
            .select("date, HNORM, HI, T, PA, trajet_perso, code_chantier_du_jour, ville_du_jour")
            .eq("fiche_id", fiche.id)
            .order("date");

          finisseur.ficheJours = jours as FicheJour[];
          finisseur.paniers = jours?.filter((j: any) => j.PA).length || 0;
          finisseur.trajets = jours?.reduce((sum: number, j: any) => sum + (j.T || 0), 0) || 0;
          finisseur.intemperie = jours?.reduce((sum: number, j: any) => sum + (j.HI || 0), 0) || 0;

          // Vérifier signature
          const { data: signature } = await supabase
            .from("signatures")
            .select("id")
            .eq("fiche_id", fiche.id)
            .eq("signed_by", finisseur.id)
            .maybeSingle();

          finisseur.hasSigned = !!signature;
        } else {
          // Pas de fiche : laisser les valeurs par défaut (la fiche sera créée à la saisie)
          finisseur.ficheJours = [];
        }
      }

      return finisseurs;
    },
    enabled: !!conducteurId && !!semaine,
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
  });
};
