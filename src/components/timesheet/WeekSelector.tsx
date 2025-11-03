import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addWeeks, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface WeekSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const WeekSelector = ({ value, onChange, disabled = false }: WeekSelectorProps) => {
  const [weeks, setWeeks] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    // Generate 3 weeks: previous week (S-1), current week (S), and next week (S+1)
    const generatedWeeks = [];
    const today = new Date();
    
    for (let i = -1; i <= 1; i++) {
      const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1, locale: fr });
      const weekLabel = format(weekStart, "'Semaine' II – 'du' dd/MM/yyyy", { locale: fr });
      
      generatedWeeks.push({
        value: format(weekStart, "RRRR-'S'II"), // format ISO semaine attendu par la base
        label: weekLabel,
      });
    }
    
    setWeeks(generatedWeeks);
    
    // Auto-select current week seulement si aucune valeur n'est fournie
    if (!value) {
      const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
      onChange(format(currentWeek, "RRRR-'S'II"));
    }
  }, []);

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
