import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEntrepriseId } from "@/lib/entreprise";
import { useToast } from "@/hooks/use-toast";

export interface Utilisateur {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  auth_user_id: string | null;
  role?: string;
  agence_interim?: string | null;
  role_metier?: 'macon' | 'finisseur' | 'grutier' | 'chef' | 'conducteur' | 'interimaire' | null;
  
  // Champs contractuels
  matricule?: string | null;
  echelon?: string | null;
  niveau?: string | null;
  degre?: string | null;
  statut?: string | null;
  libelle_emploi?: string | null;
  type_contrat?: string | null;
  horaire?: string | null;
  taux_horaire?: number | null;
  heures_supp_mensualisees?: number | null;
  forfait_jours?: boolean | null;
  salaire?: number | null;
}

// Get users with a specific role
export const useUtilisateursByRole = (role?: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["utilisateurs", role, entrepriseId],
    queryFn: async () => {
      if (!role) {
        let query = supabase.from("utilisateurs").select("*");
        if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
        const { data, error } = await query.order("nom");
        if (error) throw error;
        return data;
      }

      // Handle "interimaire" - users with agence_interim
      if (role === "interimaire") {
        let query = supabase.from("utilisateurs").select("*")
          .not("agence_interim", "is", null)
          .neq("agence_interim", "");
        if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
        const { data, error } = await query.order("nom");
        if (error) throw error;
        return data || [];
      }

      // Handle "finisseur" - users with role_metier = 'finisseur'
      if (role === "finisseur") {
        let query = supabase.from("utilisateurs").select("*").eq("role_metier", "finisseur");
        if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
        const { data, error } = await query.order("nom");
        if (error) throw error;
        return data || [];
      }

      // Handle "macon" - users with role_metier = 'macon'
      if (role === "macon") {
        let query = supabase.from("utilisateurs").select("*").eq("role_metier", "macon");
        if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
        const { data, error } = await query.order("nom");
        if (error) throw error;
        return data || [];
      }

      // Handle "grutier" - users with role_metier = 'grutier'
      if (role === "grutier") {
        let query = supabase.from("utilisateurs").select("*").eq("role_metier", "grutier");
        if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
        const { data, error } = await query.order("nom");
        if (error) throw error;
        return data || [];
      }

      // Handle "chef" and "conducteur" with UNION logic
      // Get both users with role_metier AND users with auth role
      if (role === "chef" || role === "conducteur") {
        // 1. Get users with role_metier = 'chef' or 'conducteur'
        let metierQuery = supabase.from("utilisateurs").select("*").eq("role_metier", role);
        if (entrepriseId) metierQuery = metierQuery.eq("entreprise_id", entrepriseId);
        const { data: roleMetierUsers, error: metierError } = await metierQuery;
        
        if (metierError) throw metierError;

        // 2. Get users with auth role (via user_roles) - filter by entreprise_id
        let rolesQuery = supabase.from("user_roles").select("user_id, role").eq("role", role as any);
        if (entrepriseId) rolesQuery = rolesQuery.eq("entreprise_id", entrepriseId);
        const { data: userRoles, error: roleError } = await rolesQuery;
        
        if (roleError) throw roleError;

        let authUsers: any[] = [];
        if (userRoles && userRoles.length > 0) {
          const userIds = userRoles.map(ur => ur.user_id);
          const { data: users, error: usersError } = await supabase
            .from("utilisateurs")
            .select("*")
            .in("auth_user_id", userIds);
          
          if (usersError) throw usersError;
          authUsers = users || [];
        }

        // 3. Combine and deduplicate using Map
        const userMap = new Map();
        
        // Add role_metier users first
        (roleMetierUsers || []).forEach(u => {
          userMap.set(u.id, { ...u, role });
        });
        
        // Add auth users (will overwrite if duplicate)
        authUsers.forEach(u => {
          userMap.set(u.id, { ...u, role });
        });

        // Convert back to array and sort
        const combinedUsers = Array.from(userMap.values());
        combinedUsers.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        
        return combinedUsers;
      }

      // Handle valid roles (admin, rh)
      // Get user IDs for this role - filter by entreprise_id
      let rolesQuery = supabase.from("user_roles").select("user_id, role").eq("role", role as any);
      if (entrepriseId) rolesQuery = rolesQuery.eq("entreprise_id", entrepriseId);
      const { data: userRoles, error: roleError } = await rolesQuery;

      if (roleError) throw roleError;
      if (!userRoles || userRoles.length === 0) return [];

      // Get utilisateurs for these auth_user_ids (not id!)
      const userIds = userRoles.map(ur => ur.user_id);
      let usersQuery = supabase.from("utilisateurs").select("*").in("auth_user_id", userIds);
      if (entrepriseId) usersQuery = usersQuery.eq("entreprise_id", entrepriseId);
      const { data: users, error: usersError } = await usersQuery.order("nom");

      if (usersError) throw usersError;

      // Attach role to each user
      return users?.map(u => ({ ...u, role })) || [];
    },
  });
};

