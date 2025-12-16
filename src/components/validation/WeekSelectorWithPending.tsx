import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addWeeks } from "date-fns";
import { getCurrentWeek, parseISOWeek } from "@/lib/weekUtils";

interface WeekSelectorWithPendingProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const WeekSelectorWithPending = ({ value, onChange, disabled }: WeekSelectorWithPendingProps) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  const currentWeek = getCurrentWeek();

  // Fetch weeks with pending VALIDE_CHEF fiches
  const { data: pendingWeeks } = useQuery({
    queryKey: ["pending-weeks-valide-chef", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("fiches")
        .select("semaine, chantier_id, chantiers!inner(entreprise_id)")
        .eq("statut", "VALIDE_CHEF")
        .eq("chantiers.entreprise_id", entrepriseId)
        .not("semaine", "is", null);

      if (error) throw error;

      // Get distinct weeks
      const distinctWeeks = [...new Set(data?.map(f => f.semaine).filter(Boolean))] as string[];
      return distinctWeeks;
    },
    enabled: !!entrepriseId,
    staleTime: 0, // Always refetch to ensure fresh pending status
    refetchOnWindowFocus: true,
  });

  // Generate default weeks (previous, current, next)
  const generateDefaultWeeks = (): string[] => {
    const currentDate = parseISOWeek(currentWeek);
    const weeks: string[] = [];
    
    for (let i = -1; i <= 1; i++) {
      const weekDate = addWeeks(currentDate, i);
      weeks.push(format(weekDate, "RRRR-'S'II"));
    }
    
    return weeks;
  };

  // Merge and sort all weeks
  const getAllWeeks = (): string[] => {
    const defaultWeeks = generateDefaultWeeks();
    const allWeeks = new Set([...defaultWeeks, ...(pendingWeeks || [])]);
    
    // Sort descending (most recent first)
    return Array.from(allWeeks).sort((a, b) => {
      const dateA = parseISOWeek(a);
      const dateB = parseISOWeek(b);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const weeks = getAllWeeks();
  const pendingSet = new Set(pendingWeeks || []);

  const formatWeekLabel = (week: string): string => {
    const weekDate = parseISOWeek(week);
    const endDate = addWeeks(weekDate, 0);
    endDate.setDate(endDate.getDate() + 4); // Friday
    
    const startStr = format(weekDate, "dd/MM");
    const endStr = format(endDate, "dd/MM");
    const weekNum = week.split("-S")[1] || week.split("-W")[1];
    
    return `S${weekNum} (${startStr} - ${endStr})`;
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-12">
        <SelectValue placeholder="Sélectionner une semaine" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2 font-medium">
            📅 Toutes les semaines
          </span>
        </SelectItem>
        {weeks.map((week) => (
          <SelectItem key={week} value={week}>
            <span className="flex items-center gap-2">
              {formatWeekLabel(week)}
              {pendingSet.has(week) && (
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" title="Fiches en attente" />
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
