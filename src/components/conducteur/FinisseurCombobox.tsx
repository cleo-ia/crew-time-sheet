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

interface Finisseur {
  id: string;
  prenom: string;
  nom: string;
}

interface FinisseurComboboxProps {
  finisseurs: Finisseur[];
  mesFinisseursActuels: Finisseur[];
  getAffectedDaysCount: (finisseurId: string) => number;
  onFinisseurSelect: (finisseurId: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const FinisseurCombobox = ({
  finisseurs,
  mesFinisseursActuels,
  getAffectedDaysCount,
  onFinisseurSelect,
  searchQuery,
  onSearchChange,
}: FinisseurComboboxProps) => {
  const [open, setOpen] = useState(false);

  // Tri des finisseurs : Non affectés → Partiels → Complets
  const sortedFinisseurs = useMemo(() => {
    const withDays = finisseurs.map((f) => ({
      ...f,
      affectedDays: getAffectedDaysCount(f.id),
      isAffected: mesFinisseursActuels.some((mf) => mf.id === f.id),
    }));

    return withDays.sort((a, b) => {
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
  }, [finisseurs, mesFinisseursActuels, getAffectedDaysCount]);

  // Grouper par statut pour affichage
  const groupedFinisseurs = useMemo(() => {
    const nonAffectes = sortedFinisseurs.filter((f) => f.affectedDays === 0);
    const partiels = sortedFinisseurs.filter(
      (f) => f.affectedDays > 0 && f.affectedDays < 5
    );
    const complets = sortedFinisseurs.filter((f) => f.affectedDays === 5);

    return { nonAffectes, partiels, complets };
  }, [sortedFinisseurs]);

  const handleSelect = (finisseurId: string) => {
    setOpen(false);
    onSearchChange("");
    onFinisseurSelect(finisseurId);
  };

  const renderFinisseurItem = (f: typeof sortedFinisseurs[0]) => (
    <CommandItem
      key={f.id}
      value={f.id}
      keywords={[f.prenom.toLowerCase(), f.nom.toLowerCase()]}
      onSelect={(value) => handleSelect(value)}
      className="flex items-center justify-between gap-2 cursor-pointer"
    >
      <div className="flex items-center gap-2 flex-1">
        {f.isAffected && (
          <Check className="h-4 w-4 text-green-600 shrink-0" />
        )}
        <span className={cn(!f.isAffected && "ml-6")}>
          {f.prenom} {f.nom}
        </span>
      </div>
      {f.affectedDays > 0 && (
        <Badge
          variant={f.affectedDays === 5 ? "default" : "secondary"}
          className="text-xs shrink-0"
        >
          {f.affectedDays}/5 jours
        </Badge>
      )}
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
              {searchQuery || "🔍 Rechercher un finisseur (nom, prénom)..."}
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
            <CommandEmpty>Aucun finisseur trouvé</CommandEmpty>

            {/* Groupe : Non affectés */}
            {groupedFinisseurs.nonAffectes.length > 0 && (
              <CommandGroup heading="Non affectés (0/5)">
                {groupedFinisseurs.nonAffectes.map(renderFinisseurItem)}
              </CommandGroup>
            )}

            {/* Groupe : Partiellement affectés */}
            {groupedFinisseurs.partiels.length > 0 && (
              <CommandGroup heading="Partiellement affectés (1-4/5)">
                {groupedFinisseurs.partiels.map(renderFinisseurItem)}
              </CommandGroup>
            )}

            {/* Groupe : Semaine complète */}
            {groupedFinisseurs.complets.length > 0 && (
              <CommandGroup heading="Semaine complète (5/5)">
                {groupedFinisseurs.complets.map(renderFinisseurItem)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
