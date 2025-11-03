import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VehiculeChefMacon {
  id: string;
  immatriculation: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export const useVehiculesChefsMacons = () => {
  return useQuery({
    queryKey: ["vehicules-chefs-macons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules_chefs_macons")
        .select("*")
        .order("immatriculation");
      
      if (error) throw error;
      return data as VehiculeChefMacon[];
    },
  });
};

export const useActiveVehiculesChefsMacons = () => {
  return useQuery({
    queryKey: ["vehicules-chefs-macons", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules_chefs_macons")
        .select("*")
        .eq("actif", true)
        .order("immatriculation");
      
      if (error) throw error;
      return data as VehiculeChefMacon[];
    },
  });
};

export const useCreateVehiculeChefMacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vehicule: { immatriculation: string; actif: boolean }) => {
      const { data, error } = await supabase
        .from("vehicules_chefs_macons")
        .insert(vehicule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules-chefs-macons"] });
      toast({
        title: "Véhicule chefs/maçons ajouté",
        description: "Le véhicule a été ajouté avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le véhicule chefs/maçons.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateVehiculeChefMacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VehiculeChefMacon> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicules_chefs_macons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules-chefs-macons"] });
      toast({
        title: "Véhicule chefs/maçons modifié",
        description: "Le véhicule a été modifié avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le véhicule chefs/maçons.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteVehiculeChefMacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicules_chefs_macons")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules-chefs-macons"] });
      toast({
        title: "Véhicule chefs/maçons supprimé",
        description: "Le véhicule a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le véhicule chefs/maçons.",
        variant: "destructive",
      });
    },
  });
};
