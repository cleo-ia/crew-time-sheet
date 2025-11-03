import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Utilisateur {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  auth_user_id: string | null;
  role?: string;
  agence_interim?: string | null;
  role_metier?: 'macon' | 'finisseur' | null;
}

// Get users with a specific role
export const useUtilisateursByRole = (role?: string) => {
  return useQuery({
    queryKey: ["utilisateurs", role],
    queryFn: async () => {
      if (!role) {
        const { data, error } = await supabase
          .from("utilisateurs")
          .select("*")
          .order("nom");
        
        if (error) throw error;
        return data;
      }

      // Handle "interimaire" - users with agence_interim
      if (role === "interimaire") {
        const { data, error } = await supabase
          .from("utilisateurs")
          .select("*")
          .not("agence_interim", "is", null)
          .neq("agence_interim", "")
          .order("nom");
        
        if (error) throw error;
        return data || [];
      }

      // Handle "finisseur" - users with role_metier = 'finisseur'
      if (role === "finisseur") {
        const { data, error } = await supabase
          .from("utilisateurs")
          .select("*")
          .eq("role_metier", "finisseur")
          .order("nom");
        
        if (error) throw error;
        return data || [];
      }

      // Handle "macon" - users with role_metier = 'macon'
      if (role === "macon") {
        const { data, error } = await supabase
          .from("utilisateurs")
          .select("*")
          .eq("role_metier", "macon")
          .order("nom");
        
        if (error) throw error;
        return data || [];
      }

      // Handle valid roles (admin, rh, conducteur, chef)
      // Get user IDs for this role
      const { data: userRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", role as any);

      if (roleError) throw roleError;
      if (!userRoles || userRoles.length === 0) return [];

      // Get utilisateurs for these auth_user_ids (not id!)
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: users, error: usersError } = await supabase
        .from("utilisateurs")
        .select("*")
        .in("auth_user_id", userIds)
        .order("nom");

      if (usersError) throw usersError;

      // Attach role to each user
      return users?.map(u => ({ ...u, role })) || [];
    },
  });
};

// Get all users
export const useUtilisateurs = () => {
  return useQuery({
    queryKey: ["utilisateurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("*")
        .order("nom");
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateUtilisateur = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: { nom: string; prenom: string; email: string; role?: string; agence_interim?: string; role_metier?: 'macon' | 'finisseur' }) => {
      // First create in utilisateurs
      const { data: utilisateur, error: userError } = await supabase
        .from("utilisateurs")
        .insert({
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          agence_interim: user.agence_interim || null,
          role_metier: user.role_metier || null,
          id: crypto.randomUUID(), // Generate UUID for user
        })
        .select()
        .single();
      
      if (userError) throw userError;

      // Only assign role if it's a valid auth role (admin, rh, conducteur, chef)
      const validRoles = ['admin', 'rh', 'conducteur', 'chef'];
      if (user.role && validRoles.includes(user.role)) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: utilisateur.id,
            role: user.role as any,
          }]);
        
        if (roleError) throw roleError;
      }
      
      return utilisateur;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "utilisateurs" || query.queryKey[0] === "all-users-admin"
      });
      toast({
        title: "Utilisateur créé",
        description: "L'utilisateur a été créé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de créer l'utilisateur: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateUtilisateur = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: (Partial<Utilisateur> & { role_metier?: 'macon' | 'finisseur' | null }) & { id: string }) => {
      const { data, error } = await supabase
        .from("utilisateurs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "utilisateurs" || 
          query.queryKey[0] === "all-users-admin" ||
          query.queryKey[0] === "rh-consolidated" ||
          query.queryKey[0] === "rh-details" ||
          query.queryKey[0] === "rh-employee-detail"
      });
      toast({
        title: "Utilisateur modifié",
        description: "Les modifications ont été enregistrées.",
      });
    },
  });
};

export const useDeleteUtilisateur = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utilisateurs")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "utilisateurs" || 
          query.queryKey[0] === "all-users-admin" ||
          query.queryKey[0] === "rh-consolidated" ||
          query.queryKey[0] === "rh-details" ||
          query.queryKey[0] === "rh-employee-detail"
      });
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès.",
      });
    },
  });
};

// Get all employees from utilisateurs table (includes finisseurs, interimaires, chefs)
export const useAllSalaries = () => {
  return useQuery({
    queryKey: ["all-salaries"],
    queryFn: async () => {
      // Get all utilisateurs (finisseurs, intérimaires, chefs)
      const { data: users, error: usersError } = await supabase
        .from("utilisateurs")
        .select("id, prenom, nom, email")
        .order("nom", { ascending: true });

      if (usersError) throw usersError;
      return users || [];
    },
  });
};
