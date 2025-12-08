import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEntrepriseId } from "@/lib/entreprise";
import { useToast } from "@/hooks/use-toast";

export interface Vehicule {
  id: string;
  immatriculation: string;
  marque?: string;
  modele?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export const useVehicules = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["vehicules", entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("vehicules")
        .select("*")
        .order("immatriculation");
      
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Vehicule[];
    },
  });
};

export const useActiveVehicules = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["vehicules", "active", entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("vehicules")
        .select("*")
        .eq("actif", true)
        .order("immatriculation");
      
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Vehicule[];
    },
  });
};

export const useCreateVehicule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vehicule: { immatriculation: string; marque?: string; modele?: string; actif: boolean }) => {
      // Récupérer l'entreprise_id avec fallback automatique
      const entrepriseId = await getCurrentEntrepriseId();
      
      const { data, error } = await supabase
        .from("vehicules")
        .insert({
          ...vehicule,
          entreprise_id: entrepriseId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast({
        title: "Véhicule ajouté",
        description: "Le véhicule a été ajouté avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le véhicule.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateVehicule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vehicule> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast({
        title: "Véhicule modifié",
        description: "Le véhicule a été modifié avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le véhicule.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteVehicule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast({
        title: "Véhicule supprimé",
        description: "Le véhicule a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le véhicule.",
        variant: "destructive",
      });
    },
  });
};