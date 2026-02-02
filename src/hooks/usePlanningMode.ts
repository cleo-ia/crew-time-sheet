import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";

/**
 * Hook centralisé pour déterminer si le mode planning est actif pour une semaine donnée.
 * 
 * Le planning est considéré comme "actif" si un conducteur l'a explicitement validé
 * via la table planning_validations.
 * 
 * Tant qu'il n'est pas validé, l'application fonctionne en mode "legacy" :
 * - Pas de badge "Jour non affecté"
 * - Tous les jours sont éditables
 * - Les totaux incluent tous les jours travaillés
 * - Le chef compose son équipe manuellement via "Gérer mon équipe"
 * 
 * IMPORTANT: Ce hook utilise useCurrentEntrepriseId() pour récupérer l'entreprise
 * de façon robuste (localStorage + fallback user_roles), évitant les faux négatifs
 * quand localStorage est vide/incohérent.
 */
export const usePlanningMode = (semaine: string) => {
  // ✅ FIX: Utiliser useCurrentEntrepriseId au lieu de localStorage direct
  const { data: entrepriseId } = useCurrentEntrepriseId();
  
  const { data: isActive = false, isLoading } = useQuery({
    queryKey: ["planning-mode", entrepriseId, semaine],
    queryFn: async () => {
      if (!entrepriseId || !semaine) return false;
      
      const { data, error } = await supabase
        .from("planning_validations")
        .select("id")
        .eq("entreprise_id", entrepriseId)
        .eq("semaine", semaine)
        .maybeSingle();
      
      if (error) throw error;
      return data !== null;
    },
    enabled: !!entrepriseId && !!semaine,
    staleTime: 30000, // Cache 30 secondes pour éviter trop de requêtes
  });
  
  return { isActive, isLoading };
};
