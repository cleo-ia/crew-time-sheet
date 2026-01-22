import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AffectationFinisseurJour {
  id: string;
  finisseur_id: string;
  conducteur_id: string;
  chantier_id: string;
  date: string;
  semaine: string;
}

// Récupérer toutes les affectations d'une semaine
export const useAffectationsFinisseursJours = (semaine: string) => {
  return useQuery({
    queryKey: ["affectations-finisseurs-jours", semaine],
    queryFn: async () => {
      if (!semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .select("*")
        .eq("semaine", semaine);
      
      if (error) throw error;
      return data as AffectationFinisseurJour[];
    },
    enabled: !!semaine,
  });
};

// Récupérer les affectations d'un conducteur pour une semaine
export const useAffectationsByConducteur = (conducteurId: string, semaine: string) => {
  return useQuery({
    queryKey: ["affectations-finisseurs-jours", conducteurId, semaine],
    queryFn: async () => {
      if (!conducteurId || !semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .select("*")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", semaine);
      
      if (error) throw error;
      return data as AffectationFinisseurJour[];
    },
    enabled: !!conducteurId && !!semaine,
  });
};

// Récupérer les IDs uniques des finisseurs affectés par un conducteur pour une semaine donnée
export const useAffectationsPreviousWeekByConducteur = (conducteurId: string, previousWeek: string) => {
  return useQuery({
    queryKey: ["affectations-finisseurs-jours", "previous", conducteurId, previousWeek],
    queryFn: async () => {
      if (!conducteurId || !previousWeek) return [];
      
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", previousWeek);
      
      if (error) throw error;
      
      // Retourner uniquement les IDs uniques des finisseurs
      const uniqueIds = [...new Set((data || []).map(a => a.finisseur_id))];
      return uniqueIds;
    },
    enabled: !!conducteurId && !!previousWeek,
  });
};

// Récupérer les IDs uniques des finisseurs affectés par un conducteur pour la semaine actuelle
export const useAffectationsCurrentWeekByConducteur = (conducteurId: string, semaine: string) => {
  return useQuery({
    queryKey: ["affectations-finisseurs-jours", "current", conducteurId, semaine],
    queryFn: async () => {
      if (!conducteurId || !semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id")
        .eq("conducteur_id", conducteurId)
        .eq("semaine", semaine);
      
      if (error) throw error;
      
      // Retourner uniquement les IDs uniques des finisseurs
      const uniqueIds = [...new Set((data || []).map(a => a.finisseur_id))];
      return uniqueIds;
    },
    enabled: !!conducteurId && !!semaine,
  });
};

// Récupérer les finisseurs partiellement affectés (1-4 jours) dans la semaine
export const useFinisseursPartiellementAffectes = (semaine: string) => {
  return useQuery({
    queryKey: ["finisseurs-partiellement-affectes", semaine],
    queryFn: async () => {
      if (!semaine) return [];
      
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id")
        .eq("semaine", semaine);
      
      if (error) throw error;
      
      // Compter le nombre de jours pour chaque finisseur
      const countMap = new Map<string, number>();
      (data || []).forEach(a => {
        countMap.set(a.finisseur_id, (countMap.get(a.finisseur_id) || 0) + 1);
      });
      
      // Retourner uniquement ceux avec 1 à 4 jours (partiels)
      return Array.from(countMap.entries())
        .filter(([_, count]) => count >= 1 && count <= 4)
        .map(([id, _]) => id);
    },
    enabled: !!semaine,
  });
};

// Créer ou mettre à jour une affectation
// Note: entreprise_id is auto-filled by trigger set_entreprise_from_chantier
export const useUpsertAffectationJour = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (affectation: Omit<AffectationFinisseurJour, "id">) => {
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .upsert(affectation as any, {
          onConflict: "finisseur_id,date",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs-jours"] });
      queryClient.invalidateQueries({ queryKey: ["finisseurs-conducteur"], exact: false });
      toast({
        title: "✅ Affectation enregistrée",
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

// Supprimer une affectation
export const useDeleteAffectationJour = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ finisseurId, date }: { finisseurId: string; date: string }) => {
      const { error } = await supabase
        .from("affectations_finisseurs_jours")
        .delete()
        .eq("finisseur_id", finisseurId)
        .eq("date", date);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs-jours"] });
      queryClient.invalidateQueries({ queryKey: ["finisseurs-conducteur"], exact: false });
      toast({
        title: "✅ Affectation supprimée",
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