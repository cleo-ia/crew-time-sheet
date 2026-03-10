import { useState, useMemo } from "react";
import { useEncadrementUsers, EncadrementUser } from "@/hooks/useEncadrementUsers";
import { useModificationsHistory } from "@/hooks/useModificationsHistory";
import { ModificationHistoryTable } from "@/components/shared/ModificationHistoryTable";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Eye, Users } from "lucide-react";
import { format, formatDistanceToNow, subDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const ROLE_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "gestionnaire", label: "Gestionnaire" },
  { value: "rh", label: "RH" },
  { value: "conducteur", label: "Conducteur" },
  { value: "chef", label: "Chef" },
];

const ROLE_ORDER: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  gestionnaire: 2,
  rh: 3,
  conducteur: 4,
  chef: 5,
  grutier: 6,
  macon: 7,
  finisseur: 8,
  interimaire: 9,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  gestionnaire: "Gestionnaires",
  rh: "RH",
  conducteur: "Conducteurs",
  chef: "Chefs de chantier",
  grutier: "Grutiers",
  macon: "Maçons",
  finisseur: "Finisseurs",
  interimaire: "Intérimaires",
};

const PERIOD_OPTIONS = [
  { value: "7days", label: "7 derniers jours" },
  { value: "30days", label: "30 derniers jours" },
  { value: "thisMonth", label: "Mois en cours" },
];

const VALID_ROLES = ["super_admin", "admin", "gestionnaire", "chef", "macon", "finisseur", "interimaire", "conducteur", "rh", "grutier"] as const;

const getRoleColor = (role: string) => {
  switch (role) {
    case "admin": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "gestionnaire": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "rh": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "conducteur": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "chef": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    default: return "bg-muted text-muted-foreground";
  }
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function UserCard({
  user,
  onSelect,
}: {
  user: EncadrementUser;
  onSelect: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getRoleColor(user.role)}`}
          >
            {getInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            {VALID_ROLES.includes(user.role as any) && (
              <div className="mt-1">
                <RoleBadge role={user.role as any} size="sm" />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {user.lastActivity
                ? `Dernière activité : ${formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true, locale: fr })}`
                : "Aucune activité enregistrée"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={onSelect}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Consulter l'activité
        </Button>
      </CardContent>
    </Card>
  );
}

function UserDetailSheet({
  user,
  open,
  onOpenChange,
  entrepriseId,
}: {
  user: EncadrementUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepriseId: string | null;
}) {
  const [period, setPeriod] = useState("30days");

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "7days":
        return { startDate: subDays(now, 7).toISOString(), endDate: now.toISOString() };
      case "30days":
        return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() };
      case "thisMonth":
        return { startDate: startOfMonth(now).toISOString(), endDate: endOfMonth(now).toISOString() };
      default:
        return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() };
    }
  }, [period]);

  const { data: modifications = [], isLoading } = useModificationsHistory({
    entrepriseId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    userId: user?.id || undefined,
    limit: 500,
  });

  const handleExportCSV = () => {
    if (modifications.length === 0 || !user) return;

    const headers = ["Date", "Heure", "Action", "Page", "Champ modifié", "Ancienne valeur", "Nouvelle valeur", "Détails"];
    const rows = modifications.map((mod) => {
      const date = new Date(mod.created_at);
      const details = mod.details as Record<string, unknown>;
      const detailsStr = Object.entries(details)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
      return [
        format(date, "dd/MM/yyyy", { locale: fr }),
        format(date, "HH:mm", { locale: fr }),
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
    link.download = `activite-${user.name.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[50vw] p-0 flex flex-col h-full">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getRoleColor(user.role)}`}
            >
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold truncate">
                {user.name}
              </SheetTitle>
              {VALID_ROLES.includes(user.role as any) && (
                <div className="mt-1">
                  <RoleBadge role={user.role as any} size="sm" />
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="px-6 py-3 border-b flex items-center gap-3 shrink-0 flex-wrap">
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={modifications.length === 0}
            className="ml-auto"
          >
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="text-sm text-muted-foreground mb-3">
            {modifications.length} modification{modifications.length !== 1 ? "s" : ""}
          </div>
          <ModificationHistoryTable
            modifications={modifications}
            isLoading={isLoading}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function HistoriqueManager() {
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<EncadrementUser | null>(null);

  const entrepriseId = localStorage.getItem("current_entreprise_id");

  const { data: users = [], isLoading } = useEncadrementUsers(
    entrepriseId,
    roleFilter !== "all" ? roleFilter : null
  );

  const groupedUsers = useMemo(() => {
    const groups: Record<string, EncadrementUser[]> = {};
    for (const user of users) {
      const role = user.role || "unknown";
      if (!groups[role]) groups[role] = [];
      groups[role].push(user);
    }
    // Sort each group alphabetically
    for (const role of Object.keys(groups)) {
      groups[role].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    }
    // Sort groups by ROLE_ORDER
    const sortedEntries = Object.entries(groups).sort(
      ([a], [b]) => (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99)
    );
    return sortedEntries;
  }, [users]);

  const showGroupHeaders = roleFilter === "all";

  return (
    <div className="space-y-6">
      {/* Role filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="h-5 w-5 text-muted-foreground" />
        {ROLE_FILTERS.map((rf) => (
          <Button
            key={rf.value}
            variant={roleFilter === rf.value ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter(rf.value)}
          >
            {rf.label}
          </Button>
        ))}
      </div>

      {/* Users grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun utilisateur trouvé pour ce filtre.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedUsers.map(([role, roleUsers]) => (
            <div key={role}>
              {showGroupHeaders && (
                <div className="flex items-center gap-2 mb-3">
                  {VALID_ROLES.includes(role as any) ? (
                    <RoleBadge role={role as any} size="sm" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{role}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    ({roleUsers.length})
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {roleUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onSelect={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
        entrepriseId={entrepriseId}
      />
    </div>
  );
}
