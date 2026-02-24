import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISOWeek } from "@/lib/weekUtils";
import { addDays, format } from "date-fns";
import { Star } from "lucide-react";

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

  // Récupérer le chantier principal du chef (pour l'indicateur visuel)
  const { data: chefChantierPrincipal } = useQuery({
    queryKey: ["chef-chantier-principal", chefId],
    queryFn: async () => {
      if (!chefId) return null;
      
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("chantier_principal_id")
        .eq("id", chefId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.chantier_principal_id || null;
    },
    enabled: !!chefId,
  });

  // Planning = unique source de vérité quand semaine + chefId sont fournis
  const chantiers = (() => {
    const planningList = chantiersPlanning || [];
    
    // Quand semaine + chefId sont fournis, le planning est l'unique source
    if (semaine && chefId) {
      return planningList.sort((a, b) => a.nom.localeCompare(b.nom));
    }
    
    // Sinon (conducteur, allowAll, pas de semaine) : source de base
    const baseList = chantiersBase || [];
    return baseList.sort((a, b) => a.nom.localeCompare(b.nom));
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
          chantiers.map((chantier) => {
            const isPrincipal = chefChantierPrincipal === chantier.id;
            
            return (
              <SelectItem key={chantier.id} value={chantier.id} className={compact ? "text-sm" : "text-base"}>
                {compact ? (
                  <span className="flex items-center gap-1">
                    {isPrincipal && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                    {chantier.code_chantier} - {chantier.nom}
                    {isPrincipal && <span className="text-[10px] text-amber-600 font-medium ml-1">(Mes heures)</span>}
                  </span>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-1.5">
                      {isPrincipal && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                      {chantier.nom}
                      {isPrincipal && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          Mes heures
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {chantier.code_chantier} • {chantier.ville}
                    </span>
                  </div>
                )}
              </SelectItem>
            );
          })
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
