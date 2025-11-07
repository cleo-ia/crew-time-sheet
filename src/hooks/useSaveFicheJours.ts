import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { dayNameToDate } from "@/lib/date";

interface TimeEntry {
  employeeId: string;
  employeeName: string;
  ficheId?: string;
  days: {
    [key: string]: {
      hours: number;
      overtime: number;
      absent: boolean;
      panierRepas: boolean;
      trajet: boolean;
      trajetPerso: boolean;
      heuresIntemperie: number;
      chantierId?: string | null;
      chantierCode?: string | null;
      chantierVille?: string | null;
      chantierNom?: string | null;
    };
  };
}


export const useSaveFicheJours = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ entries, weekId }: { entries: TimeEntry[]; weekId: string }) => {
      console.log("💾 Saving fiche jours...", entries);
      
      // Collecter les chantierId
      const allChantierIds = new Set<string>();
      entries.forEach(entry => {
        Object.values(entry.days).forEach(day => {
          if (day.chantierId) allChantierIds.add(day.chantierId);
        });
      });

      // Requête unique
      const chantierCodeById = new Map<string, string>();
      if (allChantierIds.size > 0) {
        const { data: chantiers } = await supabase
          .from("chantiers")
          .select("id, code_chantier")
          .in("id", Array.from(allChantierIds));
        
        chantiers?.forEach(c => chantierCodeById.set(c.id, c.code_chantier));
      }
      
      for (const entry of entries) {
        if (!entry.ficheId) {
          console.warn("No ficheId for entry:", entry);
          continue;
        }

        // Pour chaque jour de la semaine
        for (const [dayName, dayData] of Object.entries(entry.days)) {
          const date = dayNameToDate(weekId, dayName as any);
          
          // Trouver le fiche_jour correspondant
          const { data: existingJour } = await supabase
            .from("fiches_jours")
            .select("id")
            .eq("fiche_id", entry.ficheId)
            .eq("date", date)
            .maybeSingle();
          
          if (existingJour) {
            // Mise à jour du fiche_jour existant
            // Fallback pour le code chantier
            const code = dayData.chantierCode 
              ?? chantierCodeById.get(dayData.chantierId || "") 
              ?? null;
            
            const { error: updateError } = await supabase
            .from("fiches_jours")
            .update({
              heures: dayData.hours,
              HNORM: dayData.hours,
              HI: dayData.heuresIntemperie,
              PA: dayData.panierRepas,
              T: dayData.trajet ? 1 : 0,
              trajet_perso: dayData.trajetPerso,
              code_chantier_du_jour: code,
              ville_du_jour: dayData.chantierVille || null,
            })
            .eq("id", existingJour.id);
            
            if (updateError) {
              console.error("Error updating fiche_jour:", updateError);
              throw updateError;
            }
          } else {
            console.warn(`No fiche_jour found for fiche ${entry.ficheId} on ${date}`);
          }
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiche-with-jours"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-detail-edit"] });
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["rh-summary"] });
      queryClient.invalidateQueries({ queryKey: ["rh-details"] });
      queryClient.invalidateQueries({ queryKey: ["rh-fiche-detail"] });
      queryClient.invalidateQueries({ queryKey: ["rh-employee-detail"] });
      
      toast({
        title: "Modifications enregistrées",
        description: "Les données ont été mises à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error saving fiche jours:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive",
      });
    },
  });
};
