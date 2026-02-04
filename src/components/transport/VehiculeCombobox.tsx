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

  // Vérification des véhicules utilisés - SYSTÈME UNIFIÉ (fiches_transport_jours uniquement)
  const { data: vehiculesUtilisesGlobal, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ["vehicules-all-teams-used", semaine, date, currentChantierId],
    queryFn: async () => {
      const usedMap = new Map<string, { type: 'macon' | 'finisseur'; nom: string; chantierId?: string }>();

      // Récupérer tous les véhicules utilisés depuis fiches_transport_jours (système unifié)
      const { data: transportJours } = await supabase
        .from("fiches_transport_jours")
        .select(`
          immatriculation,
          fiche_transport:fiches_transport!inner(
            chantier_id,
            chantier:chantiers(nom)
          )
        `)
        .eq("date", date!)
        .not("immatriculation", "is", null);

      transportJours?.forEach((jour: any) => {
        if (jour.immatriculation) {
          const chantierId = jour.fiche_transport?.chantier_id;
          const chantierNom = jour.fiche_transport?.chantier?.nom || 'Chantier inconnu';
          
          usedMap.set(jour.immatriculation, {
            type: 'macon',
            nom: `Équipe (${chantierNom})`,
            chantierId: chantierId
          });
        }
      });

      return usedMap;
    },
    enabled: !!date && !!semaine,
  });

  const isLoading = isLoadingVehicules || 
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
              <span className="text-primary">Véhicule perso</span>
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
              className="font-normal text-primary"
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
              
              const dateUsage = localVehiculeUsage?.get(date || '');
              const localUserId = dateUsage?.get(vehicule.immatriculation);
              const isUsedLocally = localUserId && localUserId !== excludeFinisseurId;
              
              // Vérification unifiée (tous véhicules utilisés)
              const globalUsage = vehiculesUtilisesGlobal?.get(vehicule.immatriculation);
              
              // Utilisé par une AUTRE équipe sur un AUTRE chantier
              const isUsedByOtherTeam = currentChantierId && 
                globalUsage?.chantierId && 
                globalUsage.chantierId !== currentChantierId;
              
              const isUsed = isUsedSimple || isUsedLocally || isUsedByOtherTeam;

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
                  {isUsedByOtherTeam && !isUsedSimple && (
                    <span className="text-xs text-destructive ml-2">
                      (Utilisée par {globalUsage?.nom})
                    </span>
                  )}
                  {isUsedLocally && !isUsedSimple && !isUsedByOtherTeam && (
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
