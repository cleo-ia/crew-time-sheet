import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { useAllSalaries } from "@/hooks/useUtilisateurs";

interface EmployeeComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export const EmployeeCombobox = ({ value, onChange }: EmployeeComboboxProps) => {
  const [open, setOpen] = useState(false);
  const { data: allSalaries = [], isLoading } = useAllSalaries();

  const selectedEmployee = allSalaries.find((sal) => sal.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          {selectedEmployee
            ? `${selectedEmployee.prenom} ${selectedEmployee.nom}`
            : "Rechercher un salarié..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Taper un nom ou prénom..." />
          <CommandList>
            <CommandEmpty>Aucun salarié trouvé.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("all");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                Tous les salariés
              </CommandItem>
              {allSalaries.map((sal) => (
                <CommandItem
                  key={sal.id}
                  value={`${sal.prenom} ${sal.nom}`}
                  onSelect={() => {
                    onChange(sal.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === sal.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {sal.prenom} {sal.nom}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
