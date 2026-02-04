import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Type simplifié pour les maçons passés en props
interface MaconData {
  id: string;
  prenom: string | null;
  nom: string | null;
  isChef?: boolean;
  chantierId?: string;
  chantierCode?: string;
  ficheJours?: Array<{
    date: string;
    heures?: number;
    trajet_perso?: boolean;
    code_trajet?: string | null;
  }>;
}

interface ConducteurComboboxProps {
  macons: MaconData[];
  date: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  otherConducteursIds?: string[];
  affectationsJoursChef?: Array<{ macon_id: string; jour: string; chef_id: string }>;
  chefId?: string;
  currentChantierId?: string;
}

export const ConducteurCombobox = ({ 
  macons, 
  date, 
  value, 
  onChange, 
  disabled = false, 
  otherConducteursIds = [],
  affectationsJoursChef,
  chefId,
  currentChantierId,
}: ConducteurComboboxProps) => {
  const [open, setOpen] = useState(false);

  // Fonction helper pour détecter si un maçon est en trajet perso ce jour-là ou déjà affecté
  const getMaconStatus = (macon: MaconData) => {
    // Le chef est exempté UNIQUEMENT de la vérification d'affectation de jour
    // MAIS doit respecter les autres contraintes (trajet perso, absent, déjà affecté)
    const isChef = chefId && macon.id === chefId;

    // Vérifier si l'employé est affecté pour ce jour
    const hasAffectationToday = affectationsJoursChef?.some(
      aff => aff.macon_id === macon.id && aff.jour === date
    ) ?? true;
    
    // Si affectationsJoursChef existe et non vide mais l'employé n'a pas ce jour → bloqué
    // Exception : le chef est TOUJOURS considéré comme affecté (ne pas le bloquer sur ce critère)
    const isNotAffectedToday = !isChef && affectationsJoursChef && 
      affectationsJoursChef.length > 0 && 
      !hasAffectationToday;

    if (!macon.ficheJours || macon.ficheJours.length === 0) {
      return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false, isNotAffectedToday };
    }
    
    const jourData = macon.ficheJours.find((j) => j.date === date);
    if (!jourData) {
      return { isTrajetPerso: false, isDejaAffecte: false, isAbsent: false, isNotAffectedToday };
    }
    
    const isDejaAffecte = otherConducteursIds.includes(macon.id);
    // Le chef peut aussi être marqué absent, cette vérification doit aussi s'appliquer
    const isAbsent = Number(jourData.heures || 0) === 0;
    
    return { 
      isTrajetPerso: jourData.trajet_perso || jourData.code_trajet === "T_PERSO", 
      isDejaAffecte, 
      isAbsent, 
      isNotAffectedToday 
    };
  };

  const selectedMacon = macons.find(macon => macon.id === value);
  const selectedStatus = getMaconStatus(selectedMacon || { id: "", prenom: null, nom: null });
  const isSelectedInTrajetPerso = selectedStatus.isTrajetPerso;
  const isSelectedDejaAffecte = selectedStatus.isDejaAffecte;
  const isSelectedAbsent = selectedStatus.isAbsent;
  const isSelectedNotAffected = selectedStatus.isNotAffectedToday;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                <span className="text-xs text-warning">⚠️ Trajet perso</span>
              )}
              {isSelectedDejaAffecte && (
                <span className="text-xs text-warning">⚠️ Déjà affecté</span>
              )}
              {isSelectedAbsent && (
                <span className="text-xs text-destructive">⚠️ Absent</span>
              )}
              {isSelectedNotAffected && (
                <span className="text-xs text-accent-foreground">⚠️ Non affecté ce jour</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Sélectionner un conducteur</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un conducteur..." />
          <CommandList>
            <CommandEmpty>Aucun conducteur trouvé.</CommandEmpty>
            <CommandGroup>
              {macons.map((macon) => {
                const { isTrajetPerso, isDejaAffecte, isAbsent, isNotAffectedToday } = getMaconStatus(macon);
                const isDisabled = isTrajetPerso || isDejaAffecte || isAbsent || isNotAffectedToday;
                
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
                      {macon.chantierId && macon.chantierId !== currentChantierId && macon.chantierCode && (
                        <span className="text-xs text-primary/70">({macon.chantierCode})</span>
                      )}
                      {isTrajetPerso && (
                        <span className="text-xs text-muted-foreground">(Trajet perso)</span>
                      )}
                      {isDejaAffecte && (
                        <span className="text-xs text-muted-foreground">(Déjà affecté)</span>
                      )}
                      {isAbsent && (
                        <span className="text-xs text-destructive">(Absent)</span>
                      )}
                      {isNotAffectedToday && (
                        <span className="text-xs text-accent-foreground">(Non affecté ce jour)</span>
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
