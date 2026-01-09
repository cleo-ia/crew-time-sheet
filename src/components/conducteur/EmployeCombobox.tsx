import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAffectations } from "@/hooks/useAffectations";

interface Employe {
  id: string;
  prenom: string | null;
  nom: string | null;
  role_metier?: string | null;
  agence_interim?: string | null;
  _roleType?: string;
}

interface EmployeComboboxProps {
  employes: Employe[];
  mesEmployesActuels: Employe[];
  getAffectedDaysCount: (employeId: string) => number;
  onEmployeSelect: (employeId: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const getRoleLabel = (employe: Employe): string => {
  if (employe.agence_interim) return "Intérimaire";
  if (employe._roleType === "interimaire") return "Intérimaire";
  if (employe.role_metier === "macon" || employe._roleType === "macon") return "Maçon";
  if (employe.role_metier === "grutier" || employe._roleType === "grutier") return "Grutier";
  if (employe.role_metier === "finisseur" || employe._roleType === "finisseur") return "Finisseur";
  return "Employé";
};

const getRoleIcon = (employe: Employe): string => {
  if (employe.agence_interim || employe._roleType === "interimaire") return "🔄";
  if (employe.role_metier === "macon" || employe._roleType === "macon") return "👷";
  if (employe.role_metier === "grutier" || employe._roleType === "grutier") return "🏗️";
  if (employe.role_metier === "finisseur" || employe._roleType === "finisseur") return "🔨";
  return "👤";
};

export const EmployeCombobox = ({
  employes,
  mesEmployesActuels,
  getAffectedDaysCount,
  onEmployeSelect,
  searchQuery,
  onSearchChange,
}: EmployeComboboxProps) => {
  const [open, setOpen] = useState(false);
  
  // Charger les affectations des chefs
  const { data: affectationsChefs } = useAffectations();

  // Tri des employés : Affectés par chef → Non affectés → Partiels → Complets
  const sortedEmployes = useMemo(() => {
    const withDays = employes.map((e) => ({
      ...e,
      affectedDays: getAffectedDaysCount(e.id),
      isAffected: mesEmployesActuels.some((me) => me.id === e.id),
      isAffectedByChef: affectationsChefs?.some(
        (aff: any) => aff.macon_id === e.id && aff.date_fin === null
      ) ?? false,
    }));

    return withDays.sort((a, b) => {
      // 0. Affectés par chef en dernier (non sélectionnables)
      if (a.isAffectedByChef && !b.isAffectedByChef) return 1;
      if (!a.isAffectedByChef && b.isAffectedByChef) return -1;

      // 1. Non affectés (0 jours) en premier
      if (a.affectedDays === 0 && b.affectedDays > 0) return -1;
      if (a.affectedDays > 0 && b.affectedDays === 0) return 1;

      // 2. Partiels (1-4 jours) en deuxième
      const aPartiel = a.affectedDays > 0 && a.affectedDays < 5;
      const bPartiel = b.affectedDays > 0 && b.affectedDays < 5;
      if (aPartiel && !bPartiel) return -1;
      if (!aPartiel && bPartiel) return 1;

      // 3. Complets (5 jours) en dernier
      if (a.affectedDays === 5 && b.affectedDays < 5) return 1;
      if (b.affectedDays === 5 && a.affectedDays < 5) return -1;

      // 4. Tri alphabétique dans chaque groupe
      return `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
    });
  }, [employes, mesEmployesActuels, getAffectedDaysCount, affectationsChefs]);

  const handleSelect = (employeId: string) => {
    setOpen(false);
    onSearchChange("");
    onEmployeSelect(employeId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="text-muted-foreground">
            Rechercher un employé...
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Taper un nom..."
            value={searchQuery}
            onValueChange={onSearchChange}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Aucun employé trouvé</CommandEmpty>

            {sortedEmployes.map((e) => (
              <CommandItem
                key={e.id}
                value={e.id}
                keywords={[(e.prenom || '').toLowerCase(), (e.nom || '').toLowerCase()]}
                onSelect={(value) => !e.isAffectedByChef && handleSelect(value)}
                className={cn(
                  "flex items-center gap-3 py-2",
                  e.isAffectedByChef && "opacity-40 cursor-not-allowed"
                )}
                disabled={e.isAffectedByChef}
              >
                <Check 
                  className={cn(
                    "h-4 w-4 shrink-0",
                    e.isAffected ? "opacity-100 text-primary" : "opacity-0"
                  )} 
                />
                <span className="text-lg">{getRoleIcon(e)}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">
                    {e.prenom} {e.nom}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getRoleLabel(e)}
                    {e.isAffectedByChef 
                      ? " • Affecté à un chef"
                      : e.affectedDays > 0 
                        ? ` • ${e.affectedDays}/5 jours`
                        : ""
                    }
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
