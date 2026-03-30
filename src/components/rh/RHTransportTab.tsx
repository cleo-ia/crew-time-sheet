import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/ui/role-badge";
import { Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RHTransportTabProps {
  filters: { periode?: string; semaine?: string };
}

interface TransportRow {
  date: string;
  chantierNom: string;
  codeChantier: string | null;
  immatriculation: string | null;
  conducteurMatin: string | null;
  conducteurSoir: string | null;
}

const useRHTransportData = (periode: string | undefined, semaine: string | undefined) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["rh-transport", periode, semaine, entrepriseId],
    enabled: !!periode && periode !== "all" && !!entrepriseId,
    queryFn: async (): Promise<{ rows: TransportRow[]; userRoleMap: Record<string, string> }> => {
      if (!periode || periode === "all" || !entrepriseId) return { rows: [], userRoleMap: {} };

      let dateDebut: string;
      let dateFin: string;

      if (semaine && semaine !== "all") {
        const weekMonday = parseISOWeek(semaine);
        dateDebut = format(weekMonday, "yyyy-MM-dd");
        dateFin = format(addDays(weekMonday, 6), "yyyy-MM-dd");
      } else {
        const [year, month] = periode.split("-").map(Number);
        dateDebut = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
        dateFin = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
      }

      // Fetch transport jours in the date range with related data
      const { data: joursData, error } = await supabase
        .from("fiches_transport_jours")
        .select(`
          date,
          immatriculation,
          conducteur_aller_id,
          conducteur_retour_id,
          fiche_transport_id
        `)
        .eq("entreprise_id", entrepriseId)
        .gte("date", dateDebut)
        .lte("date", dateFin)
        .order("date", { ascending: true });

      if (error) throw error;
      if (!joursData || joursData.length === 0) return { rows: [], userRoleMap: {} };

      // Collect unique IDs for batch lookups
      const transportIds = [...new Set(joursData.map(j => j.fiche_transport_id))];
      const conducteurIds = new Set<string>();
      joursData.forEach(j => {
        if (j.conducteur_aller_id) conducteurIds.add(j.conducteur_aller_id);
        if (j.conducteur_retour_id) conducteurIds.add(j.conducteur_retour_id);
      });

      // Batch fetch: fiches_transport (for chantier_id), chantiers, utilisateurs
      const [transportRes, utilisateursRes] = await Promise.all([
        supabase
          .from("fiches_transport")
          .select("id, chantier_id")
          .in("id", transportIds),
        conducteurIds.size > 0
          ? supabase
              .from("utilisateurs")
              .select("id, nom, prenom, role_metier")
              .in("id", [...conducteurIds])
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (transportRes.error) throw transportRes.error;
      if (utilisateursRes.error) throw utilisateursRes.error;

      // Map transport -> chantier_id
      const transportChantierMap = new Map<string, string | null>();
      (transportRes.data || []).forEach(t => {
        transportChantierMap.set(t.id, t.chantier_id);
      });

      // Fetch chantiers
      const chantierIds = [...new Set(
        (transportRes.data || [])
          .map(t => t.chantier_id)
          .filter(Boolean) as string[]
      )];

      let chantierMap = new Map<string, { nom: string; code_chantier: string | null }>();
      if (chantierIds.length > 0) {
        const { data: chantiersData } = await supabase
          .from("chantiers")
          .select("id, nom, code_chantier")
          .in("id", chantierIds);
        (chantiersData || []).forEach(c => {
          chantierMap.set(c.id, { nom: c.nom, code_chantier: c.code_chantier });
        });
      }

      // Map utilisateurs
      const userMap = new Map<string, string>();
      const userRoleMap = new Map<string, string>();
      (utilisateursRes.data || []).forEach(u => {
        const fullName = `${u.nom?.toUpperCase() || ""} ${u.prenom || ""}`.trim();
        userMap.set(u.id, fullName);
        if (u.role) userRoleMap.set(fullName, u.role);
      });

      // Group by date + chantier + immatriculation to merge matin/soir into one row
      const grouped = new Map<string, TransportRow>();

      for (const jour of joursData) {
        const chantierId = transportChantierMap.get(jour.fiche_transport_id);
        const chantier = chantierId ? chantierMap.get(chantierId) : null;
        const key = `${jour.date}|${chantierId || ""}|${jour.immatriculation || ""}`;

        const existing = grouped.get(key);
        const matin = jour.conducteur_aller_id ? userMap.get(jour.conducteur_aller_id) || "—" : null;
        const soir = jour.conducteur_retour_id ? userMap.get(jour.conducteur_retour_id) || "—" : null;

        if (existing) {
          if (matin && !existing.conducteurMatin) existing.conducteurMatin = matin;
          if (soir && !existing.conducteurSoir) existing.conducteurSoir = soir;
        } else {
          grouped.set(key, {
            date: jour.date,
            chantierNom: chantier?.nom || "—",
            codeChantier: chantier?.code_chantier || null,
            immatriculation: jour.immatriculation || null,
            conducteurMatin: matin,
            conducteurSoir: soir,
          });
        }
      }

      const rows = [...grouped.values()];

      rows.sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.chantierNom.localeCompare(b.chantierNom);
      });

      return { rows, userRoleMap: Object.fromEntries(userRoleMap) };
    },
  });
};

