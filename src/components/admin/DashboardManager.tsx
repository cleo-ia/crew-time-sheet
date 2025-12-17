import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Building2,
  FileText,
  Clock,
  AlertTriangle,
  Users,
  ChevronRight,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = {
  brouillon: "hsl(var(--muted-foreground))",
  valideChef: "hsl(45, 93%, 47%)",
  envoyeRH: "hsl(142, 76%, 36%)",
  cloture: "hsl(221, 83%, 53%)",
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      {trend && (
        <div className={`flex items-center text-xs mt-1 ${trend.positive ? "text-green-600" : "text-red-600"}`}>
          <TrendingUp className={`h-3 w-3 mr-1 ${!trend.positive && "rotate-180"}`} />
          {trend.value}% vs semaine précédente
        </div>
      )}
    </CardContent>
  </Card>
);

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

export const DashboardManager = () => {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>Impossible de charger les statistiques</AlertDescription></Alert>;
  if (!stats) return null;

  const pieData = [
    { name: "Brouillon", value: stats.fichesBrouillon, color: COLORS.brouillon },
    { name: "Validé chef", value: stats.fichesValideChef, color: COLORS.valideChef },
    { name: "Envoyé RH", value: stats.fichesEnvoyeRH, color: COLORS.envoyeRH },
    { name: "Clôturé", value: stats.fichesCloture, color: COLORS.cloture },
  ].filter(d => d.value > 0);

  const totalAlertes = stats.fichesEnRetard.length + stats.chantiersOrphelins.length + (stats.trajetsACompleter > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chantiers actifs"
          value={stats.chantiersActifs}
          icon={Building2}
          description={`${stats.chantiersInactifs} inactif${stats.chantiersInactifs > 1 ? "s" : ""}`}
        />
        <StatCard
          title="Fiches créées"
          value={stats.fichesBrouillon + stats.fichesValideChef + stats.fichesEnvoyeRH + stats.fichesCloture}
          icon={FileText}
          description="Total toutes périodes"
        />
        <StatCard
          title="En attente validation"
          value={stats.fichesValideChef}
          icon={Users}
          description="Fiches à valider par conducteurs"
        />
        <StatCard
          title="Heures saisies"
          value={`${Math.round(stats.heuresSaisiesSemaine)}h`}
          icon={Clock}
          description={`${Math.round(stats.heuresMoisEnCours)}h ce mois`}
        />
      </div>

      {/* Progression Transmission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progression des transmissions - {stats.semaineCourante}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Équipes ayant transmis</span>
              <span className="font-medium">
                {stats.progressionTransmission.transmis} / {stats.progressionTransmission.total}
              </span>
            </div>
            <Progress value={stats.progressionTransmission.pourcentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium text-foreground">{stats.progressionTransmission.pourcentage}%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts & Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} fiche${value > 1 ? "s" : ""}`, ""]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                Aucune fiche
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alertes & actions
              {totalAlertes > 0 && (
                <Badge variant="destructive" className="ml-2">{totalAlertes}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.fichesEnRetard.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20">
                <FileText className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {stats.fichesEnRetard.length} fiche{stats.fichesEnRetard.length > 1 ? "s" : ""} en retard
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Brouillons de semaines passées non transmis
                  </p>
                </div>
              </div>
            )}

            {stats.chantiersOrphelins.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20">
                <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {stats.chantiersOrphelins.length} chantier{stats.chantiersOrphelins.length > 1 ? "s" : ""} sans chef
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {stats.chantiersOrphelins.slice(0, 2).map(c => c.nom).join(", ")}
                    {stats.chantiersOrphelins.length > 2 && "..."}
                  </p>
                </div>
              </div>
            )}

            {stats.trajetsACompleter > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20">
                <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {stats.trajetsACompleter} trajet{stats.trajetsACompleter > 1 ? "s" : ""} à compléter
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Codes trajets en attente de saisie RH
                  </p>
                </div>
              </div>
            )}

            {totalAlertes === 0 && (
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                ✓ Aucune alerte
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conducteurs en attente */}
      {stats.conducteursEnAttente.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Fiches en attente de validation par conducteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.conducteursEnAttente.map((conducteur) => (
                <div
                  key={conducteur.conducteur_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {conducteur.conducteur_prenom} {conducteur.conducteur_nom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conducteur.semaines.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {conducteur.nb_fiches} fiche{conducteur.nb_fiches > 1 ? "s" : ""}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
