import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveVehiculesChefsMacons } from "@/hooks/useVehiculesChefsMacons";
import { Loader2 } from "lucide-react";

interface VehiculeSelectorChefsMaconsProps {
  value: string;
  onChange: (value: string) => void;
  otherVehiculesPlates?: string[]; // Plaques déjà utilisées ce jour-là
  disabled?: boolean;
}

export const VehiculeSelectorChefsMacons = ({ value, onChange, otherVehiculesPlates, disabled = false }: VehiculeSelectorChefsMaconsProps) => {
  const { data: vehicules = [], isLoading } = useActiveVehiculesChefsMacons();

  if (isLoading) {
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
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner une plaque" />
      </SelectTrigger>
      <SelectContent onPointerDown={(e) => e.stopPropagation()}>
        {vehicules.map((vehicule) => {
          const isUsedInSameDay = otherVehiculesPlates?.includes(vehicule.immatriculation) ?? false;
          
          return (
            <SelectItem 
              key={vehicule.id} 
              value={vehicule.immatriculation}
              disabled={isUsedInSameDay}
              className="font-mono"
            >
              {vehicule.immatriculation}
              {isUsedInSameDay && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Déjà utilisée)
                </span>
              )}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
