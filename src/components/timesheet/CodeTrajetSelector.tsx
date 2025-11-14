import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CODE_TRAJET_OPTIONS, CodeTrajet } from "@/types/transport";
import { Badge } from "@/components/ui/badge";

interface CodeTrajetSelectorProps {
  value: CodeTrajet | null;
  onChange: (value: CodeTrajet | null) => void;
  disabled?: boolean;
  hasHours: boolean; // Pour désactiver "Aucun" si heures > 0
}

export const CodeTrajetSelector = ({ value, onChange, disabled, hasHours }: CodeTrajetSelectorProps) => {
  const handleValueChange = (newValue: string) => {
    if (newValue === "AUCUN") {
      onChange(null);
    } else {
      onChange(newValue as CodeTrajet);
    }
  };

  return (
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
  );
};
