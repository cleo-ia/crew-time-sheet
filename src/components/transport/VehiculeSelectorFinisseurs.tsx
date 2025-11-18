import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveVehicules } from "@/hooks/useVehicules";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VehiculeSelectorFinisseursProps {
  value: string;
  onChange: (value: string) => void;
  date: string;
  semaine: string;
  excludeFinisseurId?: string;
  localVehiculeUsage?: Map<string, Map<string, string>>; // 🆕 Pour validation temps réel
}

export const VehiculeSelectorFinisseurs = ({ 
  value, 
  onChange, 
  date, 
  semaine,
  excludeFinisseurId,
  localVehiculeUsage 
}: VehiculeSelectorFinisseursProps) => {
  const { data: vehicules = [], isLoading: isLoadingVehicules } = useActiveVehicules();

  // Récupérer les plaques déjà utilisées par d'autres finisseurs ce jour-là
  const { data: usedVehicules, isLoading: isLoadingUsed } = useQuery({
    queryKey: ["vehicules-finisseurs-used", semaine, date, excludeFinisseurId],
    queryFn: async () => {
      const { data: transportJours, error } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .select(`
          immatriculation,
          fiche_transport_finisseur_id,
          fiches_transport_finisseurs!inner(finisseur_id, utilisateurs!inner(prenom, nom))
        `)
        .eq("date", date)
        .eq("fiches_transport_finisseurs.semaine", semaine);

      if (error) throw error;

      const usedMap = new Map<string, { nom: string; id: string }>();
      
      transportJours?.forEach((jour: any) => {
        const finisseurId = jour.fiches_transport_finisseurs?.finisseur_id;
        
        // Ne pas marquer comme utilisé si c'est le finisseur actuel
        if (jour.immatriculation && finisseurId !== excludeFinisseurId) {
          const utilisateur = jour.fiches_transport_finisseurs?.utilisateurs;
          usedMap.set(jour.immatriculation, {
            nom: `${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}`.trim(),
            id: finisseurId
          });
        }
      });

      return usedMap;
    },
    enabled: !!date && !!semaine,
  });

  if (isLoadingVehicules || isLoadingUsed) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          </SelectValue>
        </SelectTrigger>
      </Select>
    );
  }

  if (vehicules.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Aucun véhicule disponible" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner une plaque" />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {vehicules.map((vehicule) => {
          // Vérification DB (existant)
          const isUsedInDB = usedVehicules?.has(vehicule.immatriculation);
          const usedByDB = usedVehicules?.get(vehicule.immatriculation);
          
          // 🆕 Vérification état local (temps réel)
          const dateUsage = localVehiculeUsage?.get(date);
          const localUserId = dateUsage?.get(vehicule.immatriculation);
          const isUsedLocally = localUserId && localUserId !== excludeFinisseurId;
          
          const isUsed = isUsedInDB || isUsedLocally;
          
          return (
            <SelectItem 
              key={vehicule.id} 
              value={vehicule.immatriculation} 
              className="font-mono"
              disabled={isUsed}
            >
              {vehicule.immatriculation}
              {isUsedInDB && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Utilisée par {usedByDB?.nom})
                </span>
              )}
              {isUsedLocally && !isUsedInDB && (
                <span className="text-xs text-muted-foreground ml-2">
                  (En cours d'attribution)
                </span>
              )}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
