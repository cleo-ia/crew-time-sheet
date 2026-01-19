import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { useUpdateFicheJour } from "@/hooks/useUpdateFicheJour";

interface DayData {
  date: string;
  ficheJourId: string;
  heuresNormales: number;
  heuresIntemperies: number;
  typeAbsence: string | null;
}

interface EditableAbsenceTypeCellProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  isAbsent: boolean; // true si l'employé est absent (heures=0 et intemperie=0)
  allDays?: DayData[]; // Tous les jours de la période pour la propagation
  currentDate?: string; // Date du jour actuel (ISO format)
}

const ABSENCE_TYPES = [
  { value: "CP", label: "Congés payés (CP)" },
  { value: "RTT", label: "RTT" },
  { value: "AM", label: "Absence maladie (AM)" },
  { value: "MP", label: "Maladie professionnelle (MP)" },
  { value: "AT", label: "Accident du travail (AT)" },
  { value: "CONGE_PARENTAL", label: "Congé parental" },
  { value: "HI", label: "Intempéries (HI)" },
  { value: "CPSS", label: "CPSS" },
  { value: "ABS_INJ", label: "Absence injustifiée (ABS INJ)" },
  { value: "ECOLE", label: "École (ECO)" },
];

export const EditableAbsenceTypeCell = ({ 
  value, 
  onSave, 
  isAbsent,
  allDays,
  currentDate
}: EditableAbsenceTypeCellProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const updateFicheJour = useUpdateFicheJour();

  // Si pas d'absence (employé présent), afficher "-"
  if (!isAbsent) {
    return <div className="text-center text-muted-foreground">-</div>;
  }

  const handleChange = async (newValue: string) => {
    if (newValue === value) return;

    setIsSaving(true);
    try {
      // 1. Sauvegarder le jour actuel
      await onSave(newValue);
      
      // 2. Si allDays et currentDate sont fournis, propager aux jours suivants
      if (allDays && currentDate) {
        const currentIndex = allDays.findIndex(d => d.date === currentDate);
        
        if (currentIndex !== -1) {
          // Parcourir les jours suivants
          for (let i = currentIndex + 1; i < allDays.length; i++) {
            const nextDay = allDays[i];
            
            // Vérifier si c'est un jour absent
            const isNextDayAbsent = nextDay.heuresNormales === 0;
            
            // Si le jour n'est pas absent (jour travaillé), arrêter la propagation
            if (!isNextDayAbsent) {
              break;
            }
            
            // Propager systématiquement (écraser si nécessaire)
            await updateFicheJour.mutateAsync({
              ficheJourId: nextDay.ficheJourId,
              field: "type_absence",
              value: newValue,
            });
          }
        }
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = () => {
    if (!value) return "À qualifier";
    const type = ABSENCE_TYPES.find(t => t.value === value);
    return type?.label || value;
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || ""}
        onValueChange={handleChange}
        disabled={isSaving}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="À qualifier">
            {getDisplayValue()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ABSENCE_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isSaving && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      
      {showSuccess && (
        <Check className="h-4 w-4 text-green-600" />
      )}
    </div>
  );
};
