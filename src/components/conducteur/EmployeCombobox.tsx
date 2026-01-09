import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

const getRoleBadgeVariant = (employe: Employe): "default" | "secondary" | "outline" => {
  if (employe.agence_interim || employe._roleType === "interimaire") return "secondary";
  if (employe.role_metier === "macon" || employe._roleType === "macon") return "default";
  if (employe.role_metier === "grutier" || employe._roleType === "grutier") return "outline";
  return "secondary";
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

  // Grouper par statut pour affichage
  const groupedEmployes = useMemo(() => {
    const nonAffectes = sortedEmployes.filter((e) => e.affectedDays === 0);
    const partiels = sortedEmployes.filter(
      (e) => e.affectedDays > 0 && e.affectedDays < 5
    );
    const complets = sortedEmployes.filter((e) => e.affectedDays === 5);

    return { nonAffectes, partiels, complets };
  }, [sortedEmployes]);

  const handleSelect = (employeId: string) => {
    setOpen(false);
    onSearchChange("");
    onEmployeSelect(employeId);
  };

  const renderEmployeItem = (e: typeof sortedEmployes[0]) => (
    <CommandItem
      key={e.id}
      value={e.id}
      keywords={[(e.prenom || '').toLowerCase(), (e.nom || '').toLowerCase()]}
      onSelect={(value) => !e.isAffectedByChef && handleSelect(value)}
      className={cn(
        "flex items-center justify-between gap-2",
        e.isAffectedByChef ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      )}
      disabled={e.isAffectedByChef}
    >
      <div className="flex items-center gap-2 flex-1">
        {e.isAffected && !e.isAffectedByChef && (
          <Check className="h-4 w-4 text-green-600 shrink-0" />
        )}
        <span className={cn(!e.isAffected && "ml-6")}>
          {e.prenom} {e.nom}
        </span>
        <Badge variant={getRoleBadgeVariant(e)} className="text-xs">
          {getRoleLabel(e)}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {e.isAffectedByChef ? (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs shrink-0">
            Affecté à un chef
          </Badge>
        ) : e.affectedDays > 0 ? (
          <Badge
            variant={e.affectedDays === 5 ? "default" : "secondary"}
            className="text-xs shrink-0"
          >
            {e.affectedDays}/5 jours
          </Badge>
        ) : null}
      </div>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>
              {searchQuery || "🔍 Rechercher un employé (nom, prénom)..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Taper pour filtrer..."
            value={searchQuery}
            onValueChange={onSearchChange}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>Aucun employé trouvé</CommandEmpty>

            {/* Groupe : Non affectés */}
            {groupedEmployes.nonAffectes.length > 0 && (
              <CommandGroup heading="Non affectés (0/5)">
                {groupedEmployes.nonAffectes.map(renderEmployeItem)}
              </CommandGroup>
            )}

            {/* Groupe : Partiellement affectés */}
            {groupedEmployes.partiels.length > 0 && (
              <CommandGroup heading="Partiellement affectés (1-4/5)">
                {groupedEmployes.partiels.map(renderEmployeItem)}
              </CommandGroup>
            )}

            {/* Groupe : Semaine complète */}
            {groupedEmployes.complets.length > 0 && (
              <CommandGroup heading="Semaine complète (5/5)">
                {groupedEmployes.complets.map(renderEmployeItem)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};