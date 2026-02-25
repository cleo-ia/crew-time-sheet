import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AbsenceLongueDuree = {
  id: string;
  salarie_id: string;
  entreprise_id: string;
  type_absence: string;
  date_debut: string;
  date_fin: string | null;
  motif: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  salarie?: {
    id: string;
    nom: string | null;
    prenom: string | null;
  };
};

export const useAbsencesLongueDuree = (entrepriseId?: string | null) => {
  return useQuery({
    queryKey: ["absences-longue-duree", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("absences_longue_duree" as any)
        .select(`
          *,
          salarie:utilisateurs!absences_longue_duree_salarie_id_fkey(id, nom, prenom)
        `)
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement absences longue durée:", error);
        throw error;
      }

      return (data || []) as unknown as AbsenceLongueDuree[];
    },
    enabled: !!entrepriseId,
  });
};

export const useCreateAbsenceLongueDuree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      salarie_id: string;
      entreprise_id: string;
      type_absence: string;
      date_debut: string;
      date_fin?: string | null;
      motif?: string | null;
      created_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("absences_longue_duree" as any)
        .insert(params as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences-longue-duree"] });
      toast.success("Absence longue durée créée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création", { description: error.message });
    },
  });
};

export const useUpdateAbsenceLongueDuree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      date_fin?: string | null;
      motif?: string | null;
      type_absence?: string;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("absences_longue_duree" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences-longue-duree"] });
      toast.success("Absence mise à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour", { description: error.message });
    },
  });
};

export const useDeleteAbsenceLongueDuree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("absences_longue_duree" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences-longue-duree"] });
      toast.success("Absence supprimée");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression", { description: error.message });
    },
  });
};
