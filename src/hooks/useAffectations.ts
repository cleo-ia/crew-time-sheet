import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Affectation {
  id: string;
  macon_id: string;
  chantier_id: string;
  date_debut: string;
  date_fin: string | null;
  created_at: string;
  updated_at: string;
}

export const useAffectations = () => {
  return useQuery({
    queryKey: ["affectations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affectations_view")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });
};

export const useAffectationsByMacon = (maconId: string) => {
  return useQuery({
    queryKey: ["affectations", "macon", maconId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affectations")
        .select("*")
        .eq("macon_id", maconId)
        .order("date_debut", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!maconId,
  });
};

export const useAffectationsByChef = (chefId: string) => {
  return useQuery({
    queryKey: ["affectations", "chef", chefId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affectations_view")
        .select("*")
        .eq("chef_id", chefId)
        .is("date_fin", null);
      
      if (error) throw error;
      return data;
    },
    enabled: !!chefId,
  });
};

export const useCreateAffectation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (affectation: Omit<Affectation, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("affectations")
        .insert(affectation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalider les queries pour rafraîchir l'UI
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
    },
  });
};

export const useUpdateAffectation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Affectation> & { id: string }) => {
      const { data, error } = await supabase
        .from("affectations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      toast({
        title: "Affectation modifiée",
        description: "Les modifications ont été enregistrées.",
      });
    },
  });
};

export const useDeleteAffectation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("affectations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      toast({
        title: "Affectation supprimée",
        description: "L'affectation a été supprimée avec succès.",
      });
    },
  });
};
