import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";
import { getEmployeType, EMPLOYE_TYPE_COLORS, Employe } from "@/hooks/useAllEmployes";
import { PlanningVehiculeCombobox } from "./PlanningVehiculeCombobox";

interface PlanningEmployeRowProps {
  employe: Employe;
  affectations: PlanningAffectation[];
  weekDays: { date: string; dayName: string; fullName: string }[];
  onDayToggle: (employeId: string, date: string, checked: boolean) => void;
  onVehiculeChange: (employeId: string, vehiculeId: string | null) => void;
  onRemove: (employeId: string) => void;
  isLoading?: boolean;
}

export const PlanningEmployeRow = ({
  employe,
  affectations,
  weekDays,
  onDayToggle,
  onVehiculeChange,
  onRemove,
  isLoading,
}: PlanningEmployeRowProps) => {
  const type = getEmployeType(employe);
  const typeColors = EMPLOYE_TYPE_COLORS[type];
  
  // Récupérer le véhicule depuis les affectations (le même pour toute la semaine)
  const currentVehiculeId = affectations[0]?.vehicule_id || null;
  
  // Jours affectés
  const affectedDates = new Set(affectations.map(a => a.jour));

  return (
    <div className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md group">
      {/* Badge type */}
      <span className={cn(
        "px-2 py-0.5 rounded text-xs font-medium min-w-[60px] text-center",
        typeColors.bg,
        typeColors.text
      )}>
        {typeColors.label}
      </span>

      {/* Nom */}
      <div className="flex-1 min-w-[150px]">
        <span className="font-medium">
          {employe.nom?.toUpperCase()} {employe.prenom}
        </span>
      </div>

      {/* Ville */}
      <div className="w-[100px] text-sm text-muted-foreground truncate">
        {employe.adresse_domicile || "-"}
      </div>

      {/* Fonction */}
      <div className="w-[100px] text-sm text-muted-foreground truncate">
        {employe.libelle_emploi || employe.role_metier || "-"}
      </div>

      {/* Véhicule */}
      <div className="w-[140px]">
        <PlanningVehiculeCombobox
          value={currentVehiculeId}
          onChange={(vehiculeId) => onVehiculeChange(employe.id, vehiculeId)}
          disabled={isLoading}
        />
      </div>

      {/* Agence (intérimaires) */}
      <div className="w-[80px] text-xs text-muted-foreground truncate">
        {employe.agence_interim || ""}
      </div>

      {/* Jours L-V */}
      <div className="flex items-center gap-1">
        {weekDays.map(day => (
          <div key={day.date} className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-1">{day.dayName}</span>
            <Checkbox
              checked={affectedDates.has(day.date)}
              onCheckedChange={(checked) => onDayToggle(employe.id, day.date, !!checked)}
              disabled={isLoading}
              className="h-5 w-5"
            />
          </div>
        ))}
      </div>

      {/* Bouton supprimer */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(employe.id)}
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
