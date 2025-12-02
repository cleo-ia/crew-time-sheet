import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Chantier {
  id: string;
  nom: string;
  code_chantier: string | null;
  ville: string | null;
  adresse: string | null;
  description: string | null;
  actif: boolean | null;
  chef_id: string | null;
  conducteur_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  created_at: string;
  updated_at: string;
}

export const useChantiers = () => {
  return useQuery({
    queryKey: ["chantiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chantiers")
        .select(`
          *,
          chef:utilisateurs!chef_id(id, nom, prenom),
          conducteur:utilisateurs!conducteur_id(id, nom, prenom)
        `)
        .order("nom");
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateChantier = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chantier: Omit<Chantier, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("chantiers")
        .insert({
          ...chantier,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chantiers"] });
      toast({
        title: "Chantier créé",
        description: "Le chantier a été créé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de créer le chantier: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateChantier = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Chantier> & { id: string }) => {
      const { data, error } = await supabase
        .from("chantiers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chantiers"] });
      toast({
        title: "Chantier modifié",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de modifier le chantier: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteChantier = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chantiers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chantiers"] });
      toast({
        title: "Chantier supprimé",
        description: "Le chantier a été supprimé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de supprimer le chantier: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
