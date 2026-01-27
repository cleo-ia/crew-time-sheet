import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEntrepriseId } from "./useCurrentEntrepriseId";

export interface LigneMateriau {
  id?: string;
  categorie: string;
  designation: string;
  unite: string;
  quantite: number;
  reel_charge?: number | null;
}

export interface FicheTransportMateriaux {
  id?: string;
  entreprise_id: string;
  chantier_id: string;
  conducteur_id: string;
  semaine_livraison: number;
  jour_livraison: string;
  moyen_transport: string;
  responsable_depot: string | null;
  statut: string;
  transmise_at?: string | null;
  created_at?: string;
  updated_at?: string;
  lignes?: LigneMateriau[];
}

export const useFichesTransportMateriaux = (conducteurId: string | null) => {
  const { data: entrepriseId } = useCurrentEntrepriseId();

  return useQuery({
    queryKey: ["fiches-transport-materiaux", conducteurId, entrepriseId],
    queryFn: async () => {
      if (!conducteurId || !entrepriseId) return [];

      const { data, error } = await supabase
        .from("fiches_transport_materiaux")
        .select(`
          *,
          chantier:chantiers(nom, code_chantier, ville, adresse, chef:utilisateurs!chantiers_chef_id_fkey(prenom, nom)),
          lignes:fiches_transport_materiaux_lignes(*)
        `)
        .eq("conducteur_id", conducteurId)
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!conducteurId && !!entrepriseId,
  });
};

export const useCreateFicheTransportMateriaux = () => {
  const queryClient = useQueryClient();
  const { data: entrepriseId } = useCurrentEntrepriseId();

  return useMutation({
    mutationFn: async (fiche: Omit<FicheTransportMateriaux, "id" | "entreprise_id" | "created_at" | "updated_at">) => {
      if (!entrepriseId) throw new Error("Entreprise non trouvée");

      // 1. Créer la fiche principale
      const { data: newFiche, error: ficheError } = await supabase
        .from("fiches_transport_materiaux")
        .insert({
          entreprise_id: entrepriseId,
          chantier_id: fiche.chantier_id,
          conducteur_id: fiche.conducteur_id,
          semaine_livraison: fiche.semaine_livraison,
          jour_livraison: fiche.jour_livraison,
          moyen_transport: fiche.moyen_transport,
          responsable_depot: fiche.responsable_depot,
          statut: fiche.statut || "BROUILLON",
        })
        .select()
        .single();

      if (ficheError) throw ficheError;

      // 2. Créer les lignes si présentes
      if (fiche.lignes && fiche.lignes.length > 0) {
        const lignesData = fiche.lignes.map(ligne => ({
          fiche_id: newFiche.id,
          categorie: ligne.categorie,
          designation: ligne.designation,
          unite: ligne.unite,
          quantite: ligne.quantite,
          entreprise_id: entrepriseId,
        }));

        const { error: lignesError } = await supabase
          .from("fiches_transport_materiaux_lignes")
          .insert(lignesData);

        if (lignesError) throw lignesError;
      }

      return newFiche;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches-transport-materiaux"] });
    },
  });
};

export const useUpdateFicheTransportMateriaux = () => {
  const queryClient = useQueryClient();
  const { data: entrepriseId } = useCurrentEntrepriseId();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FicheTransportMateriaux> & { id: string; lignes?: LigneMateriau[] }) => {
      if (!entrepriseId) throw new Error("Entreprise non trouvée");

      // 1. Mettre à jour la fiche
      const { error: ficheError } = await supabase
        .from("fiches_transport_materiaux")
        .update({
          chantier_id: updates.chantier_id,
          semaine_livraison: updates.semaine_livraison,
          jour_livraison: updates.jour_livraison,
          moyen_transport: updates.moyen_transport,
          responsable_depot: updates.responsable_depot,
          statut: updates.statut,
          transmise_at: updates.transmise_at,
        })
        .eq("id", id);

      if (ficheError) throw ficheError;

      // 2. Remplacer les lignes si fournies
      if (updates.lignes !== undefined) {
        // Supprimer les anciennes lignes
        await supabase
          .from("fiches_transport_materiaux_lignes")
          .delete()
          .eq("fiche_id", id);

        // Insérer les nouvelles lignes
        if (updates.lignes.length > 0) {
          const lignesData = updates.lignes.map(ligne => ({
            fiche_id: id,
            categorie: ligne.categorie,
            designation: ligne.designation,
            unite: ligne.unite,
            quantite: ligne.quantite,
            entreprise_id: entrepriseId,
          }));

          const { error: lignesError } = await supabase
            .from("fiches_transport_materiaux_lignes")
            .insert(lignesData);

          if (lignesError) throw lignesError;
        }
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches-transport-materiaux"] });
    },
  });
};

export const useDeleteFicheTransportMateriaux = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fiches_transport_materiaux")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches-transport-materiaux"] });
    },
  });
};
