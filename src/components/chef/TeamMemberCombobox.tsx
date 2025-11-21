import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMemberComboboxProps {
  value: string;
  onChange: (value: string) => void;
  allMacons: any[];
  allGrutiers: any[];
  allInterimaires: any[];
  allFinisseurs: any[];
  isLoading: boolean;
  excludeIds?: string[];
}

export function TeamMemberCombobox({ 
  value, 
  onChange, 
  allMacons,
  allGrutiers,
  allInterimaires,
  allFinisseurs,
  isLoading,
  excludeIds = []
}: TeamMemberComboboxProps) {
  const [open, setOpen] = useState(false);

  const allMembers = [
    ...(allMacons || []).map(m => ({ ...m, memberType: 'macon' })),
    ...(allGrutiers || []).map(g => ({ ...g, memberType: 'grutier' })),
    ...(allInterimaires || []).map(i => ({ ...i, memberType: 'interimaire' })),
    ...(allFinisseurs || []).map(f => ({ ...f, memberType: 'finisseur' }))
  ].filter(member => !excludeIds.includes(member.id));

  const selectedMember = allMembers.find(member => member.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          {value === "all" ? (
            <span className="text-muted-foreground">Rechercher un membre...</span>
          ) : selectedMember ? (
            <span className="flex items-center gap-2">
              {selectedMember.memberType === 'macon' ? (
                <UserPlus className="h-4 w-4" />
              ) : selectedMember.memberType === 'grutier' ? (
                <span className="text-base">🏗️</span>
              ) : selectedMember.memberType === 'finisseur' ? (
                <span className="text-base">🔨</span>
              ) : (
                <span className="text-base">🔄</span>
              )}
              {selectedMember.prenom} {selectedMember.nom}
              <span className="text-xs text-muted-foreground">
                ({selectedMember.memberType === 'macon' ? 'Maçon' : selectedMember.memberType === 'grutier' ? 'Grutier' : selectedMember.memberType === 'finisseur' ? 'Finisseur' : 'Intérimaire'})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Rechercher un membre...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un membre..." />
          <CommandList>
            {allMembers.length === 0 ? (
              <CommandEmpty>Tous les membres disponibles sont déjà dans l'équipe.</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>Aucun membre trouvé.</CommandEmpty>
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
                Tous les membres
              </CommandItem>
              {allMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.prenom} ${member.nom} ${member.email || ''}`}
                  onSelect={() => {
                    onChange(member.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === member.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {member.memberType === 'macon' ? (
                    <UserPlus className="mr-2 h-4 w-4" />
                  ) : member.memberType === 'grutier' ? (
                    <span className="mr-2 text-base">🏗️</span>
                  ) : member.memberType === 'finisseur' ? (
                    <span className="mr-2 text-base">🔨</span>
                  ) : (
                    <span className="mr-2 text-base">🔄</span>
                  )}
                  <div className="flex flex-col">
                    <span>{member.prenom} {member.nom}</span>
                    <span className="text-xs text-muted-foreground">
                      {member.memberType === 'macon' ? 'Maçon' : member.memberType === 'grutier' ? 'Grutier' : member.memberType === 'finisseur' ? 'Finisseur' : 'Intérimaire'}
                      {member.email && ` • ${member.email}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
