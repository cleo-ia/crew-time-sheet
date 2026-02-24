import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChefHistoriqueItem {
  id: string;
  semaine: string;
  chantierId: string;
  chantierNom: string;
  chantierCode: string;
  chantierVille: string;
  statut: string;
  nbMacons: number;
  totalHeures: number;
  createdAt: string;
}

export const useChefHistorique = (chefId: string | null) => {
  return useQuery({
    queryKey: ["chef-historique", chefId],
    queryFn: async () => {
      if (!chefId) return [];

      // 1. Récupérer tous les chantiers distincts via affectations_jours_chef (historique réel)
      const { data: affectations, error: affError } = await supabase
        .from("affectations_jours_chef")
        .select("chantier_id")
        .eq("chef_id", chefId);

      if (affError) throw affError;
      if (!affectations || affectations.length === 0) return [];

      const chantiers = [...new Set(affectations.map(a => a.chantier_id))].map(id => ({ id }));

      const chantierIds = chantiers.map(c => c.id);

      // 2. Récupérer les fiches avec les statuts appropriés
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select(`
          id,
          semaine,
          chantier_id,
          statut,
          total_heures,
          created_at,
          chantier:chantiers!chantier_id(
            nom,
            code_chantier,
            ville
          )
        `)
        .in("chantier_id", chantierIds)
        .in("statut", ["EN_SIGNATURE", "VALIDE_CHEF", "VALIDE_CONDUCTEUR", "AUTO_VALIDE", "ENVOYE_RH"])
        .order("semaine", { ascending: false })
        .order("created_at", { ascending: false });

      if (fichesError) throw fichesError;
      if (!fiches) return [];

      // 3. Pour chaque fiche, compter le nombre de maçons (salarie_id distincts)
      const ficheIds = fiches.map(f => f.id);
      
      // Récupérer les salariés distincts par fiche via fiches_jours
      const { data: joursData, error: joursError } = await supabase
        .from("fiches_jours")
        .select("fiche_id")
        .in("fiche_id", ficheIds);

      if (joursError) throw joursError;

      // Compter les jours par fiche (estimation du nombre de maçons)
      const maconsCountMap = new Map<string, number>();
      joursData?.forEach(j => {
        maconsCountMap.set(j.fiche_id, (maconsCountMap.get(j.fiche_id) || 0) + 1);
      });

      // 4. Grouper par chantier + semaine
      const groupedMap = new Map<string, ChefHistoriqueItem>();

      fiches.forEach(fiche => {
        const key = `${fiche.chantier_id}-${fiche.semaine}`;
        const chantier = fiche.chantier as any;
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            id: fiche.id, // On prend l'ID de la première fiche du groupe
            semaine: fiche.semaine,
            chantierId: fiche.chantier_id,
            chantierNom: chantier?.nom || "N/A",
            chantierCode: chantier?.code_chantier || "N/A",
            chantierVille: chantier?.ville || "N/A",
            statut: fiche.statut,
            nbMacons: Math.floor((maconsCountMap.get(fiche.id) || 0) / 5), // Diviser par 5 jours pour estimer nb maçons
            totalHeures: Number(fiche.total_heures) || 0,
            createdAt: fiche.created_at,
          });
        } else {
          const existing = groupedMap.get(key)!;
          existing.totalHeures += Number(fiche.total_heures) || 0;
          existing.nbMacons += Math.floor((maconsCountMap.get(fiche.id) || 0) / 5);
        }
      });

      const result = Array.from(groupedMap.values()).map(item => ({
        ...item,
        totalHeures: Math.round(item.totalHeures * 100) / 100,
      }));

      console.debug(`[ChefHistorique] Found ${result.length} grouped items for chef ${chefId}`);

      return result;
    },
    enabled: !!chefId,
  });
};
