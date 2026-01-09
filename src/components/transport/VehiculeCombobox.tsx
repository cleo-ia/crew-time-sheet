import { useState } from "react";
import { Check, ChevronsUpDown, Truck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useActiveVehicules } from "@/hooks/useVehicules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Constante pour l'option "Véhicule perso" - sélectionnable plusieurs fois
const VEHICULE_PERSO_VALUE = "VEHICULE_PERSO";

interface VehiculeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Pour mode Chefs/Maçons (simple)
  otherVehiculesPlates?: string[];
  // Pour mode Finisseurs (avec vérification DB)
  date?: string;
  semaine?: string;
  excludeFinisseurId?: string;
  localVehiculeUsage?: Map<string, Map<string, string>>;
  // Pour exclure le chantier courant de la vérification cross-chantier (mode Maçons)
  currentChantierId?: string;
}

export const VehiculeCombobox = ({
  value,
  onChange,
  disabled = false,
  otherVehiculesPlates,
  date,
  semaine,
  excludeFinisseurId,
  localVehiculeUsage,
  currentChantierId,
}: VehiculeComboboxProps) => {
  const [open, setOpen] = useState(false);
  const normalizedValue = value || "";
  const { data: vehicules = [], isLoading: isLoadingVehicules } = useActiveVehicules();

  // Mode Finisseurs : récupérer les plaques déjà utilisées par d'autres finisseurs
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
        .eq("date", date!)
        .eq("fiches_transport_finisseurs.semaine", semaine!);

      if (error) throw error;

      const usedMap = new Map<string, { nom: string; id: string }>();
      
      transportJours?.forEach((jour: any) => {
        const finisseurId = jour.fiches_transport_finisseurs?.finisseur_id;
        
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
    enabled: !!date && !!semaine && !!excludeFinisseurId,
  });

  // Vérification croisée : véhicules utilisés par les DEUX équipes (Maçons ↔ Finisseurs)
  const { data: vehiculesUtilisesGlobal, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ["vehicules-all-teams-used", semaine, date, currentChantierId, excludeFinisseurId],
    queryFn: async () => {
      const usedMap = new Map<string, { type: 'macon' | 'finisseur'; nom: string; chantierId?: string }>();

      // 1. Véhicules utilisés par les MAÇONS
      const { data: transportMacons } = await supabase
        .from("fiches_transport_jours")
        .select(`
          immatriculation,
          fiche_transport:fiches_transport!inner(
            chantier_id,
            fiche:fiches!inner(
              semaine,
              chantier_id,
              chantier:chantiers(nom)
            )
          )
        `)
        .eq("date", date!)
        .eq("fiche_transport.fiche.semaine", semaine!);

      transportMacons?.forEach((jour: any) => {
        if (jour.immatriculation) {
          const chantierId = jour.fiche_transport?.chantier_id || jour.fiche_transport?.fiche?.chantier_id;
          const chantierNom = jour.fiche_transport?.fiche?.chantier?.nom || 'Chantier inconnu';
          
          usedMap.set(jour.immatriculation, {
            type: 'macon',
            nom: `Équipe maçons (${chantierNom})`,
            chantierId: chantierId
          });
        }
      });

      // 2. Véhicules utilisés par les FINISSEURS
      const { data: transportFinisseurs } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .select(`
          immatriculation,
          fiches_transport_finisseurs!inner(
            finisseur_id,
            semaine,
            utilisateurs!inner(prenom, nom)
          )
        `)
        .eq("date", date!)
        .eq("fiches_transport_finisseurs.semaine", semaine!);

      transportFinisseurs?.forEach((jour: any) => {
        if (jour.immatriculation && jour.fiches_transport_finisseurs) {
          const finisseurId = jour.fiches_transport_finisseurs.finisseur_id;
          
          // Ne pas écraser si déjà utilisé par maçons
          if (!usedMap.has(jour.immatriculation)) {
            const utilisateur = jour.fiches_transport_finisseurs.utilisateurs;
            const nom = `${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}`.trim();
            
            // Exclure le finisseur courant si on est en mode finisseur
            if (finisseurId !== excludeFinisseurId) {
              usedMap.set(jour.immatriculation, {
                type: 'finisseur',
                nom: `Finisseur ${nom}`
              });
            }
          }
        }
      });

      return usedMap;
    },
    enabled: !!date && !!semaine,
  });

  const isLoading = isLoadingVehicules || 
    (date && semaine && excludeFinisseurId ? isLoadingUsed : false) ||
    (date && semaine ? isLoadingGlobal : false);

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between font-mono">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      </Button>
    );
  }

  if (vehicules.length === 0) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        Aucun véhicule disponible
      </Button>
    );
  }

  const selectedVehicule = vehicules.find((v) => v.immatriculation === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-mono"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 opacity-50" />
            {value === VEHICULE_PERSO_VALUE ? (
              <span className="text-blue-600 dark:text-blue-400">Véhicule perso</span>
            ) : selectedVehicule ? (
              <span>{selectedVehicule.immatriculation}</span>
            ) : (
              <span className="text-muted-foreground">Sélectionner une plaque</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une plaque..." className="font-mono" />
          <CommandEmpty>Aucune plaque trouvée.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {/* Option Véhicule perso - toujours disponible, sélectionnable plusieurs fois */}
            <CommandItem
              value={VEHICULE_PERSO_VALUE}
              onSelect={() => {
                onChange(VEHICULE_PERSO_VALUE);
                setTimeout(() => setOpen(false), 50);
              }}
              className="font-normal text-blue-600 dark:text-blue-400"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  normalizedValue === VEHICULE_PERSO_VALUE ? "opacity-100" : "opacity-0"
                )}
              />
              <span>Véhicule perso</span>
              <span className="text-xs text-muted-foreground ml-2">(sélectionnable plusieurs fois)</span>
            </CommandItem>
            
            {/* Séparateur visuel */}
            <div className="my-1 border-t border-border" />

            {vehicules.map((vehicule) => {
              // Mode Chefs/Maçons : vérification simple
              const isUsedSimple = otherVehiculesPlates?.includes(vehicule.immatriculation) ?? false;
              
              // Mode Finisseurs : vérification DB + local
              const isUsedInDB = usedVehicules?.has(vehicule.immatriculation);
              const usedByDB = usedVehicules?.get(vehicule.immatriculation);
              
              const dateUsage = localVehiculeUsage?.get(date || '');
              const localUserId = dateUsage?.get(vehicule.immatriculation);
              const isUsedLocally = localUserId && localUserId !== excludeFinisseurId;
              
              // Vérification CROISÉE (Maçons ↔ Finisseurs)
              const globalUsage = vehiculesUtilisesGlobal?.get(vehicule.immatriculation);
              
              // Si mode Finisseurs → vérifier si utilisé par maçons
              const isUsedByMacons = excludeFinisseurId && globalUsage?.type === 'macon';
              
              // Si mode Maçons → vérifier si utilisé par finisseurs
              const isUsedByFinisseurs = !excludeFinisseurId && globalUsage?.type === 'finisseur';
              
              // Mode Maçons → vérifier si utilisé par AUTRE équipe maçons sur AUTRE chantier
              const isUsedByOtherMaconTeam = currentChantierId && 
                globalUsage?.type === 'macon' && 
                globalUsage?.chantierId && 
                globalUsage.chantierId !== currentChantierId;
              
              const isUsed = isUsedSimple || isUsedInDB || isUsedLocally || isUsedByMacons || isUsedByFinisseurs || isUsedByOtherMaconTeam;

              return (
                <CommandItem
                  key={vehicule.id}
                  value={vehicule.immatriculation}
                  onSelect={(currentValue) => {
                    if (!isUsed && currentValue !== normalizedValue) {
                      onChange(currentValue);
                      setTimeout(() => setOpen(false), 50);
                    }
                  }}
                  disabled={isUsed}
                  className="font-mono"
                >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                normalizedValue === vehicule.immatriculation ? "opacity-100" : "opacity-0"
              )}
            />
                  <span className="flex-1">{vehicule.immatriculation}</span>
                  {isUsedSimple && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Déjà utilisée)
                    </span>
                  )}
                  {isUsedInDB && !isUsedSimple && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Utilisée par {usedByDB?.nom})
                    </span>
                  )}
                  {isUsedByMacons && !isUsedSimple && !isUsedInDB && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                      (Utilisée par {globalUsage?.nom})
                    </span>
                  )}
                  {isUsedByFinisseurs && !isUsedSimple && !isUsedInDB && !isUsedByOtherMaconTeam && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                      (Utilisée par {globalUsage?.nom})
                    </span>
                  )}
                  {isUsedByOtherMaconTeam && !isUsedSimple && !isUsedInDB && (
                    <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                      (Utilisée par {globalUsage?.nom})
                    </span>
                  )}
                  {isUsedLocally && !isUsedInDB && !isUsedSimple && !isUsedByMacons && !isUsedByFinisseurs && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (En cours d'attribution)
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
