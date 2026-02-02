import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FicheJour, MaconWithFiche } from "./useMaconsByChantier";

export interface MaconFromAllChantiers extends MaconWithFiche {
  chantierId: string;
  chantierCode?: string;
}

export interface UseMaconsAllChantiersResult {
  isMultiChantier: boolean;
  allMacons: MaconFromAllChantiers[];
  isLoading: boolean;
}

/**
 * Hook pour récupérer TOUS les employés de TOUS les chantiers d'un chef multi-chantier.
 * - Si le chef n'a qu'un seul chantier → retourne isMultiChantier = false
 * - Si le chef a plusieurs chantiers → récupère tous les employés avec leur chantier d'origine
 */
export const useMaconsAllChantiersByChef = (
  chefId: string | undefined,
  semaine: string
): UseMaconsAllChantiersResult => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  const { data, isLoading } = useQuery({
    queryKey: ["macons-all-chantiers-chef", chefId, semaine, entrepriseId],
    queryFn: async (): Promise<{ isMultiChantier: boolean; allMacons: MaconFromAllChantiers[] }> => {
      if (!chefId || !semaine || !entrepriseId) {
        return { isMultiChantier: false, allMacons: [] };
      }

      // 1. Récupérer tous les chantier_id distincts où le chef a des affectations pour la semaine
      const { data: chefAffectations, error: affError } = await supabase
        .from("affectations_jours_chef")
        .select("chantier_id")
        .eq("chef_id", chefId)
        .eq("semaine", semaine)
        .eq("entreprise_id", entrepriseId);

      if (affError) {
        console.error("[useMaconsAllChantiersByChef] Erreur récupération chantiers:", affError);
        return { isMultiChantier: false, allMacons: [] };
      }

      // Dédupliquer les chantier_id
      const chantierIds = [...new Set((chefAffectations || []).map(a => a.chantier_id))];

      // Si 0 ou 1 chantier → pas multi-chantier
      if (chantierIds.length <= 1) {
        console.log(`[useMaconsAllChantiersByChef] Chef ${chefId} a ${chantierIds.length} chantier(s) → mono-chantier`);
        return { isMultiChantier: false, allMacons: [] };
      }

      console.log(`[useMaconsAllChantiersByChef] Chef ${chefId} a ${chantierIds.length} chantiers → multi-chantier`);

      // 2. Récupérer les infos des chantiers (pour avoir le code)
      const { data: chantiers } = await supabase
        .from("chantiers")
        .select("id, code_chantier, nom")
        .in("id", chantierIds);

      const chantierMap = new Map(
        (chantiers || []).map(c => [c.id, { code: c.code_chantier, nom: c.nom }])
      );

      // 3. Récupérer tous les employés affectés à ces chantiers pour la semaine
      const { data: allAffectations, error: allAffError } = await supabase
        .from("affectations_jours_chef")
        .select("macon_id, chantier_id")
        .eq("chef_id", chefId)
        .eq("semaine", semaine)
        .eq("entreprise_id", entrepriseId)
        .in("chantier_id", chantierIds);

      if (allAffError) {
        console.error("[useMaconsAllChantiersByChef] Erreur récupération employés:", allAffError);
        return { isMultiChantier: true, allMacons: [] };
      }

      // Dédupliquer par macon_id et garder le premier chantier_id trouvé
      const maconChantierMap = new Map<string, string>();
      for (const aff of allAffectations || []) {
        if (!maconChantierMap.has(aff.macon_id)) {
          maconChantierMap.set(aff.macon_id, aff.chantier_id);
        }
      }

      const maconIds = [...maconChantierMap.keys()];

      if (maconIds.length === 0) {
        return { isMultiChantier: true, allMacons: [] };
      }

      // 4. Charger les infos des employés
      const { data: utilisateurs, error: usersError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, email, agence_interim, role_metier")
        .in("id", maconIds)
        .eq("entreprise_id", entrepriseId);

      if (usersError) {
        console.error("[useMaconsAllChantiersByChef] Erreur chargement utilisateurs:", usersError);
        return { isMultiChantier: true, allMacons: [] };
      }

      // 5. Pour chaque employé, récupérer ses fiches_jours (de tous ses chantiers)
      const allMacons: MaconFromAllChantiers[] = await Promise.all(
        (utilisateurs || []).map(async (user) => {
          const chantierId = maconChantierMap.get(user.id) || "";
          const chantierInfo = chantierMap.get(chantierId);

          // Récupérer toutes les fiches de cet employé pour la semaine (tous chantiers)
          const { data: fiches } = await supabase
            .from("fiches")
            .select("id, chantier_id")
            .eq("salarie_id", user.id)
            .eq("semaine", semaine)
            .in("chantier_id", chantierIds);

          let ficheJours: FicheJour[] = [];

          if (fiches && fiches.length > 0) {
            const ficheIds = fiches.map(f => f.id);
            const { data: jours } = await supabase
              .from("fiches_jours")
              .select("id, date, heures, HNORM, pause_minutes, PA, T, HI, code_chantier_du_jour, ville_du_jour, trajet_perso, commentaire, code_trajet, repas_type")
              .in("fiche_id", ficheIds)
              .order("date");

            if (jours) {
              ficheJours = jours.map(j => ({
                id: j.id,
                date: j.date,
                heures: Number(j.heures || 0),
                HNORM: Number(j.HNORM || 0),
                pause_minutes: j.pause_minutes || 0,
                PA: j.PA || false,
                T: Number(j.T || 0),
                HI: Number(j.HI || 0),
                code_chantier_du_jour: j.code_chantier_du_jour || null,
                ville_du_jour: j.ville_du_jour || null,
                trajet_perso: !!j.trajet_perso,
                commentaire: j.commentaire || null,
                code_trajet: j.code_trajet || null,
                repas_type: j.repas_type || null,
              }));
            }
          }

          const isChef = user.id === chefId;
          const role = user.agence_interim ? "interimaire" : (user.role_metier || "macon");

          return {
            id: user.id,
            nom: user.nom || "",
            prenom: user.prenom || "",
            email: user.email || "",
            isChef,
            role,
            ficheJours,
            chantierId,
            chantierCode: chantierInfo?.code || undefined,
            signed: false,
            totalHeures: 0,
            paniers: 0,
            trajets: 0,
            intemperie: 0,
          };
        })
      );

      // Trier : chef en premier, puis par nom
      allMacons.sort((a, b) => {
        if (a.isChef && !b.isChef) return -1;
        if (!a.isChef && b.isChef) return 1;
        return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      });

      console.log(`[useMaconsAllChantiersByChef] ${allMacons.length} employés trouvés pour chef multi-chantier`);

      return { isMultiChantier: true, allMacons };
    },
    enabled: !!chefId && !!semaine && !!entrepriseId,
    staleTime: 30000,
  });

  return {
    isMultiChantier: data?.isMultiChantier ?? false,
    allMacons: data?.allMacons ?? [],
    isLoading,
  };
};
