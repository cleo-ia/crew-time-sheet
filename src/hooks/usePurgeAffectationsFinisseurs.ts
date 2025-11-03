import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const usePurgeAffectationsFinisseurs = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const purgeAffectations = async (semaine: string) => {
    if (!semaine) {
      toast.error("Veuillez spécifier une semaine");
      return null;
    }

    setIsLoading(true);

    try {
      // Compter d'abord les affectations à supprimer
      const { count, error: countError } = await supabase
        .from("affectations_finisseurs_jours")
        .select("*", { count: "exact", head: true })
        .eq("semaine", semaine);

      if (countError) throw countError;

      // Supprimer les affectations
      const { error: deleteError } = await supabase
        .from("affectations_finisseurs_jours")
        .delete()
        .eq("semaine", semaine);

      if (deleteError) throw deleteError;

      // Invalider les queries
      await queryClient.invalidateQueries({ queryKey: ["affectations-finisseurs"] });
      await queryClient.invalidateQueries({ queryKey: ["finisseurs-by-conducteur"] });
      
      toast.success(`${count || 0} affectation(s) supprimée(s) pour ${semaine}`, {
        description: "Les fiches vides ont été conservées"
      });

      return { deleted: count || 0, semaine };
    } catch (err: any) {
      console.error("[usePurgeAffectationsFinisseurs] Error:", err);
      toast.error("Erreur lors de la suppression", {
        description: err.message
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { purgeAffectations, isLoading };
};