// Get all users
export const useUtilisateurs = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["utilisateurs", entrepriseId],
    queryFn: async () => {
      let query = supabase.from("utilisateurs").select("*");
      if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
      const { data, error } = await query.order("nom");
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateUtilisateur = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: { 
      nom: string; 
      prenom: string; 
      email?: string;
      agence_interim?: string; 
      role_metier?: 'macon' | 'finisseur' | 'grutier' | 'chef' | 'conducteur' | 'interimaire';
      matricule?: string;
      echelon?: string;
      niveau?: string;
      degre?: string;
      statut?: string;
      libelle_emploi?: string;
      type_contrat?: string;
      horaire?: string;
      taux_horaire?: number;
      heures_supp_mensualisees?: number;
      forfait_jours?: boolean;
      salaire?: number;
    }) => {
      // Récupérer l'entreprise_id avec fallback automatique
      const entrepriseId = await getCurrentEntrepriseId();

      // Vérifier si un utilisateur avec le même nom/prénom existe déjà
      const nomTrimmed = user.nom.trim();
      const prenomTrimmed = user.prenom.trim();
      
      const { data: existing, error: checkError } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, role_metier, agence_interim")
        .eq("entreprise_id", entrepriseId)
        .ilike("nom", nomTrimmed)
        .ilike("prenom", prenomTrimmed)
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        const existingUser = existing[0];
        const details = existingUser.role_metier 
          ? `(${existingUser.role_metier})`
          : existingUser.agence_interim 
            ? `(intérimaire - ${existingUser.agence_interim})`
            : "";
        throw new Error(
          `Un utilisateur "${existingUser.prenom} ${existingUser.nom}" ${details} existe déjà. ` +
          `Utilisez la fonction de modification ou vérifiez le nom saisi.`
        );
      }

      // Create in utilisateurs with entreprise_id
      const { data: utilisateur, error: userError } = await supabase
        .from("utilisateurs")
        .insert({
          nom: user.nom,
          prenom: user.prenom,
          email: user.email || null,
          agence_interim: user.agence_interim || null,
          role_metier: user.role_metier || null,
          matricule: user.matricule || null,
          echelon: user.echelon || null,
          niveau: user.niveau || null,
          degre: user.degre || null,
          statut: user.statut || null,
          libelle_emploi: user.libelle_emploi || null,
          type_contrat: user.type_contrat || null,
          horaire: user.horaire || null,
          taux_horaire: user.taux_horaire || null,
          heures_supp_mensualisees: user.heures_supp_mensualisees || null,
          forfait_jours: user.forfait_jours || false,
          salaire: user.salaire || null,
          id: crypto.randomUUID(),
          entreprise_id: entrepriseId,
        })
        .select()
        .single();
      
      if (userError) throw userError;
      
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
    mutationFn: async ({ id, ...updates }: (Partial<Utilisateur> & { role_metier?: 'macon' | 'finisseur' | 'grutier' | null }) & { id: string }) => {
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

// Get users by multiple roles at once (for conducteur team management)
export const useUtilisateursByRoles = (roles: string[]) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["utilisateurs", "multi-roles", roles, entrepriseId],
    queryFn: async () => {
      if (!roles.length) return [];
      
      const results: (Utilisateur & { _roleType: string })[] = [];
      
      for (const role of roles) {
        let data: any[] = [];
        
        if (role === "interimaire") {
          // Intérimaires: users with agence_interim
          let query = supabase.from("utilisateurs").select("*")
            .not("agence_interim", "is", null)
            .neq("agence_interim", "");
          if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
          const { data: result, error } = await query.order("nom");
          if (error) throw error;
          data = result || [];
        } else if (role === "finisseur" || role === "macon" || role === "grutier") {
          // Role métier direct
          let query = supabase.from("utilisateurs").select("*").eq("role_metier", role as any);
          if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
          const { data: result, error } = await query.order("nom");
          if (error) throw error;
          data = result || [];
        }
        
        // Add _roleType to each user (avoid duplicates by checking if already in results)
        data.forEach(u => {
          if (!results.some(r => r.id === u.id)) {
            results.push({ ...u, _roleType: role });
          }
        });
      }
      
      // Sort by nom
      results.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      
      return results;
    },
    enabled: roles.length > 0,
  });
};

// Get all employees from utilisateurs table (includes finisseurs, interimaires, chefs)
export const useAllSalaries = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["all-salaries", entrepriseId],
    queryFn: async () => {
      let query = supabase.from("utilisateurs").select("id, prenom, nom, email");
      if (entrepriseId) query = query.eq("entreprise_id", entrepriseId);
      const { data: users, error: usersError } = await query.order("nom", { ascending: true });

      if (usersError) throw usersError;
      return users || [];
    },
  });
};
