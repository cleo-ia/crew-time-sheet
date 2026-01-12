import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TypeConge } from "@/components/conges/DemandeCongeForm";

export type DemandeConge = {
  id: string;
  demandeur_id: string;
  entreprise_id: string;
  type_conge: TypeConge;
  date_debut: string;
  date_fin: string;
  motif: string | null;
  signature_data: string | null;
  statut: "EN_ATTENTE" | "VALIDEE_CONDUCTEUR" | "VALIDEE_RH" | "REFUSEE";
  validee_par_conducteur_id: string | null;
  validee_par_conducteur_at: string | null;
  validee_par_rh_id: string | null;
  validee_par_rh_at: string | null;
  refusee_par_id: string | null;
  refusee_par_at: string | null;
  motif_refus: string | null;
  created_at: string;
  updated_at: string;
  demandeur?: {
    id: string;
    nom: string | null;
    prenom: string | null;
  };
};

// Hook pour récupérer les demandes de congés (filtre selon le rôle via RLS)
export const useDemandesConges = (demandeurId?: string | null) => {
  return useQuery({
    queryKey: ["demandes-conges", demandeurId],
    queryFn: async () => {
      let query = supabase
        .from("demandes_conges")
        .select(`
          *,
          demandeur:utilisateurs!demandes_conges_demandeur_id_fkey(id, nom, prenom)
        `)
        .order("created_at", { ascending: false });

      // Si demandeurId est fourni, filtrer uniquement les demandes de ce demandeur
      if (demandeurId) {
        query = query.eq("demandeur_id", demandeurId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erreur chargement demandes congés:", error);
        throw error;
      }

      return (data || []) as DemandeConge[];
    },
    enabled: true,
  });
};

// Hook pour compter les demandes en attente (pour le badge du conducteur)
export const useDemandesEnAttente = (conducteurId?: string | null) => {
  return useQuery({
    queryKey: ["demandes-conges-en-attente", conducteurId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("demandes_conges")
        .select("*", { count: "exact", head: true })
        .eq("statut", "EN_ATTENTE");

      if (error) {
        console.error("Erreur comptage demandes en attente:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!conducteurId,
  });
};
