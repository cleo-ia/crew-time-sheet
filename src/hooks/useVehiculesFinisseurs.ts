import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VehiculeFinisseur {
  id: string;
  immatriculation: string;
  marque?: string;
  modele?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export const useVehiculesFinisseurs = () => {
  return useQuery({
    queryKey: ["vehicules-finisseurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules_finisseurs")
        .select("*")
        .order("immatriculation");
      
      if (error) throw error;
      return data as VehiculeFinisseur[];
    },
  });
};

export const useActiveVehiculesFinisseurs = () => {
  return useQuery({
    queryKey: ["vehicules-finisseurs", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules_finisseurs")
        .select("*")
        .eq("actif", true)
        .order("immatriculation");
      
      if (error) throw error;
      return data as VehiculeFinisseur[];
    },
  });
};

export const useCreateVehiculeFinisseur = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vehicule: { immatriculation: string; marque?: string; modele?: string; actif: boolean }) => {
      const { data, error } = await supabase
        .from("vehicules_finisseurs")
        .insert(vehicule)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules-finisseurs"] });
      toast({
        title: "Véhicule finisseur ajouté",
        description: "Le véhicule a été ajouté avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le véhicule finisseur.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateVehiculeFinisseur = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VehiculeFinisseur> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicules_finisseurs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules-finisseurs"] });
      toast({
        title: "Véhicule finisseur modifié",
        description: "Le véhicule a été modifié avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le véhicule finisseur.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteVehiculeFinisseur = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicules_finisseurs")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules-finisseurs"] });
      toast({
        title: "Véhicule finisseur supprimé",
        description: "Le véhicule a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le véhicule finisseur.",
        variant: "destructive",
      });
    },
  });
};
