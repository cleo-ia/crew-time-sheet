import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useAllEmployes, 
  filterEmployesByType, 
  getEmployeType, 
  EMPLOYE_TYPE_COLORS,
  EmployeType,
  Employe 
} from "@/hooks/useAllEmployes";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";

interface AddEmployeeToPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
  semaine: string;
  weekDays: { date: string; dayName: string; fullName: string }[];
  existingAffectations: PlanningAffectation[];
  allAffectations: PlanningAffectation[];
  onAdd: (employeId: string, days: string[]) => void;
}

const TYPE_FILTERS: { value: EmployeType; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "chef", label: "Chefs" },
  { value: "macon", label: "Maçons" },
  { value: "finisseur", label: "Finisseurs" },
  { value: "grutier", label: "Grutiers" },
  { value: "interim", label: "Intérimaires" },
];

export const AddEmployeeToPlanningDialog = ({
  open,
  onOpenChange,
  chantierId,
  semaine,
  weekDays,
  existingAffectations,
  allAffectations,
  onAdd,
}: AddEmployeeToPlanningDialogProps) => {
  const { data: allEmployes = [], isLoading } = useAllEmployes();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeType>("all");
  const [selectedEmployeId, setSelectedEmployeId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Employés déjà sur ce chantier cette semaine
  const employeIdsOnChantier = new Set(
    existingAffectations.map(a => a.employe_id)
  );

  // Jours déjà pris par chaque employé (sur d'autres chantiers)
  const daysTakenByEmploye = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allAffectations.forEach(aff => {
      if (aff.chantier_id !== chantierId) {
        if (!map.has(aff.employe_id)) {
          map.set(aff.employe_id, new Set());
        }
        map.get(aff.employe_id)!.add(aff.jour);
      }
    });
    return map;
  }, [allAffectations, chantierId]);

  // Priorité de tri par type (cohérent avec getEmployeType et useAllEmployes)
  const TYPE_PRIORITY: Record<string, number> = {
    chef: 1,
    macon: 2,
    grutier: 3,
    finisseur: 4,
    interim: 5,
  };

  // Filtrer les employés
  const filteredEmployes = useMemo(() => {
    let result = filterEmployesByType(allEmployes, typeFilter);
    
    // Exclure ceux déjà sur le chantier
    result = result.filter(emp => !employeIdsOnChantier.has(emp.id));

    // Filtrer par recherche
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(emp => 
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchLower) ||
        `${emp.nom} ${emp.prenom}`.toLowerCase().includes(searchLower)
      );
    }

    // Trier par type (via getEmployeType) puis par nom/prénom
    result.sort((a, b) => {
      const typeA = getEmployeType(a);
      const typeB = getEmployeType(b);
      const priorityDiff = TYPE_PRIORITY[typeA] - TYPE_PRIORITY[typeB];
      if (priorityDiff !== 0) return priorityDiff;
      
      const nomCompare = (a.nom || "").localeCompare(b.nom || "");
      if (nomCompare !== 0) return nomCompare;
      
      return (a.prenom || "").localeCompare(b.prenom || "");
    });

    return result;
  }, [allEmployes, typeFilter, search, employeIdsOnChantier]);

  const handleSelectEmploye = (employe: Employe) => {
    if (selectedEmployeId === employe.id) {
      setSelectedEmployeId(null);
      setSelectedDays([]);
    } else {
      setSelectedEmployeId(employe.id);
      // Par défaut, sélectionner tous les jours disponibles
      const takenDays = daysTakenByEmploye.get(employe.id) || new Set();
      const availableDays = weekDays
        .map(d => d.date)
        .filter(date => !takenDays.has(date));
      setSelectedDays(availableDays);
    }
  };

  const handleDayToggle = (date: string) => {
    setSelectedDays(prev => 
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const handleAdd = () => {
    if (selectedEmployeId && selectedDays.length > 0) {
      onAdd(selectedEmployeId, selectedDays);
      setSelectedEmployeId(null);
      setSelectedDays([]);
      onOpenChange(false);
    }
  };

  const selectedEmploye = allEmployes.find(e => e.id === selectedEmployeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un employé au planning
          </DialogTitle>
        </DialogHeader>

        {/* Filtres */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {TYPE_FILTERS.map(filter => (
              <Button
                key={filter.value}
                variant={typeFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Compteur d'employés */}
        <div className="text-sm text-muted-foreground">
          {filteredEmployes.length} employé{filteredEmployes.length > 1 ? "s" : ""} disponible{filteredEmployes.length > 1 ? "s" : ""}
          {typeFilter !== "all" && ` (filtre: ${TYPE_FILTERS.find(f => f.value === typeFilter)?.label})`}
        </div>

        {/* Liste des employés */}
        <ScrollArea className="h-[40vh] border rounded-md">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Chargement...</p>
            ) : filteredEmployes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun employé disponible
              </p>
            ) : (
              filteredEmployes.map(employe => {
                const type = getEmployeType(employe);
                const colors = EMPLOYE_TYPE_COLORS[type];
                const takenDays = daysTakenByEmploye.get(employe.id) || new Set();
                const isSelected = selectedEmployeId === employe.id;

                return (
                  <div
                    key={employe.id}
                    className={cn(
                      "p-3 rounded-md cursor-pointer transition-colors",
                      isSelected 
                        ? "bg-primary/10 border border-primary" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSelectEmploye(employe)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          colors.bg, colors.text
                        )}>
                          {colors.label}
                        </span>
                        <span className="font-medium">
                          {employe.nom?.toUpperCase()} {employe.prenom}
                        </span>
                        {employe.libelle_emploi && (
                          <span className="text-sm text-muted-foreground">
                            - {employe.libelle_emploi}
                          </span>
                        )}
                      </div>

                      {/* Jours déjà pris ailleurs */}
                      {takenDays.size > 0 && (
                        <div className="flex gap-1">
                          {weekDays.map(day => (
                            takenDays.has(day.date) && (
                              <Badge 
                                key={day.date} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {day.dayName}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sélection des jours si employé sélectionné */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          Jours à affecter :
                        </span>
                        <div className="flex gap-2">
                          {weekDays.map(day => {
                            const isTaken = takenDays.has(day.date);
                            return (
                              <div key={day.date} className="flex items-center gap-1">
                                <Checkbox
                                  id={`day-${day.date}`}
                                  checked={selectedDays.includes(day.date)}
                                  onCheckedChange={() => handleDayToggle(day.date)}
                                  disabled={isTaken}
                                />
                                <label 
                                  htmlFor={`day-${day.date}`}
                                  className={cn(
                                    "text-sm cursor-pointer",
                                    isTaken && "text-muted-foreground line-through"
                                  )}
                                >
                                  {day.fullName}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer avec bouton d'ajout */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={!selectedEmployeId || selectedDays.length === 0}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter {selectedEmploye ? `${selectedEmploye.prenom}` : ""}
            {selectedDays.length > 0 && ` (${selectedDays.length}j)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
