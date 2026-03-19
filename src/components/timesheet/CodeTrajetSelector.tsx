import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CODE_TRAJET_OPTIONS, CodeTrajet } from "@/types/transport";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { X } from "lucide-react";

interface CodeTrajetSelectorProps {
  value: CodeTrajet | null;
  onChange: (value: CodeTrajet | null) => void;
  disabled?: boolean;
  hasHours: boolean;
  onBatchChange?: (value: CodeTrajet | null) => void;
  batchDaysCount?: number;
  chantierName?: string;
}

export const CodeTrajetSelector = ({ 
  value, 
  onChange, 
  disabled, 
  hasHours,
  onBatchChange,
  batchDaysCount,
  chantierName
}: CodeTrajetSelectorProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<CodeTrajet | null>(null);

  const handleValueChange = (newValue: string) => {
    const trajetValue = newValue === "AUCUN" ? null : (newValue as CodeTrajet);
    
    if (onBatchChange && batchDaysCount && batchDaysCount > 1) {
      setPendingValue(trajetValue);
      setShowDialog(true);
    } else {
      onChange(trajetValue);
    }
  };

  const handleSingleDay = () => {
    if (pendingValue !== undefined) {
      onChange(pendingValue);
    }
    setShowDialog(false);
    setPendingValue(null);
  };

  const handleAllDays = () => {
    if (pendingValue !== undefined && onBatchChange) {
      onBatchChange(pendingValue);
    }
    setShowDialog(false);
    setPendingValue(null);
  };

  const handleOpenChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setPendingValue(null);
    }
  };

  const trajetLabel = pendingValue 
    ? CODE_TRAJET_OPTIONS.find(opt => opt.value === pendingValue)?.label || pendingValue
    : "Aucun";

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={value || "AUCUN"}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Sélectionner un trajet" />
          </SelectTrigger>
          <SelectContent className="z-[100] bg-background">
            {CODE_TRAJET_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.value === "AUCUN" && hasHours}
                className={option.value === "AUCUN" && hasHours ? "opacity-50 cursor-not-allowed" : ""}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {hasHours && !value && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs whitespace-nowrap">
            ⚠️ À saisir
          </Badge>
        )}
      </div>

      <AlertDialog open={showDialog} onOpenChange={handleOpenChange}>
        <AlertDialogContent container={typeof document !== 'undefined' ? document.body : undefined}>
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>Appliquer à plusieurs jours ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Vous avez sélectionné <strong>{trajetLabel}</strong>.
              </p>
              <p>
                Ce salarié a travaillé <strong>{batchDaysCount} jour{batchDaysCount && batchDaysCount > 1 ? 's' : ''}</strong> sur <strong>{chantierName}</strong>.
              </p>
              <p className="text-foreground font-medium mt-3">
                Voulez-vous appliquer ce trajet à tous ces jours ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSingleDay}>
              Ce jour uniquement
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAllDays}>
              Tous les jours ({batchDaysCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};