import { useState } from "react";
import { Check, ChevronsUpDown, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useActiveVehicules } from "@/hooks/useVehicules";

interface PlanningVehiculeComboboxProps {
  value: string | null;
  onChange: (vehiculeId: string | null) => void;
  disabled?: boolean;
}

export const PlanningVehiculeCombobox = ({
  value,
  onChange,
  disabled,
}: PlanningVehiculeComboboxProps) => {
  const [open, setOpen] = useState(false);
  const { data: vehicules = [], isLoading } = useActiveVehicules();

  const selectedVehicule = vehicules.find(v => v.id === value);

  const displayValue = selectedVehicule
    ? `${selectedVehicule.marque || ""} ${selectedVehicule.immatriculation}`.trim()
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between h-8 text-xs px-2"
        >
          {displayValue || (
            <span className="text-muted-foreground flex items-center gap-1">
              <Car className="h-3 w-3" />
              Véhicule
            </span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher..." className="h-9" />
          <CommandList>
            <CommandEmpty>Aucun véhicule trouvé</CommandEmpty>
            <CommandGroup>
              {/* Option pour retirer le véhicule */}
              <CommandItem
                value="none"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground">Aucun véhicule</span>
              </CommandItem>

              {vehicules.map((vehicule) => (
                <CommandItem
                  key={vehicule.id}
                  value={`${vehicule.marque} ${vehicule.modele} ${vehicule.immatriculation}`}
                  onSelect={() => {
                    onChange(vehicule.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vehicule.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{vehicule.immatriculation}</span>
                    <span className="text-xs text-muted-foreground">
                      {vehicule.marque} {vehicule.modele}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
