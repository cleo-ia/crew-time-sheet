import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";

export interface AffectationJourChef {
  id: string;
  affectation_id: string | null;
  macon_id: string;
  chef_id: string;
  chantier_id: string;
  jour: string; // date ISO
  semaine: string;
  entreprise_id: string | null;
  created_at?: string;
  updated_at?: string;
}

// Récupérer toutes les affectations jours d'une semaine
export const useAffectationsJoursChef = (semaine: string) => {
  return useQuery({
    queryKey: ["affectations-jours-chef", semaine],
    queryFn: async () => {
      if (!semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .select("*")
        .eq("semaine", semaine);
      
      if (error) throw error;
      return data as AffectationJourChef[];
    },
    enabled: !!semaine,
  });
};

// Récupérer les affectations jours par chef pour une semaine
export const useAffectationsJoursByChef = (chefId: string | null, semaine: string) => {
  return useQuery({
    queryKey: ["affectations-jours-chef", "by-chef", chefId, semaine],
    queryFn: async () => {
      if (!chefId || !semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .select("*")
        .eq("chef_id", chefId)
        .eq("semaine", semaine);
      
      if (error) throw error;
      return data as AffectationJourChef[];
    },
    enabled: !!chefId && !!semaine,
  });
};

// Récupérer les jours affectés pour un maçon sur une semaine
export const useAffectationsJoursByMacon = (maconId: string | null, semaine: string) => {
  return useQuery({
    queryKey: ["affectations-jours-chef", "by-macon", maconId, semaine],
    queryFn: async () => {
      if (!maconId || !semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .select("*")
        .eq("macon_id", maconId)
        .eq("semaine", semaine);
      
      if (error) throw error;
      return data as AffectationJourChef[];
    },
    enabled: !!maconId && !!semaine,
  });
};

// Créer ou mettre à jour une affectation jour
export const useUpsertAffectationJourChef = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (affectation: Omit<AffectationJourChef, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .upsert(affectation, {
          onConflict: "macon_id,jour",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-jours-chef"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error.message,
      });
    },
  });
};

// Supprimer une affectation jour
export const useDeleteAffectationJourChef = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ maconId, jour }: { maconId: string; jour: string }) => {
      const { error } = await supabase
        .from("affectations_jours_chef")
        .delete()
        .eq("macon_id", maconId)
        .eq("jour", jour);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-jours-chef"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error.message,
      });
    },
  });
};

// Mettre à jour tous les jours d'un membre en une fois (pour ce chef uniquement)
export const useUpdateJoursForMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      maconId, 
      chefId, 
      chantierId, 
      semaine, 
      affectationId,
      entrepriseId,
      selectedDays // Array de noms de jours : ["Lundi", "Mardi", ...]
    }: { 
      maconId: string;
      chefId: string;
      chantierId: string;
      semaine: string;
      affectationId: string | null;
      entrepriseId: string;
      selectedDays: string[];
    }) => {
      // D'abord supprimer les affectations existantes pour CE CHEF et ce membre cette semaine
      // (ne pas supprimer les affectations des autres chefs)
      const { error: deleteError } = await supabase
        .from("affectations_jours_chef")
        .delete()
        .eq("macon_id", maconId)
        .eq("chef_id", chefId)
        .eq("semaine", semaine);
      
      if (deleteError) throw deleteError;
      
      // Si aucun jour sélectionné, on s'arrête là
      if (selectedDays.length === 0) {
        return [];
      }
      
      // Calculer les dates ISO pour chaque jour sélectionné
      const monday = parseISOWeek(semaine);
      const dayIndexMap: Record<string, number> = {
        "Lundi": 0,
        "Mardi": 1,
        "Mercredi": 2,
        "Jeudi": 3,
        "Vendredi": 4,
      };
      
      const affectationsToInsert = selectedDays.map(dayName => ({
        macon_id: maconId,
        chef_id: chefId,
        chantier_id: chantierId,
        jour: format(addDays(monday, dayIndexMap[dayName] || 0), "yyyy-MM-dd"),
        semaine,
        affectation_id: affectationId,
        entreprise_id: entrepriseId,
      }));
      
      // Insérer les nouvelles affectations
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .insert(affectationsToInsert)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-jours-chef"] });
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      toast({
        title: "✅ Jours d'affectation mis à jour",
        duration: 2000,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error.message,
      });
    },
  });
};

// Créer les affectations jours par défaut (tous les jours) lors de l'ajout d'un membre
export const useCreateDefaultAffectationsJours = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      maconId, 
      chefId, 
      chantierId, 
      semaine, 
      affectationId,
      entrepriseId
    }: { 
      maconId: string;
      chefId: string;
      chantierId: string;
      semaine: string;
      affectationId: string | null;
      entrepriseId: string;
    }) => {
      const monday = parseISOWeek(semaine);
      const daysToCreate = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
      const dayIndexMap: Record<string, number> = {
        "Lundi": 0,
        "Mardi": 1,
        "Mercredi": 2,
        "Jeudi": 3,
        "Vendredi": 4,
      };
      
      const affectationsToInsert = daysToCreate.map(dayName => ({
        macon_id: maconId,
        chef_id: chefId,
        chantier_id: chantierId,
        jour: format(addDays(monday, dayIndexMap[dayName]), "yyyy-MM-dd"),
        semaine,
        affectation_id: affectationId,
        entreprise_id: entrepriseId,
      }));
      
      // Utiliser upsert pour éviter les erreurs de doublon
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .upsert(affectationsToInsert, { onConflict: "macon_id,jour" })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-jours-chef"] });
    },
    onError: (error: any) => {
      console.error("Erreur création affectations jours par défaut:", error);
    },
  });
};

// Helper pour obtenir les noms de jours à partir des dates ISO
export const getDayNamesFromDates = (dates: string[], semaine: string): string[] => {
  const monday = parseISOWeek(semaine);
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  
  return dates.map(dateStr => {
    const date = new Date(dateStr + "T00:00:00");
    return dayNames[date.getDay()];
  }).filter(name => ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].includes(name));
};
