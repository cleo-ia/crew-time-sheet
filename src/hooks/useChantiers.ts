import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Chantier {
  id: string;
  nom: string;
  code_chantier: string | null;
  client: string | null;
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
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["chantiers", entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("chantiers")
        .select(`
          *,
          chef:utilisateurs!chef_id(id, nom, prenom),
          conducteur:utilisateurs!conducteur_id(id, nom, prenom)
        `);
      
      // Filtrer par entreprise si disponible
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }
      
      const { data, error } = await query.order("nom");
      
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

      // Récupérer l'entreprise_id de l'utilisateur connecté
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("entreprise_id")
        .eq("user_id", user.id)
        .single();
      
      if (!roleData?.entreprise_id) throw new Error("Entreprise non trouvée");

      const { data, error } = await supabase
        .from("chantiers")
        .insert({
          ...chantier,
          created_by: user.id,
          entreprise_id: roleData.entreprise_id,
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