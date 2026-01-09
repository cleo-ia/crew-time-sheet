import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { parseISOWeek } from "@/lib/weekUtils";

interface WeekSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const WeekSelector = ({ value, onChange, disabled = false }: WeekSelectorProps) => {
  const [weeks, setWeeks] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const generatedWeeks = [];
    const today = new Date();
    
    // Utiliser la semaine fournie comme ancrage, sinon aujourd'hui
    const anchorDate = value ? parseISOWeek(value) : today;
    
    // Générer 17 semaines (-8 à +8) autour de l'ancrage
    for (let i = -8; i <= 8; i++) {
      const weekStart = startOfWeek(addWeeks(anchorDate, i), { weekStartsOn: 1, locale: fr });
      const weekLabel = format(weekStart, "'Semaine' II – 'du' dd/MM/yyyy", { locale: fr });
      
      generatedWeeks.push({
        value: format(weekStart, "RRRR-'S'II"),
        label: weekLabel,
      });
    }
    
    setWeeks(generatedWeeks);
    
    // Auto-select current week seulement si aucune valeur n'est fournie
    if (!value) {
      const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
      onChange(format(currentWeek, "RRRR-'S'II"));
    }
  }, [value]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full h-12 text-base" disabled={disabled}>
        <SelectValue placeholder="Choisir une semaine..." />
      </SelectTrigger>
      <SelectContent>
        {weeks.map((week) => (
          <SelectItem key={week.value} value={week.value} className="text-base">
            {week.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
