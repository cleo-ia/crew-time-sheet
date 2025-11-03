import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";

interface EditableAbsenceTypeCellProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  heuresAbsence: number;
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
];

export const EditableAbsenceTypeCell = ({ 
  value, 
  onSave, 
  heuresAbsence 
}: EditableAbsenceTypeCellProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Si pas d'absence, afficher "-"
  if (heuresAbsence === 0) {
    return <div className="text-center text-muted-foreground">-</div>;
  }

  const handleChange = async (newValue: string) => {
    if (newValue === value) return;

    setIsSaving(true);
    try {
      await onSave(newValue);
      
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
