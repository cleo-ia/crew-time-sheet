import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const usePurgeAffectations = () => {
  const purgeAffectationsByDateRange = async (startDate: string, endDate: string) => {
    try {
      const { error, count } = await supabase
        .from("affectations")
        .delete({ count: "exact" })
        .gte("date_debut", startDate)
        .lte("date_debut", endDate);

      if (error) throw error;

      toast({
        title: "✅ Affectations purgées",
        description: `${count || 0} affectation(s) supprimée(s)`,
      });

      return count || 0;
    } catch (error: any) {
      console.error("Erreur lors de la purge des affectations:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de purger les affectations",
        variant: "destructive",
      });
      return 0;
    }
  };

  return { purgeAffectationsByDateRange };
};
