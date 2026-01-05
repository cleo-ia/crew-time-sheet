import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAgencesInterim } from "@/hooks/useAgencesInterim";

interface AgenceInterimComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export const AgenceInterimCombobox = ({
  value,
  onChange,
}: AgenceInterimComboboxProps) => {
  const [open, setOpen] = useState(false);
  const { data: agences = [], isLoading } = useAgencesInterim();

  // Filtrer les agences selon la valeur saisie
  const filteredAgences = agences.filter((agence) =>
    agence.toLowerCase().includes(value.toLowerCase())
  );

  // Vérifier si la valeur saisie existe déjà (exactement)
  const exactMatch = agences.some(
    (agence) => agence.toLowerCase() === value.toLowerCase()
  );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            placeholder="Ex: Manpower Lyon, Adecco Dijon..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            onClick={(e) => e.stopPropagation()}
            onFocus={() => setOpen(true)}
            className="w-full pr-8"
          />
          <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : (
              <>
                {filteredAgences.length === 0 && !value && (
                  <CommandEmpty>Aucune agence enregistrée</CommandEmpty>
                )}
                {filteredAgences.length > 0 && (
                  <CommandGroup heading="Agences existantes">
                    {filteredAgences.map((agence) => (
                      <CommandItem
                        key={agence}
                        value={agence}
                        onSelect={() => handleSelect(agence)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === agence ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {agence}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {value && !exactMatch && (
                  <CommandGroup heading={filteredAgences.length > 0 ? "Nouvelle agence" : undefined}>
                    <CommandItem onSelect={() => handleSelect(value.trim())}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Utiliser "{value}"
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
