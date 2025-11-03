import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: number | boolean;
  type: "number" | "checkbox";
  onSave: (newValue: number | boolean) => Promise<void>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export const EditableCell = ({
  value,
  type,
  onSave,
  min = 0,
  max,
  step = 0.5,
  unit = "h",
  disabled = false,
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = async (newValue: number | boolean) => {
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(newValue);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setLocalValue(value); // Rollback
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    setLocalValue(newValue);

    // Clear previous timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Auto-save after 500ms
    const timeout = setTimeout(() => {
      handleSave(newValue);
    }, 500);

    setSaveTimeout(timeout);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setLocalValue(checked);
    handleSave(checked);
  };

  const handleBlur = () => {
    if (type === "number" && localValue !== value) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      handleSave(localValue as number);
    } else {
      setIsEditing(false);
    }
  };

  if (type === "checkbox") {
    return (
      <div className="flex items-center justify-center gap-2">
        <Checkbox
          checked={localValue as boolean}
          onCheckedChange={handleCheckboxChange}
          disabled={isSaving || disabled}
          className={cn(
            "cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {showSuccess && <Check className="h-3 w-3 text-success animate-in fade-in" />}
      </div>
    );
  }

  // Number input
  return (
    <div className="relative group flex items-center justify-end gap-2">
      {isEditing ? (
        <Input
          type="number"
          value={localValue as number}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          className="w-20 h-8 text-right"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      ) : (
        <div
          onClick={() => !disabled && setIsEditing(true)}
          className={cn(
            "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors min-w-[3rem] text-right",
            showSuccess && "bg-success/10",
            disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
          )}
        >
          {localValue}{unit}
        </div>
      )}
      {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {showSuccess && <Check className="h-3 w-3 text-success animate-in fade-in" />}
    </div>
  );
};
