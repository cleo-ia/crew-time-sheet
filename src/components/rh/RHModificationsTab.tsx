import { useState } from "react";
import { useModificationsHistory } from "@/hooks/useModificationsHistory";
import { ModificationHistoryTable } from "@/components/shared/ModificationHistoryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { startOfMonth, endOfMonth, subDays, format } from "date-fns";

interface RHModificationsTabProps {
  entrepriseId: string | null;
}

const PERIOD_OPTIONS = [
  { value: "7days", label: "7 derniers jours" },
  { value: "30days", label: "30 derniers jours" },
  { value: "thisMonth", label: "Ce mois" },
  { value: "all", label: "Tout" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "Toutes les actions" },
  { value: "modification_heures", label: "Heures" },
  { value: "modification_trajet", label: "Trajets" },
  { value: "modification_absence", label: "Absences" },
  { value: "signature", label: "Signatures" },
  { value: "transmission", label: "Transmissions" },
];

export function RHModificationsTab({ entrepriseId }: RHModificationsTabProps) {
  const [period, setPeriod] = useState("30days");
  const [actionFilter, setActionFilter] = useState("all");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7days":
        return {
          startDate: subDays(now, 7).toISOString(),
          endDate: now.toISOString(),
        };
      case "30days":
        return {
          startDate: subDays(now, 30).toISOString(),
          endDate: now.toISOString(),
        };
      case "thisMonth":
        return {
          startDate: startOfMonth(now).toISOString(),
          endDate: endOfMonth(now).toISOString(),
        };
      default:
        return {};
    }
  };

  const dateRange = getDateRange();

  const { data: modifications = [], isLoading } = useModificationsHistory({
    entrepriseId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    action: actionFilter !== "all" ? actionFilter : undefined,
    limit: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <Label>Période</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Type d'action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {modifications.length} modification(s) trouvée(s)
      </div>

      <ModificationHistoryTable
        modifications={modifications}
        isLoading={isLoading}
      />
    </div>
  );
}
