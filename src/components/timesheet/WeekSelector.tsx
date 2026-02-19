import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { calculatePreviousWeek, getNextWeek, parseISOWeek } from "@/lib/weekUtils";

interface WeekSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const WeekSelector = ({ value, onChange, disabled = false }: WeekSelectorProps) => {
  const [baseWeeks, setBaseWeeks] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const generatedWeeks = [];
    const today = new Date();
    
    for (let i = -1; i <= 1; i++) {
      const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1, locale: fr });
      const weekLabel = format(weekStart, "'Semaine' II – 'du' dd/MM/yyyy", { locale: fr });
      
      generatedWeeks.push({
        value: format(weekStart, "RRRR-'S'II"),
        label: weekLabel,
      });
    }
    
    setBaseWeeks(generatedWeeks);
    
    if (!value) {
      const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
      onChange(format(currentWeek, "RRRR-'S'II"));
    }
  }, []);

  // Add current value to dropdown if not in base weeks
  const weeks = useMemo(() => {
    if (!value || baseWeeks.some(w => w.value === value)) return baseWeeks;
    const weekStart = parseISOWeek(value);
    const weekLabel = format(weekStart, "'Semaine' II – 'du' dd/MM/yyyy", { locale: fr });
    return [{ value, label: weekLabel }, ...baseWeeks];
  }, [baseWeeks, value]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(calculatePreviousWeek(value))}
        disabled={disabled || !value}
        className="h-12 w-10 shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
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
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(getNextWeek(value))}
        disabled={disabled || !value}
        className="h-12 w-10 shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
