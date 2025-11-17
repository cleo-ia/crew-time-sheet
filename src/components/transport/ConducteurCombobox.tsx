import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";

interface ConducteurComboboxProps {
  chantierId: string | null;
  semaine: string;
  chefId: string;
  date: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  otherConducteursIds?: string[];
}

export const ConducteurCombobox = ({ chantierId, semaine, chefId, date, value, onChange, disabled = false, otherConducteursIds = [] }: ConducteurComboboxProps) => {
  const [open, setOpen] = useState(false);
  const { data: macons = [], isLoading } = useMaconsByChantier(chantierId, semaine, chefId);

  // Fonction helper pour détecter si un maçon est en trajet perso ce jour-là ou déjà affecté
  const getMaconStatus = (macon: any) => {
    if (!macon.ficheJours || macon.ficheJours.length === 0) return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false };
    
    const jourData = macon.ficheJours.find((j: any) => j.date === date);
    if (!jourData) return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false };
    
    const isDejaAffecte = otherConducteursIds.includes(macon.id);
    const isAbsent = Number(jourData.heures || 0) === 0;
    
    return { isTrajetPerso: jourData.trajet_perso || false, isDejaAffecte, isAbsent };
  };

  const selectedMacon = macons.find(macon => macon.id === value);
  const selectedStatus = getMaconStatus(selectedMacon || {});
  const isSelectedInTrajetPerso = selectedStatus.isTrajetPerso;
  const isSelectedDejaAffecte = selectedStatus.isDejaAffecte;
  const isSelectedAbsent = selectedStatus.isAbsent;

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between h-10">
        <span className="text-muted-foreground">Chargement...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
          disabled={disabled}
        >
          {selectedMacon ? (
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {selectedMacon.prenom} {selectedMacon.nom}
              {selectedMacon.isChef && (
                <span className="text-xs text-muted-foreground">(Chef)</span>
              )}
              {isSelectedInTrajetPerso && (
                <span className="text-xs text-amber-600 dark:text-amber-500">⚠️ Trajet perso</span>
              )}
              {isSelectedDejaAffecte && (
                <span className="text-xs text-amber-600 dark:text-amber-500">⚠️ Déjà affecté</span>
              )}
              {isSelectedAbsent && (
                <span className="text-xs text-red-600 dark:text-red-500">⚠️ Absent</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Sélectionner un conducteur</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" onPointerDown={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Rechercher un conducteur..." />
          <CommandList>
            <CommandEmpty>Aucun conducteur trouvé.</CommandEmpty>
            <CommandGroup>
              {macons.map((macon) => {
                const { isTrajetPerso, isDejaAffecte, isAbsent } = getMaconStatus(macon);
                const isDisabled = isTrajetPerso || isDejaAffecte || isAbsent;
                
                return (
                  <CommandItem
                    key={macon.id}
                    value={`${macon.prenom} ${macon.nom}`}
                    disabled={isDisabled}
                    onSelect={() => {
                      if (!isDisabled) {
                        onChange(macon.id);
                        setOpen(false);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === macon.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex items-center gap-2">
                      <span>{macon.prenom} {macon.nom}</span>
                      {macon.isChef && (
                        <span className="text-xs text-muted-foreground">(Chef)</span>
                      )}
                      {isTrajetPerso && (
                        <span className="text-xs text-muted-foreground">(Trajet perso)</span>
                      )}
                      {isDejaAffecte && (
                        <span className="text-xs text-muted-foreground">(Déjà affecté)</span>
                      )}
                      {isAbsent && (
                        <span className="text-xs text-red-600">(Absent)</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
