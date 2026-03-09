import { useState, useMemo } from "react";
import { useModificationsHistory } from "@/hooks/useModificationsHistory";
import { ModificationHistoryTable } from "@/components/shared/ModificationHistoryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Search } from "lucide-react";
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
  { value: "signature_chef", label: "Signatures chef" },
  { value: "transmission", label: "Transmissions" },
  { value: "transmission_conducteur", label: "Envoi conducteur" },
  { value: "validation_conducteur", label: "Validation conducteur" },
  { value: "modification_pre_export", label: "Pré-export" },
  { value: "export_paie", label: "Export paie" },
  { value: "cloture_periode", label: "Clôture période" },
  { value: "sync_planning", label: "Sync planning" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "Tous les rôles" },
  { value: "admin", label: "Admin" },
  { value: "gestionnaire", label: "Gestionnaire" },
  { value: "rh", label: "RH" },
  { value: "conducteur", label: "Conducteur" },
  { value: "chef", label: "Chef" },
];

export function HistoriqueManager() {
  const [period, setPeriod] = useState("30days");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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

  const dateRange = useMemo(() => getDateRange(), [period]);

  const { data: modifications = [], isLoading } = useModificationsHistory({
    entrepriseId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    action: actionFilter !== "all" ? actionFilter : undefined,
    userId: userFilter !== "all" ? userFilter : undefined,
    searchTerm: searchTerm || undefined,
    limit: 500,
  });

  // Client-side role filter
  const filteredModifications = useMemo(() => {
    if (roleFilter === "all") return modifications;
    return modifications.filter((mod) => mod.user_role === roleFilter);
  }, [modifications, roleFilter]);

  // Extract unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map<string, string>();
    modifications.forEach((mod) => {
      if (!usersMap.has(mod.user_id)) {
        usersMap.set(mod.user_id, mod.user_name);
      }
    });
    return Array.from(usersMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [modifications]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["fiches-modifications"] });
  };

  const handleExportCSV = () => {
    if (filteredModifications.length === 0) return;

    const headers = ["Date", "Heure", "Utilisateur", "Rôle", "Action", "Page", "Champ modifié", "Ancienne valeur", "Nouvelle valeur", "Détails"];
    const rows = filteredModifications.map((mod) => {
      const date = new Date(mod.created_at);
      const details = mod.details as Record<string, unknown>;
      const detailsStr = Object.entries(details)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");

      return [
        format(date, "dd/MM/yyyy", { locale: fr }),
        format(date, "HH:mm", { locale: fr }),
        mod.user_name,
        mod.user_role || "",
        mod.action,
        mod.page_source || "",
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
    total: filteredModifications.length,
    today: filteredModifications.filter(
      (m) => format(new Date(m.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    ).length,
    uniqueUsers: new Set(filteredModifications.map((m) => m.user_id)).size,
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

        <div className="space-y-1.5">
          <Label>Rôle</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Utilisateur</Label>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {uniqueUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Recherche</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Salarié, chantier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[200px] pl-8"
            />
          </div>
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
            disabled={filteredModifications.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <ModificationHistoryTable
        modifications={filteredModifications}
        isLoading={isLoading}
      />
    </div>
  );
}
