import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChantierSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  chefId?: string;
  conducteurId?: string;
  compact?: boolean;
  allowAll?: boolean;
  disabled?: boolean;
}

export const ChantierSelector = ({ value, onChange, chefId, conducteurId, compact = false, allowAll = false, disabled = false }: ChantierSelectorProps) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  const { data: chantiers, isLoading } = useQuery({
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
