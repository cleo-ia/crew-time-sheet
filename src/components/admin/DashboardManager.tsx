import { useState, useEffect } from "react";
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
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  brouillon: "hsl(220, 14%, 70%)",
  valideChef: "hsl(45, 93%, 47%)",
  envoyeRH: "hsl(142, 76%, 36%)",
  cloture: "hsl(221, 83%, 53%)",
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  accentColor,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  accentColor: string;
  iconBg: string;
}) => (
  <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
    <div className={`absolute inset-0 opacity-[0.03] ${accentColor}`} />
    <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`} />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`p-2.5 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </CardHeader>
    <CardContent className="pb-4">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {description}
        </p>
      )}
    </CardContent>
  </Card>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Skeleton className="h-32 rounded-xl" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-3 py-2">
        <p className="text-sm font-medium">{payload[0].name}</p>
        <p className="text-lg font-bold">{payload[0].value} fiche{payload[0].value > 1 ? "s" : ""}</p>
      </div>
    );
  }
  return null;
};

export const DashboardManager = () => {
  const { data: stats, isLoading, error, dataUpdatedAt, isFetching } = useDashboardStats();
  const [, setTick] = useState(0);

  // Force re-render every 10 seconds to update the "time since update" badge
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const getTimeSinceUpdate = () => {
    if (!dataUpdatedAt) return "...";
    const seconds = Math.floor((Date.now() - dataUpdatedAt) / 1000);
    if (seconds < 10) return "À l'instant";
    if (seconds < 60) return `Il y a ${seconds}s`;
    return `Il y a ${Math.floor(seconds / 60)}min`;
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return (
    <Alert variant="destructive" className="animate-fade-in">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>Impossible de charger les statistiques du tableau de bord</AlertDescription>
    </Alert>
  );
  if (!stats) return null;

  const pieData = [
    { name: "Brouillon", value: stats.fichesBrouillon, color: COLORS.brouillon },
    { name: "Validé chef", value: stats.fichesValideChef, color: COLORS.valideChef },
    { name: "Envoyé RH", value: stats.fichesEnvoyeRH, color: COLORS.envoyeRH },
    { name: "Clôturé", value: stats.fichesCloture, color: COLORS.cloture },
  ];
  
  const pieDataForChart = pieData.filter(d => d.value > 0);

  const totalAlertes = stats.fichesEnRetard.length + stats.chantiersOrphelins.length + (stats.trajetsACompleter > 0 ? 1 : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec titre */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h2>
          <p className="text-muted-foreground text-sm">Activité et progression de l'entreprise</p>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1">
          <RefreshCw className={`h-3 w-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          {getTimeSinceUpdate()}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chantiers actifs"
          value={stats.chantiersActifs}
          icon={Building2}
          description={`${stats.chantiersInactifs} inactif${stats.chantiersInactifs > 1 ? "s" : ""}`}
          accentColor="bg-blue-500"
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Fiches créées"
          value={stats.fichesBrouillon + stats.fichesValideChef + stats.fichesEnvoyeRH + stats.fichesCloture}
          icon={FileText}
          description="Total toutes périodes"
          accentColor="bg-emerald-500"
          iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="En attente validation"
          value={stats.fichesValideChef}
          icon={Users}
          description="Fiches à valider par conducteurs"
          accentColor="bg-amber-500"
          iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          title="Heures saisies"
          value={`${Math.round(stats.heuresSaisiesSemaine)}h`}
          icon={Clock}
          description={`${Math.round(stats.heuresMoisEnCours)}h ce mois`}
          accentColor="bg-violet-500"
          iconBg="bg-gradient-to-br from-violet-500 to-violet-600"
        />
      </div>

      {/* Progression Transmission */}
      <Card className="border-0 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-semibold">Progression des transmissions</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.semaineCourante}
                </Badge>
              </div>
            </CardTitle>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{stats.progressionTransmission.transmis}</span>
              <span className="text-muted-foreground text-lg"> / {stats.progressionTransmission.total}</span>
              <p className="text-xs text-muted-foreground">chantiers</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="space-y-3">
            <div className="relative">
              <Progress 
                value={stats.progressionTransmission.pourcentage} 
                className="h-4 bg-muted/50"
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-white transition-all duration-500"
                style={{ 
                  left: `${Math.max(stats.progressionTransmission.pourcentage - 3, 2)}%`,
                  opacity: stats.progressionTransmission.pourcentage > 10 ? 1 : 0
                }}
              >
                {stats.progressionTransmission.pourcentage}%
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className={`font-medium ${stats.progressionTransmission.pourcentage >= 75 ? "text-emerald-600" : stats.progressionTransmission.pourcentage >= 50 ? "text-amber-600" : "text-muted-foreground"}`}>
                {stats.progressionTransmission.pourcentage >= 75 ? "🎯 Excellent !" : stats.progressionTransmission.pourcentage >= 50 ? "👍 En bonne voie" : "En cours..."}
              </span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts & Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
                <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              Répartition par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {pieDataForChart.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieDataForChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieDataForChart.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Légende personnalisée avec tous les statuts */}
                <div className="grid grid-cols-2 gap-2 px-2">
                  {pieData.map((item) => (
                    <div 
                      key={item.name}
                      className={`flex items-center gap-2 text-xs ${item.value === 0 ? "opacity-40" : ""}`}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
                <span className="text-sm">Aucune fiche enregistrée</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={`p-2 rounded-lg ${totalAlertes > 0 ? "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-900/20" : "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/20"}`}>
                {totalAlertes > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              Alertes & actions
              {totalAlertes > 0 && (
                <Badge className="ml-auto bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                  {totalAlertes}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.fichesEnRetard.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/10 border border-red-100 dark:border-red-900/30 hover:shadow-sm transition-shadow">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                  <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {stats.fichesEnRetard.length} fiche{stats.fichesEnRetard.length > 1 ? "s" : ""} en retard
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                    Brouillons de semaines passées non transmis
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-400 flex-shrink-0 mt-1" />
              </div>
            )}

            {stats.chantiersOrphelins.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-orange-50/50 dark:from-orange-950/30 dark:to-orange-950/10 border border-orange-100 dark:border-orange-900/30 hover:shadow-sm transition-shadow">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                    {stats.chantiersOrphelins.length} chantier{stats.chantiersOrphelins.length > 1 ? "s" : ""} sans chef
                  </p>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-0.5 truncate">
                    {stats.chantiersOrphelins.slice(0, 2).map(c => c.nom).join(", ")}
                    {stats.chantiersOrphelins.length > 2 && "..."}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-orange-400 flex-shrink-0 mt-1" />
              </div>
            )}

            {stats.trajetsACompleter > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/10 border border-amber-100 dark:border-amber-900/30 hover:shadow-sm transition-shadow">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {stats.trajetsACompleter} trajet{stats.trajetsACompleter > 1 ? "s" : ""} à compléter
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Codes trajets en attente de saisie RH
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0 mt-1" />
              </div>
            )}

            {totalAlertes === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/20 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-medium text-emerald-700 dark:text-emerald-300">Tout est en ordre !</p>
                <p className="text-xs text-muted-foreground mt-1">Aucune action requise</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conducteurs en attente */}
      {stats.conducteursEnAttente.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-900/20">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Fiches en attente de validation
              <Badge variant="secondary" className="ml-auto">
                {stats.conducteursEnAttente.reduce((sum, c) => sum + c.nb_fiches, 0)} fiches
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.conducteursEnAttente.map((conducteur, index) => (
                <div
                  key={conducteur.conducteur_id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-gradient-to-r from-muted/30 to-transparent hover:from-muted/50 hover:border-border transition-all duration-200 cursor-pointer group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {conducteur.conducteur_prenom?.[0]}{conducteur.conducteur_nom?.[0]}
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
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary" 
                      className={`${conducteur.nb_fiches >= 5 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : conducteur.nb_fiches >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : ""}`}
                    >
                      {conducteur.nb_fiches} fiche{conducteur.nb_fiches > 1 ? "s" : ""}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
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
