import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISOWeek } from "@/lib/weekUtils";
import { addDays, format } from "date-fns";

interface ChantierSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  chefId?: string;
  conducteurId?: string;
  compact?: boolean;
  allowAll?: boolean;
  disabled?: boolean;
  semaine?: string; // Nouveau: pour récupérer les chantiers du planning
}

export const ChantierSelector = ({ value, onChange, chefId, conducteurId, compact = false, allowAll = false, disabled = false, semaine }: ChantierSelectorProps) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  // Récupérer les chantiers de base (chef_id ou conducteur)
  const { data: chantiersBase, isLoading: isLoadingBase } = useQuery({
    queryKey: ["chantiers", chefId, conducteurId, entrepriseId],
    queryFn: async () => {
      let query = supabase
        .from("chantiers")
        .select("id, nom, code_chantier, ville, actif, chef_id, conducteur_id")
        .eq("actif", true);
      
      // Filtrer par entreprise
      if (entrepriseId) {
        query = query.eq("entreprise_id", entrepriseId);
      }
      
      if (chefId) {
        query = query.eq("chef_id", chefId);
      }
      
      if (conducteurId) {
        // Récupérer les chef_ids liés au conducteur via conducteurs_chefs
        const { data: chefsData } = await supabase
          .from("conducteurs_chefs")
          .select("chef_id")
          .eq("conducteur_id", conducteurId);
        
        const chefIds = chefsData?.map(c => c.chef_id) || [];
        
        if (chefIds.length === 0) {
          // Aucun chef lié, retourner un tableau vide
          return [];
        }
        
        query = query.in("chef_id", chefIds);
      }
      
      const { data, error } = await query.order("nom");
      
      if (error) throw error;
      return data;
    },
  });

  // Récupérer les chantiers depuis le planning pour la semaine donnée (chefs multi-chantiers)
  const { data: chantiersPlanning, isLoading: isLoadingPlanning } = useQuery({
    queryKey: ["chantiers-planning", chefId, semaine, entrepriseId],
    queryFn: async () => {
      if (!chefId || !semaine || !entrepriseId) return [];
      
      // Récupérer les affectations planning du chef pour cette semaine
      const { data: affectations, error } = await supabase
        .from("planning_affectations")
        .select("chantier_id")
        .eq("employe_id", chefId)
        .eq("semaine", semaine)
        .eq("entreprise_id", entrepriseId);
      
      if (error) throw error;
      if (!affectations || affectations.length === 0) return [];
      
      // Récupérer les chantiers uniques
      const chantierIds = [...new Set(affectations.map(a => a.chantier_id))];
      
      const { data: chantiers, error: chantiersError } = await supabase
        .from("chantiers")
        .select("id, nom, code_chantier, ville, actif, chef_id, conducteur_id")
        .in("id", chantierIds)
        .eq("actif", true);
      
      if (chantiersError) throw chantiersError;
      return chantiers || [];
    },
    enabled: !!chefId && !!semaine && !!entrepriseId,
  });

  // Fusionner les chantiers (base + planning) et dédupliquer
  const chantiers = (() => {
    const baseList = chantiersBase || [];
    const planningList = chantiersPlanning || [];
    
    const merged = new Map<string, typeof baseList[0]>();
    
    // Ajouter d'abord les chantiers de base
    baseList.forEach(c => merged.set(c.id, c));
    
    // Ajouter les chantiers du planning
    planningList.forEach(c => {
      if (!merged.has(c.id)) {
        merged.set(c.id, c);
      }
    });
    
    // Trier par nom
    return Array.from(merged.values()).sort((a, b) => a.nom.localeCompare(b.nom));
  })();

  const isLoading = isLoadingBase || isLoadingPlanning;

  // Sélection automatique si un seul chantier est disponible
  useEffect(() => {
    if (chantiers && chantiers.length === 1 && !value) {
      onChange(chantiers[0].id);
    }
  }, [chantiers, value, onChange]);

  const isDisabled = disabled || isLoading || (!allowAll && !chefId && !conducteurId);

  return (
    <Select value={value} onValueChange={onChange} disabled={isDisabled}>
      <SelectTrigger disabled={isDisabled} className={compact ? "h-9 text-sm" : "w-full h-12 text-base"}>
        <SelectValue placeholder={
          isLoading 
            ? "Chargement..." 
            : (!chefId && !conducteurId)
            ? (compact ? "Sélectionner..." : "Sélectionnez d'abord un utilisateur...")
            : chantiers?.length === 0
            ? "Aucun chantier"
            : compact && chantiers && chantiers.length > 0 && value
            ? chantiers.find(c => c.id === value)?.code_chantier || "Choisir..."
            : "Sélectionner un chantier..."
        } />
      </SelectTrigger>
      <SelectContent>
        {chantiers && chantiers.length > 0 ? (
          chantiers.map((chantier) => (
            <SelectItem key={chantier.id} value={chantier.id} className={compact ? "text-sm" : "text-base"}>
              {compact ? (
                <span>{chantier.code_chantier} - {chantier.nom}</span>
              ) : (
                <div className="flex flex-col">
                  <span className="font-medium">{chantier.nom}</span>
                  <span className="text-xs text-muted-foreground">
                    {chantier.code_chantier} • {chantier.ville}
                  </span>
                </div>
              )}
            </SelectItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {(!chefId && !conducteurId)
              ? "Sélectionnez un utilisateur"
              : "Aucun chantier attribué"}
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
