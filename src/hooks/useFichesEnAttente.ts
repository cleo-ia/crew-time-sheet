import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FicheEnAttenteConducteur {
  conducteurId: string;
  conducteurNom: string;
  conducteurPrenom: string;
  nbFiches: number;
}

export interface FichesEnAttenteData {
  total: number;
  parConducteur: FicheEnAttenteConducteur[];
}

export const useFichesEnAttente = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["fiches-en-attente", entrepriseId],
    queryFn: async (): Promise<FichesEnAttenteData> => {
      if (!entrepriseId) {
        return { total: 0, parConducteur: [] };
      }

      // Récupérer les fiches VALIDE_CHEF avec leurs chantiers
      const { data: fiches, error } = await supabase
        .from("fiches")
        .select(`
          id,
          chantier_id,
          chantiers!inner (
            id,
            conducteur_id,
            entreprise_id
          )
        `)
        .eq("statut", "VALIDE_CHEF")
        .eq("chantiers.entreprise_id", entrepriseId);

      if (error) {
        console.error("Erreur lors de la récupération des fiches en attente:", error);
        return { total: 0, parConducteur: [] };
      }

      if (!fiches || fiches.length === 0) {
        return { total: 0, parConducteur: [] };
      }

      // Grouper par conducteur_id
      const conducteurCounts: Record<string, number> = {};
      fiches.forEach((fiche: any) => {
        const conducteurId = fiche.chantiers?.conducteur_id;
        if (conducteurId) {
          conducteurCounts[conducteurId] = (conducteurCounts[conducteurId] || 0) + 1;
        }
      });

      // Récupérer les noms des conducteurs
      const conducteurIds = Object.keys(conducteurCounts);
      if (conducteurIds.length === 0) {
        return { total: fiches.length, parConducteur: [] };
      }

      const { data: conducteurs, error: conducteurError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom")
        .in("id", conducteurIds);

      if (conducteurError) {
        console.error("Erreur lors de la récupération des conducteurs:", conducteurError);
        return { total: fiches.length, parConducteur: [] };
      }

      const parConducteur: FicheEnAttenteConducteur[] = (conducteurs || []).map((c) => ({
        conducteurId: c.id,
        conducteurNom: c.nom || "",
        conducteurPrenom: c.prenom || "",
        nbFiches: conducteurCounts[c.id] || 0,
      })).sort((a, b) => b.nbFiches - a.nbFiches);

      return {
        total: fiches.length,
        parConducteur,
      };
    },
    enabled: !!entrepriseId,
  });
};