const formatDate = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return `${days[date.getDay()]} ${format(date, "dd/MM/yyyy")}`;
  } catch {
    return dateStr;
  }
};

export const RHTransportTab = ({ filters }: RHTransportTabProps) => {
  const { data, isLoading } = useRHTransportData(filters.periode, filters.semaine);
  const rows = data?.rows || [];
  const roleMap = data?.userRoleMap || {};

  if (!filters.periode || filters.periode === "all") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Sélectionnez un mois</p>
        <p className="text-sm mt-2">Les données de transport s'afficheront pour le mois sélectionné</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Aucune donnée de transport</p>
        <p className="text-sm mt-2">Aucune fiche transport trouvée pour cette période</p>
      </div>
    );
  }

  // Compute driver summary: count each matin/soir appearance
  const driverCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.conducteurMatin && row.conducteurMatin !== "—") {
      driverCounts.set(row.conducteurMatin, (driverCounts.get(row.conducteurMatin) || 0) + 1);
    }
    if (row.conducteurSoir && row.conducteurSoir !== "—") {
      driverCounts.set(row.conducteurSoir, (driverCounts.get(row.conducteurSoir) || 0) + 1);
    }
  }
  const driverSummary = [...driverCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      {/* Driver summary */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Récapitulatif conducteurs — {driverSummary.length} conducteur{driverSummary.length > 1 ? "s" : ""}</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conducteur</TableHead>
                <TableHead className="text-right">Nb trajets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverSummary.map(([name, count]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {name}
                      {roleMap[name] && (
                        <RoleBadge role={roleMap[name] as any} size="sm" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Chantier</TableHead>
            <TableHead>Véhicule (immat)</TableHead>
            <TableHead>Conducteur matin</TableHead>
            <TableHead>Conducteur soir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.date}-${row.chantierNom}-${row.immatriculation}-${i}`}>
              <TableCell className="whitespace-nowrap font-medium">
                {formatDate(row.date)}
              </TableCell>
              <TableCell>
                {row.codeChantier ? (
                  <span>
                    <span className="font-medium">{row.codeChantier}</span>
                    <span className="text-muted-foreground ml-1">— {row.chantierNom}</span>
                  </span>
                ) : (
                  row.chantierNom
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {row.immatriculation || "—"}
              </TableCell>
              <TableCell>{row.conducteurMatin || "—"}</TableCell>
              <TableCell>{row.conducteurSoir || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="text-sm text-muted-foreground mt-4 px-2">
        {rows.length} ligne{rows.length > 1 ? "s" : ""} de transport
      </div>
      </div>
    </div>
  );
};
