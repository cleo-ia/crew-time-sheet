import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";
import { 
  getEmployeType, 
  EMPLOYE_TYPE_COLORS, 
  Employe,
  getEmployeeTextColor,
  formatAdresseCourte 
} from "@/hooks/useAllEmployes";
import { PlanningVehiculeCombobox } from "./PlanningVehiculeCombobox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlanningEmployeRowProps {
  employe: Employe;
  affectations: PlanningAffectation[];
  weekDays: { date: string; dayName: string; fullName: string }[];
  onDayToggle: (employeId: string, date: string, checked: boolean) => void;
  onVehiculeChange: (employeId: string, vehiculeId: string | null) => void;
  onRemove: (employeId: string) => void;
  isLoading?: boolean;
  conflictDays?: Map<string, string>; // jour -> nom du chantier en conflit
}

// Composant pour afficher "1" au lieu d'une checkbox
const DayIndicator = ({ 
  checked, 
  onClick, 
  disabled 
}: { 
  checked: boolean; 
  onClick: () => void; 
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-6 h-6 text-center text-sm font-bold rounded cursor-pointer transition-colors",
      "border border-transparent",
      checked 
        ? "text-foreground bg-primary/10 border-primary/30" 
        : "text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground",
      disabled && "cursor-not-allowed opacity-50"
    )}
  >
    {checked ? "1" : ""}
  </button>
);

// Composant pour afficher un conflit (employé affecté ailleurs ce jour)
const ConflictIndicator = ({ chantierName }: { chantierName: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="w-6 h-6 flex items-center justify-center text-orange-500 cursor-help">
        <AlertTriangle className="h-4 w-4" />
      </div>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[200px]">
      <p className="text-xs">Affecté sur <strong>{chantierName}</strong></p>
    </TooltipContent>
  </Tooltip>
);

export const PlanningEmployeRow = ({
  employe,
  affectations,
  weekDays,
  onDayToggle,
  onVehiculeChange,
  onRemove,
  isLoading,
  conflictDays,
}: PlanningEmployeRowProps) => {
  const type = getEmployeType(employe);
  const typeColors = EMPLOYE_TYPE_COLORS[type];
  const textColor = getEmployeeTextColor(employe);
  
  // Récupérer le véhicule depuis les affectations (le même pour toute la semaine)
  const currentVehiculeId = affectations[0]?.vehicule_id || null;
  
  // Jours affectés
  const affectedDates = new Set(affectations.map(a => a.jour));

  // Formater le véhicule de manière compacte
  const vehicule = affectations[0]?.vehicule;
  const vehiculeDisplay = vehicule 
    ? `${vehicule.modele || ""} ${vehicule.immatriculation || ""}`.trim()
    : null;

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 hover:bg-muted/50 rounded-md group border-b border-border/50 last:border-0">
      {/* Badge type */}
      <span className={cn(
        "px-2 py-0.5 rounded text-xs font-medium min-w-[50px] text-center",
        typeColors.bg,
        typeColors.text
      )}>
        {typeColors.label}
      </span>

      {/* Nom avec couleur selon type */}
      <div className={cn("flex-1 min-w-[140px]", textColor)}>
        <span className="font-semibold">
          {employe.nom?.toUpperCase()} {employe.prenom}
        </span>
      </div>

      {/* Adresse courte (ex: "71 macon") */}
      <div className="w-[80px] text-xs text-muted-foreground truncate">
        {formatAdresseCourte(employe.adresse_domicile)}
      </div>

      {/* Fonction */}
      <div className="w-[80px] text-xs text-muted-foreground truncate">
        {employe.libelle_emploi || employe.role_metier || "-"}
      </div>

      {/* Véhicule - format compact */}
      <div className="w-[130px]">
        <PlanningVehiculeCombobox
          value={currentVehiculeId}
          onChange={(vehiculeId) => onVehiculeChange(employe.id, vehiculeId)}
          disabled={isLoading}
        />
      </div>

      {/* Agence intérim (en vert si présente) */}
      <div className={cn(
        "w-[70px] text-xs truncate",
        employe.agence_interim ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
      )}>
        {employe.agence_interim || ""}
      </div>

      {/* Jours L-V avec indicateur "1" ou alerte conflit */}
      <div className="flex items-center gap-0.5">
        {weekDays.map(day => {
          const isAffectedHere = affectedDates.has(day.date);
          const conflictChantier = conflictDays?.get(day.date);
          
          // Si conflit sur ce jour (affecté ailleurs), afficher alerte
          if (conflictChantier && !isAffectedHere) {
            return <ConflictIndicator key={day.date} chantierName={conflictChantier} />;
          }
          
          return (
            <DayIndicator
              key={day.date}
              checked={isAffectedHere}
              onClick={() => onDayToggle(employe.id, day.date, !isAffectedHere)}
              disabled={isLoading || !!conflictChantier}
            />
          );
        })}
      </div>

      {/* Bouton supprimer */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(employe.id)}
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        disabled={isLoading}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
