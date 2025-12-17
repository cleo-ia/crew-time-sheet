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
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

const PERIOD_OPTIONS = [
  { value: "7days", label: "7 derniers jours" },
  { value: "30days", label: "30 derniers jours" },
  { value: "thisMonth", label: "Ce mois" },
  { value: "90days", label: "3 derniers mois" },
  { value: "all", label: "Tout" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "Toutes les actions" },
  { value: "creation", label: "Créations" },
  { value: "modification_heures", label: "Heures" },
  { value: "modification_trajet", label: "Trajets" },
  { value: "modification_absence", label: "Absences" },
  { value: "modification_statut", label: "Statuts" },
  { value: "signature", label: "Signatures" },
  { value: "transmission", label: "Transmissions" },
];

export function HistoriqueManager() {
  const [period, setPeriod] = useState("30days");
  const [actionFilter, setActionFilter] = useState("all");
  const queryClient = useQueryClient();

  const entrepriseId = localStorage.getItem("current_entreprise_id");

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
      case "90days":
        return {
          startDate: subDays(now, 90).toISOString(),
          endDate: now.toISOString(),
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
    limit: 500,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["fiches-modifications"] });
  };

  const handleExportCSV = () => {
    if (modifications.length === 0) return;

    const headers = ["Date", "Heure", "Utilisateur", "Action", "Champ modifié", "Ancienne valeur", "Nouvelle valeur", "Détails"];
    const rows = modifications.map((mod) => {
      const date = new Date(mod.created_at);
      const details = mod.details as Record<string, unknown>;
      const detailsStr = Object.entries(details)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");

      return [
        format(date, "dd/MM/yyyy", { locale: fr }),
        format(date, "HH:mm", { locale: fr }),
        mod.user_name,
        mod.action,
        mod.champ_modifie || "",
        mod.ancienne_valeur || "",
        mod.nouvelle_valeur || "",
        detailsStr,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique-modifications-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = {
    total: modifications.length,
    today: modifications.filter(
      (m) => format(new Date(m.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    ).length,
    uniqueUsers: new Set(modifications.map((m) => m.user_id)).size,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Modifications totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.today}</div>
            <div className="text-sm text-muted-foreground">Aujourd'hui</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <div className="text-sm text-muted-foreground">Utilisateurs actifs</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
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

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={modifications.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <ModificationHistoryTable
        modifications={modifications}
        isLoading={isLoading}
      />
    </div>
  );
}
