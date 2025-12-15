import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculatePreviousWeek } from "@/lib/weekUtils";

interface WeekSelectorChefProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  chefId?: string;
}

export const WeekSelectorChef = ({ value, onChange, disabled = false, chefId }: WeekSelectorChefProps) => {
  const [baseWeeks, setBaseWeeks] = useState<{ value: string; label: string }[]>([]);
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  // Calculate S-2 week value
  const s2Week = useMemo(() => {
    const today = new Date();
    const s1Start = startOfWeek(addWeeks(today, -1), { weekStartsOn: 1, locale: fr });
    const s1Value = format(s1Start, "RRRR-'S'II");
    return calculatePreviousWeek(s1Value);
  }, []);

  // Check if chef has incomplete chantiers for S-2
  const { data: hasIncompleteS2 } = useQuery({
    queryKey: ["chef-incomplete-s2", chefId, s2Week, entrepriseId],
    queryFn: async () => {
      if (!chefId || !entrepriseId) return false;

      // Get all active chantiers for this chef
      const { data: chantiers, error: chantiersError } = await supabase
        .from("chantiers")
        .select("id")
        .eq("chef_id", chefId)
        .eq("entreprise_id", entrepriseId)
        .eq("actif", true);

      if (chantiersError || !chantiers?.length) return false;

      const chantierIds = chantiers.map(c => c.id);

      // Check if any chantier has no validated fiche for S-2
      const { data: validatedFiches } = await supabase
        .from("fiches")
        .select("chantier_id")
        .in("chantier_id", chantierIds)
        .eq("semaine", s2Week)
        .in("statut", ["VALIDE_CHEF", "ENVOYE_RH", "CLOTURE", "AUTO_VALIDE", "VALIDE_CONDUCTEUR"]);

      const validatedChantierIds = new Set(validatedFiches?.map(f => f.chantier_id) || []);
      
      // If any chantier doesn't have a validated fiche for S-2, show S-2
      return chantierIds.some(id => !validatedChantierIds.has(id));
    },
    enabled: !!chefId && !!entrepriseId,
    staleTime: 30000,
  });

  useEffect(() => {
    // Generate 3 weeks: previous week (S-1), current week (S), and next week (S+1)
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
    
    // Auto-select current week seulement si aucune valeur n'est fournie
    if (!value) {
      const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
      onChange(format(currentWeek, "RRRR-'S'II"));
    }
  }, []);

  // Build final weeks list with S-2 if needed
  const weeks = useMemo(() => {
    if (!hasIncompleteS2 || baseWeeks.length === 0) return baseWeeks;

    // Add S-2 at the beginning
    const s2Start = startOfWeek(addWeeks(new Date(), -2), { weekStartsOn: 1, locale: fr });
    const s2Label = format(s2Start, "'Semaine' II – 'du' dd/MM/yyyy", { locale: fr });
    
    return [
      { value: s2Week, label: `⚠️ ${s2Label}` },
      ...baseWeeks,
    ];
  }, [baseWeeks, hasIncompleteS2, s2Week]);

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
