import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
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
  const [inputValue, setInputValue] = useState("");
  const { data: agences = [], isLoading } = useAgencesInterim();

  // Filtrer les agences selon la saisie
  const filteredAgences = agences.filter((agence) =>
    agence.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Vérifier si la valeur saisie existe déjà
  const exactMatch = agences.some(
    (agence) => agence.toLowerCase() === inputValue.toLowerCase()
  );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue("");
    setOpen(false);
  };

  const handleUseCustomValue = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim());
      setInputValue("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || (
            <span className="text-muted-foreground">
              Ex: Manpower Lyon, Adecco Dijon...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher une agence..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : (
              <>
                {filteredAgences.length === 0 && !inputValue && (
                  <CommandEmpty>Aucune agence enregistrée</CommandEmpty>
                )}
                {filteredAgences.length === 0 && inputValue && !exactMatch && (
                  <CommandGroup>
                    <CommandItem onSelect={handleUseCustomValue}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Utiliser "{inputValue}"
                    </CommandItem>
                  </CommandGroup>
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
                {inputValue && !exactMatch && filteredAgences.length > 0 && (
                  <CommandGroup heading="Nouvelle agence">
                    <CommandItem onSelect={handleUseCustomValue}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Utiliser "{inputValue}"
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
