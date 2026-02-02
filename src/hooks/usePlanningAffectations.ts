import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseISOWeek, getNextWeek } from "@/lib/weekUtils";
import { addDays, format } from "date-fns";

export interface PlanningAffectation {
  id: string;
  employe_id: string;
  chantier_id: string;
  jour: string;
  semaine: string;
  vehicule_id: string | null;
  created_by: string | null;
  entreprise_id: string;
  created_at: string;
  updated_at: string;
  // Jointures
  employe?: {
    id: string;
    prenom: string | null;
    nom: string | null;
    role_metier: string | null;
    libelle_emploi: string | null;
    agence_interim: string | null;
    adresse_domicile: string | null;
  };
  vehicule?: {
    id: string;
    immatriculation: string;
    marque: string | null;
    modele: string | null;
  } | null;
}

export const usePlanningAffectations = (semaine: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["planning-affectations", semaine, entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("planning_affectations")
        .select(`
          *,
          employe:utilisateurs!planning_affectations_employe_id_fkey(
            id, prenom, nom, role_metier, libelle_emploi, agence_interim, adresse_domicile
          ),
          vehicule:vehicules!planning_affectations_vehicule_id_fkey(
            id, immatriculation, marque, modele
          )
        `)
        .eq("semaine", semaine)
        .eq("entreprise_id", entrepriseId)
        .order("jour");

      if (error) throw error;
      return data as PlanningAffectation[];
    },
    enabled: !!entrepriseId && !!semaine,
  });
};

// Regrouper les affectations par chantier
export const usePlanningByChantier = (semaine: string) => {
  const { data: affectations, ...rest } = usePlanningAffectations(semaine);

  const byChantier = affectations?.reduce((acc, aff) => {
    if (!acc[aff.chantier_id]) {
      acc[aff.chantier_id] = [];
    }
    acc[aff.chantier_id].push(aff);
    return acc;
  }, {} as Record<string, PlanningAffectation[]>) || {};

  return { data: byChantier, affectations, ...rest };
};

// Créer ou mettre à jour une affectation
export const useUpsertPlanningAffectation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      employe_id: string;
      chantier_id: string;
      jour: string;
      semaine: string;
      vehicule_id?: string | null;
      entreprise_id: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("planning_affectations")
        .upsert({
          ...params,
          created_by: user?.user?.id || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "employe_id,jour,chantier_id,entreprise_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["planning-affectations", variables.semaine] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder l'affectation",
        variant: "destructive",
      });
    },
  });
};

// Supprimer une affectation
export const useDeletePlanningAffectation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { 
      employe_id: string; 
      jour: string; 
      semaine: string;
      entreprise_id: string;
    }) => {
      const { error } = await supabase
        .from("planning_affectations")
        .delete()
        .eq("employe_id", params.employe_id)
        .eq("jour", params.jour)
        .eq("entreprise_id", params.entreprise_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["planning-affectations", variables.semaine] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'affectation",
        variant: "destructive",
      });
    },
  });
};

// Supprimer toutes les affectations d'un employé sur un chantier pour une semaine
export const useRemoveEmployeFromChantier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      employe_id: string;
      chantier_id: string;
      semaine: string;
      entreprise_id: string;
    }) => {
      const { error } = await supabase
        .from("planning_affectations")
        .delete()
        .eq("employe_id", params.employe_id)
        .eq("chantier_id", params.chantier_id)
        .eq("semaine", params.semaine)
        .eq("entreprise_id", params.entreprise_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["planning-affectations", variables.semaine] 
      });
      toast({
        title: "Employé retiré",
        description: "L'employé a été retiré du chantier pour cette semaine.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer l'employé",
        variant: "destructive",
      });
    },
  });
};

// Mettre à jour le véhicule d'un employé sur un chantier
export const useUpdatePlanningVehicule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      employe_id: string;
      chantier_id: string;
      semaine: string;
      vehicule_id: string | null;
    }) => {
      const { error } = await supabase
        .from("planning_affectations")
        .update({ 
          vehicule_id: params.vehicule_id,
          updated_at: new Date().toISOString(),
        })
        .eq("employe_id", params.employe_id)
        .eq("chantier_id", params.chantier_id)
        .eq("semaine", params.semaine);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["planning-affectations", variables.semaine] 
      });
    },
  });
};

// Copier le planning d'une semaine vers une autre
export const useCopyPlanningWeek = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      sourceWeek: string;
      targetWeek: string;
      entreprise_id: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Récupérer les affectations de la semaine source
      const { data: sourceAffectations, error: fetchError } = await supabase
        .from("planning_affectations")
        .select("*")
        .eq("semaine", params.sourceWeek)
        .eq("entreprise_id", params.entreprise_id);

      if (fetchError) throw fetchError;
      if (!sourceAffectations || sourceAffectations.length === 0) {
        throw new Error("Aucune affectation à copier pour cette semaine");
      }

      // Calculer le décalage de jours entre les deux semaines
      const sourceMonday = parseISOWeek(params.sourceWeek);
      const targetMonday = parseISOWeek(params.targetWeek);
      const daysDiff = Math.round((targetMonday.getTime() - sourceMonday.getTime()) / (1000 * 60 * 60 * 24));

      // Créer les nouvelles affectations
      const newAffectations = sourceAffectations.map(aff => ({
        employe_id: aff.employe_id,
        chantier_id: aff.chantier_id,
        jour: format(addDays(new Date(aff.jour), daysDiff), "yyyy-MM-dd"),
        semaine: params.targetWeek,
        vehicule_id: aff.vehicule_id,
        created_by: user?.user?.id || null,
        entreprise_id: params.entreprise_id,
      }));

      // Supprimer les affectations existantes de la semaine cible
      await supabase
        .from("planning_affectations")
        .delete()
        .eq("semaine", params.targetWeek)
        .eq("entreprise_id", params.entreprise_id);

      // Insérer les nouvelles
      const { error: insertError } = await supabase
        .from("planning_affectations")
        .insert(newAffectations);

      if (insertError) throw insertError;

      return newAffectations.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["planning-affectations", variables.targetWeek] 
      });
      toast({
        title: "Planning copié",
        description: `${count} affectations copiées vers ${variables.targetWeek}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de copier le planning",
        variant: "destructive",
      });
    },
  });
};

// Calculer les jours de la semaine (L-V)
export const getWeekDays = (semaine: string) => {
  const monday = parseISOWeek(semaine);
  return [0, 1, 2, 3, 4].map(offset => {
    const date = addDays(monday, offset);
    return {
      date: format(date, "yyyy-MM-dd"),
      dayName: format(date, "EEEE", { locale: undefined }).charAt(0).toUpperCase(),
      fullName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"][offset],
    };
  });
};
