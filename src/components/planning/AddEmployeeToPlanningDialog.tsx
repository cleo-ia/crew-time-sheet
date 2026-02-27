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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, UserPlus, Users, UserX } from "lucide-react";
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
  absencesLDByEmploye?: Map<string, { dates: Set<string>; type: string }>;
}

const TYPE_FILTERS: { value: EmployeType; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "chef", label: "Chefs" },
  { value: "macon", label: "Maçons" },
  { value: "finisseur", label: "Finisseurs" },
  { value: "grutier", label: "Grutiers" },
  { value: "interim", label: "Intérimaires" },
];

// Filtres sans intérimaires pour l'onglet "Non affectés"
const TYPE_FILTERS_NO_INTERIM: { value: EmployeType; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "chef", label: "Chefs" },
  { value: "macon", label: "Maçons" },
  { value: "finisseur", label: "Finisseurs" },
  { value: "grutier", label: "Grutiers" },
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
  absencesLDByEmploye,
}: AddEmployeeToPlanningDialogProps) => {
  const { data: allEmployes = [], isLoading } = useAllEmployes();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeType>("all");
  const [activeTab, setActiveTab] = useState<"tous" | "non-affectes">("tous");
  
  // Mode simple (un seul employé)
  const [selectedEmployeId, setSelectedEmployeId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Mode multi-sélection
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEmployeIds, setSelectedEmployeIds] = useState<Set<string>>(new Set());
  const [commonDays, setCommonDays] = useState<string[]>([]);

  // Employés déjà sur ce chantier cette semaine
  const employeIdsOnChantier = new Set(
    existingAffectations.map(a => a.employe_id)
  );

  // Créer une map des chefs pour vérification rapide
  const chefIds = useMemo(() => {
    return new Set(
      allEmployes
        .filter(emp => getEmployeType(emp) === "chef")
        .map(emp => emp.id)
    );
  }, [allEmployes]);

  // Jours déjà pris par chaque employé (sur d'autres chantiers + absences LD)
  // EXCEPTION : Les chefs ne sont jamais bloqués par les conflits multi-chantiers
  const daysTakenByEmploye = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allAffectations.forEach(aff => {
      // Les chefs peuvent être sur plusieurs chantiers le même jour
      if (chefIds.has(aff.employe_id)) return;
      
      if (aff.chantier_id !== chantierId) {
        if (!map.has(aff.employe_id)) {
          map.set(aff.employe_id, new Set());
        }
        map.get(aff.employe_id)!.add(aff.jour);
      }
    });

    // Ajouter les jours d'absence longue durée (bloquent TOUS les employés, y compris les chefs)
    if (absencesLDByEmploye) {
      absencesLDByEmploye.forEach((absence, employeId) => {
        if (!map.has(employeId)) {
          map.set(employeId, new Set());
        }
        absence.dates.forEach(d => map.get(employeId)!.add(d));
      });
    }

    return map;
  }, [allAffectations, chantierId, chefIds, absencesLDByEmploye]);

  // Jours affectés à N'IMPORTE QUEL chantier par employé (pour onglet "Non affectés")
  const daysAssignedByEmploye = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allAffectations.forEach(aff => {
      if (!map.has(aff.employe_id)) {
        map.set(aff.employe_id, new Set());
      }
      map.get(aff.employe_id)!.add(aff.jour);
    });
    return map;
  }, [allAffectations]);

  // Priorité de tri par type
  const TYPE_PRIORITY: Record<string, number> = {
    chef: 1,
    macon: 2,
    grutier: 3,
    finisseur: 4,
    interim: 5,
  };

  const sortEmployes = (list: Employe[]) => {
    return [...list].sort((a, b) => {
      const typeA = getEmployeType(a);
      const typeB = getEmployeType(b);
      const priorityDiff = TYPE_PRIORITY[typeA] - TYPE_PRIORITY[typeB];
      if (priorityDiff !== 0) return priorityDiff;
      const nomCompare = (a.nom || "").localeCompare(b.nom || "");
      if (nomCompare !== 0) return nomCompare;
      return (a.prenom || "").localeCompare(b.prenom || "");
    });
  };

  // Filtrer les employés (onglet "Tous")
  const filteredEmployes = useMemo(() => {
    let result = filterEmployesByType(allEmployes, typeFilter);
    result = result.filter(emp => !employeIdsOnChantier.has(emp.id));

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(emp => 
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchLower) ||
        `${emp.nom} ${emp.prenom}`.toLowerCase().includes(searchLower)
      );
    }

    return sortEmployes(result);
  }, [allEmployes, typeFilter, search, employeIdsOnChantier]);

  // Employés "Non affectés" : permanents (hors intérimaires) pas entièrement affectés sur la semaine
  const unassignedEmployes = useMemo(() => {
    const weekDateSet = new Set(weekDays.map(d => d.date));

    let result = allEmployes.filter(emp => {
      // Exclure les intérimaires
      if (getEmployeType(emp) === "interim") return false;
      // Exclure ceux déjà sur ce chantier
      if (employeIdsOnChantier.has(emp.id)) return false;

      const assigned = daysAssignedByEmploye.get(emp.id) || new Set();
      const absDates = absencesLDByEmploye?.get(emp.id)?.dates || new Set();

      let freeDays = 0;
      let absOnlyDays = 0;
      weekDateSet.forEach(date => {
        if (!assigned.has(date) && !absDates.has(date)) freeDays++;
        if (!assigned.has(date) && absDates.has(date)) absOnlyDays++;
      });

      // Garder si au moins 1 jour libre OU si bloqué uniquement par des absences (pas par des affectations)
      return freeDays > 0 || absOnlyDays > 0;
    });

    // Appliquer filtre type (sans interim)
    if (typeFilter !== "all") {
      result = result.filter(emp => getEmployeType(emp) === typeFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(emp => 
        `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchLower) ||
        `${emp.nom} ${emp.prenom}`.toLowerCase().includes(searchLower)
      );
    }

    // Trier : employés avec jours libres d'abord (par nb décroissant), puis ceux à 0 jour libre en dernier
    const getFreeDays = (empId: string) => {
      const assigned = daysAssignedByEmploye.get(empId) || new Set();
      const absDates = absencesLDByEmploye?.get(empId)?.dates || new Set();
      let free = 0;
      weekDateSet.forEach(date => {
        if (!assigned.has(date) && !absDates.has(date)) free++;
      });
      return free;
    };

    const sorted = sortEmployes(result);
    return sorted.sort((a, b) => {
      const freeA = getFreeDays(a.id);
      const freeB = getFreeDays(b.id);
      // Ceux avec 0 jours libres en dernier
      if (freeA === 0 && freeB > 0) return 1;
      if (freeB === 0 && freeA > 0) return -1;
      // Sinon, plus de jours libres en premier
      return freeB - freeA;
    });
  }, [allEmployes, typeFilter, search, employeIdsOnChantier, daysAssignedByEmploye, weekDays, absencesLDByEmploye]);

  // Mode simple : sélection d'un employé
  const handleSelectEmploye = (employe: Employe) => {
    if (multiSelectMode) return;
    
    if (selectedEmployeId === employe.id) {
      setSelectedEmployeId(null);
      setSelectedDays([]);
    } else {
      setSelectedEmployeId(employe.id);
      const takenDays = daysTakenByEmploye.get(employe.id) || new Set();
      const availableDays = weekDays
        .map(d => d.date)
        .filter(date => !takenDays.has(date));
      setSelectedDays(availableDays);
    }
  };

  const handleDayToggle = (date: string) => {
    setSelectedDays(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handleToggleEmployeMulti = (employeId: string) => {
    setSelectedEmployeIds(prev => {
      const next = new Set(prev);
      if (next.has(employeId)) next.delete(employeId);
      else next.add(employeId);
      return next;
    });
  };

  const handleToggleCommonDay = (date: string) => {
    setCommonDays(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handleAdd = () => {
    if (selectedEmployeId && selectedDays.length > 0) {
      onAdd(selectedEmployeId, selectedDays);
      resetAndClose();
    }
  };

  const handleBatchAdd = () => {
    if (selectedEmployeIds.size === 0 || commonDays.length === 0) return;
    selectedEmployeIds.forEach(employeId => {
      const takenDays = daysTakenByEmploye.get(employeId) || new Set();
      const availableDays = commonDays.filter(d => !takenDays.has(d));
      if (availableDays.length > 0) {
        onAdd(employeId, availableDays);
      }
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedEmployeId(null);
    setSelectedDays([]);
    setSelectedEmployeIds(new Set());
    setCommonDays([]);
    onOpenChange(false);
  };

  const handleToggleMultiMode = (checked: boolean) => {
    setMultiSelectMode(checked);
    setSelectedEmployeId(null);
    setSelectedDays([]);
    setSelectedEmployeIds(new Set());
    setCommonDays([]);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "tous" | "non-affectes");
    // Reset type filter if switching to non-affectes and interim was selected
    if (tab === "non-affectes" && typeFilter === "interim") {
      setTypeFilter("all");
    }
    // Reset selections on tab change
    setSelectedEmployeId(null);
    setSelectedDays([]);
    setSelectedEmployeIds(new Set());
    setCommonDays([]);
  };

  const selectedEmploye = allEmployes.find(e => e.id === selectedEmployeId);

  const commonAvailableDays = useMemo(() => {
    if (selectedEmployeIds.size === 0) return weekDays.map(d => d.date);
    let available = new Set(weekDays.map(d => d.date));
    selectedEmployeIds.forEach(empId => {
      const taken = daysTakenByEmploye.get(empId) || new Set();
      available = new Set([...available].filter(d => !taken.has(d)));
    });
    return [...available];
  }, [selectedEmployeIds, daysTakenByEmploye, weekDays]);

  const currentFilters = activeTab === "non-affectes" ? TYPE_FILTERS_NO_INTERIM : TYPE_FILTERS;
  const currentEmployes = activeTab === "non-affectes" ? unassignedEmployes : filteredEmployes;

  // Render employee row (shared between tabs)
  const renderEmployeeRow = (employe: Employe) => {
    const type = getEmployeType(employe);
    const colors = EMPLOYE_TYPE_COLORS[type];
    const takenDays = daysTakenByEmploye.get(employe.id) || new Set();
    const isSelectedSingle = selectedEmployeId === employe.id;
    const isSelectedMulti = selectedEmployeIds.has(employe.id);

    // For "Non affectés" tab, show assigned days (all chantiers)
    const assignedDays = activeTab === "non-affectes" 
      ? daysAssignedByEmploye.get(employe.id) || new Set()
      : null;
    const absenceDates = absencesLDByEmploye?.get(employe.id)?.dates || new Set();

    // Calculer si l'employé a 0 jour libre (non sélectionnable)
    const isFullyUnavailable = activeTab === "non-affectes" && (() => {
      const assigned = daysAssignedByEmploye.get(employe.id) || new Set();
      const absDates = absencesLDByEmploye?.get(employe.id)?.dates || new Set();
      return weekDays.every(d => assigned.has(d.date) || absDates.has(d.date));
    })();

    return (
      <div
        key={employe.id}
        className={cn(
          "p-3 rounded-md transition-colors",
          isFullyUnavailable 
            ? "opacity-50 cursor-not-allowed"
            : multiSelectMode 
              ? (isSelectedMulti ? "bg-primary/10 border border-primary" : "hover:bg-muted/50")
              : (isSelectedSingle ? "bg-primary/10 border border-primary" : "hover:bg-muted/50 cursor-pointer")
        )}
        onClick={() => !isFullyUnavailable && !multiSelectMode && handleSelectEmploye(employe)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {multiSelectMode && (
              <Checkbox
                checked={isSelectedMulti}
                disabled={isFullyUnavailable}
                onCheckedChange={() => handleToggleEmployeMulti(employe.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              colors.bg, colors.text
            )}>
              {colors.label}
            </span>
            <span className="font-medium">
              {employe.nom?.toUpperCase()} {employe.prenom}
            </span>
            {absencesLDByEmploye?.has(employe.id) && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                {absencesLDByEmploye.get(employe.id)!.type}
              </Badge>
            )}
          </div>

          {/* Availability grid for "Non affectés" tab */}
          {activeTab === "non-affectes" && assignedDays !== null ? (
            <div className="flex gap-1">
              {weekDays.map(day => {
                const isAssigned = assignedDays.has(day.date);
                const isAbsent = absenceDates.has(day.date);
                const isFree = !isAssigned && !isAbsent;
                return (
                  <div
                    key={day.date}
                    className={cn(
                      "w-7 h-7 rounded flex items-center justify-center text-xs font-medium",
                      isFree 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                        : isAbsent
                          ? "bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-500"
                          : "bg-muted text-muted-foreground"
                    )}
                    title={isFree ? `${day.fullName} — Disponible` : isAbsent ? `${day.fullName} — Absent` : `${day.fullName} — Affecté`}
                  >
                    {day.dayName}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Jours déjà pris ailleurs (onglet "Tous") */
            <div className="flex gap-1">
              {weekDays.map(day => {
                const isTaken = takenDays.has(day.date);
                const isAbsent = absenceDates.has(day.date);
                return (
                  <div
                    key={day.date}
                    className={cn(
                      "w-7 h-7 rounded flex items-center justify-center text-xs font-medium",
                      isTaken
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : isAbsent
                          ? "bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-500"
                          : "bg-muted text-muted-foreground"
                    )}
                    title={isTaken ? `${day.fullName} — Affecté` : isAbsent ? `${day.fullName} — Absent` : `${day.fullName} — Libre`}
                  >
                    {day.dayName}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sélection des jours - MODE SIMPLE uniquement */}
        {!multiSelectMode && isSelectedSingle && (
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {multiSelectMode ? (
              <Users className="h-5 w-5" />
            ) : (
              <UserPlus className="h-5 w-5" />
            )}
            {multiSelectMode ? "Ajouter plusieurs employés" : "Ajouter un employé au planning"}
          </DialogTitle>
        </DialogHeader>

        {/* Toggle mode multi-sélection */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Switch 
              id="multi-select-mode"
              checked={multiSelectMode} 
              onCheckedChange={handleToggleMultiMode} 
            />
            <Label htmlFor="multi-select-mode" className="cursor-pointer">
              Sélection multiple
            </Label>
          </div>
          {multiSelectMode && selectedEmployeIds.size > 0 && (
            <Badge variant="secondary">
              {selectedEmployeIds.size} sélectionné{selectedEmployeIds.size > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Tabs: Tous / Non affectés */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="tous" className="flex-1 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Tous
            </TabsTrigger>
            <TabsTrigger value="non-affectes" className="flex-1 gap-1.5">
              <UserX className="h-3.5 w-3.5" />
              Non affectés
              {unassignedEmployes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                  {unassignedEmployes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Shared content below tabs */}
          <div className="space-y-3 mt-3">
            {/* Filtres */}
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
              {currentFilters.map(filter => (
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

          {/* Compteur */}
          <div className="text-sm text-muted-foreground mt-2">
            {currentEmployes.length} employé{currentEmployes.length > 1 ? "s" : ""} 
            {activeTab === "non-affectes" ? " non entièrement affecté" : " disponible"}
            {currentEmployes.length > 1 ? "s" : ""}
            {typeFilter !== "all" && ` (filtre: ${currentFilters.find(f => f.value === typeFilter)?.label})`}
          </div>

          {/* Employee list (same for both tabs, different data source) */}
          <ScrollArea className="h-[35vh] border rounded-md mt-2">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : currentEmployes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {activeTab === "non-affectes" 
                    ? "Tous les employés permanents sont entièrement affectés cette semaine"
                    : "Aucun employé disponible"
                  }
                </p>
              ) : (
                currentEmployes.map(renderEmployeeRow)
              )}
            </div>
          </ScrollArea>
        </Tabs>

        {/* Sélection des jours communs - MODE MULTI */}
        {multiSelectMode && selectedEmployeIds.size > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Jours à affecter pour les {selectedEmployeIds.size} employé{selectedEmployeIds.size > 1 ? "s" : ""} :
              </span>
              {commonAvailableDays.length < weekDays.length && (
                <span className="text-xs text-muted-foreground">
                  (certains jours sont indisponibles pour certains employés)
                </span>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              {weekDays.map(day => {
                const isAvailable = commonAvailableDays.includes(day.date);
                return (
                  <div key={day.date} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`common-day-${day.date}`}
                      checked={commonDays.includes(day.date)}
                      onCheckedChange={() => handleToggleCommonDay(day.date)}
                      disabled={!isAvailable}
                    />
                    <label 
                      htmlFor={`common-day-${day.date}`}
                      className={cn(
                        "text-sm cursor-pointer",
                        !isAvailable && "text-muted-foreground line-through"
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

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          
          {multiSelectMode ? (
            <Button 
              onClick={handleBatchAdd}
              disabled={selectedEmployeIds.size === 0 || commonDays.length === 0}
            >
              <Users className="h-4 w-4 mr-2" />
              Ajouter {selectedEmployeIds.size} employé{selectedEmployeIds.size > 1 ? "s" : ""}
              {commonDays.length > 0 && ` (${commonDays.length}j)`}
            </Button>
          ) : (
            <Button 
              onClick={handleAdd}
              disabled={!selectedEmployeId || selectedDays.length === 0}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter {selectedEmploye ? `${selectedEmploye.prenom}` : ""}
              {selectedDays.length > 0 && ` (${selectedDays.length}j)`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
