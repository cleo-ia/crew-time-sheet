import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserAnalytics, PeriodFilter } from '@/hooks/useUserAnalytics';
import { useCurrentEntrepriseId } from '@/hooks/useCurrentEntrepriseId';
import { UserAnalyticsDetailSheet } from './UserAnalyticsDetailSheet';
import { 
  Users, 
  Clock, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Activity,
  TrendingUp,
  FileText,
  CircleHelp,
  ChevronRight,
  UserX,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
};

const getRoleBadgeClasses = (role: string | null) => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-700 border-red-200';
    case 'rh': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'conducteur': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'chef': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-muted text-muted-foreground';
  }
};

// Tri par rôle: admin > rh > conducteur > chef
const ROLE_ORDER: Record<string, number> = {
  'admin': 0,
  'rh': 1,
  'conducteur': 2,
  'chef': 3,
};

const sortByRole = <T extends { role: string | null }>(users: T[]): T[] => {
  return [...users].sort((a, b) => {
    const orderA = a.role ? (ROLE_ORDER[a.role] ?? 99) : 99;
    const orderB = b.role ? (ROLE_ORDER[b.role] ?? 99) : 99;
    return orderA - orderB;
  });
};

const DeviceIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case 'desktop': return <Monitor className="h-4 w-4" />;
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <CircleHelp className="h-4 w-4" />;
  }
};

export const AnalyticsManager = () => {
  const [period, setPeriod] = useState<PeriodFilter>('7days');
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    userName: string;
    role: string | null;
  } | null>(null);
  const { globalStats, userStats, dailyStats, isLoading } = useUserAnalytics(period);
  const { data: entrepriseId } = useCurrentEntrepriseId();

  const activeUsersCount = userStats?.filter(u => u.sessionsCount > 0).length || 0;
  const inactiveUsersCount = userStats?.filter(u => u.sessionsCount === 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Analyse d'activité</h2>
              <p className="text-muted-foreground text-sm">
                {activeUsersCount} utilisateur{activeUsersCount > 1 ? 's' : ''} actif{activeUsersCount > 1 ? 's' : ''} sur la période
              </p>
            </div>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
              <SelectItem value="all">Tout l'historique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards statistiques redesignées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Utilisateurs actifs */}
        <Card className="shadow-md border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {globalStats?.activeUsersToday || 0}
                  </p>
                  <p className="text-sm font-medium text-foreground">Utilisateurs actifs</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {globalStats?.activeUsers7Days || 0} sur 7 jours
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="shadow-md border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-600">
                    {globalStats?.totalSessions || 0}
                  </p>
                  <p className="text-sm font-medium text-foreground">Sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    sur la période
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Durée moyenne */}
        <Card className="shadow-md border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-600">
                    {formatDuration(globalStats?.avgSessionDuration || 0)}
                  </p>
                  <p className="text-sm font-medium text-foreground">Durée moyenne</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    par session
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Répartition appareils */}
        <Card className="shadow-md border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-violet-100 text-violet-600">
                  <Monitor className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-2">Appareils</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Monitor className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium">{globalStats?.deviceDistribution.desktop || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Tablet className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium">{globalStats?.deviceDistribution.tablet || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Smartphone className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium">{globalStats?.deviceDistribution.mobile || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphique + Top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Graphique des connexions */}
        {period !== 'all' && (
          <Card className="lg:col-span-2 shadow-md border-l-4 border-l-primary overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Évolution des connexions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : dailyStats && dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      name="Utilisateurs"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      name="Sessions"
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top pages */}
        <Card className={`shadow-md ${period === 'all' ? 'lg:col-span-3' : ''}`}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Pages les plus visitées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : globalStats?.topPages && globalStats.topPages.length > 0 ? (
              <div className="space-y-3">
                {globalStats.topPages.map((page, index) => {
                  const maxCount = globalStats.topPages[0]?.count || 1;
                  const percentage = (page.count / maxCount) * 100;
                  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-violet-500', 'bg-slate-500'];
                  
                  return (
                    <div key={page.page} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full ${colors[index] || 'bg-slate-500'} text-white text-xs flex items-center justify-center font-medium`}>
                            {index + 1}
                          </span>
                          <span className="font-medium">{page.page}</span>
                        </span>
                        <span className="text-muted-foreground font-medium">{page.count} visites</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[index] || 'bg-slate-500'} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Utilisateurs AVEC données d'activité */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            Utilisateurs avec données d'activité
            {userStats && (
              <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                {activeUsersCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Utilisateur</TableHead>
                    <TableHead className="font-semibold">Rôle</TableHead>
                    <TableHead className="font-semibold">Dernière connexion</TableHead>
                    <TableHead className="text-center font-semibold">Sessions</TableHead>
                    <TableHead className="text-center font-semibold">Durée moy.</TableHead>
                    <TableHead className="text-center font-semibold">Pages</TableHead>
                    <TableHead className="text-center font-semibold">Appareil</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats && activeUsersCount > 0 ? (
                    sortByRole(userStats.filter(u => u.sessionsCount > 0)).map((user, index) => {
                      const userName = user.firstName || user.lastName 
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : 'Sans nom';
                      return (
                        <TableRow 
                          key={user.userId}
                          className={`cursor-pointer group transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-primary/5`}
                          onClick={() => setSelectedUser({
                            userId: user.userId,
                            userName,
                            role: user.role,
                          })}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{userName}</div>
                              <div className="text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.role && (
                              <Badge className={`${getRoleBadgeClasses(user.role)} border`}>
                                {user.role}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.lastConnection ? (
                              <div>
                                <div className="text-sm">
                                  {formatDistanceToNow(new Date(user.lastConnection), { 
                                    addSuffix: true,
                                    locale: fr 
                                  })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(user.lastConnection), 'dd/MM/yyyy HH:mm')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Jamais</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-muted text-sm font-medium">
                              {user.sessionsCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatDuration(user.avgDurationSeconds)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-muted text-sm font-medium">
                              {user.totalPagesVisited}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center text-muted-foreground">
                              <DeviceIcon type={user.deviceType} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucune donnée d'activité disponible pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utilisateurs SANS données d'activité */}
      {userStats && inactiveUsersCount > 0 && (
        <Card className="shadow-sm border-muted bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 rounded-lg bg-muted">
                <UserX className="h-4 w-4" />
              </div>
              Utilisateurs sans données d'activité
              <Badge variant="outline" className="ml-2">
                {inactiveUsersCount}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Ces utilisateurs n'ont pas de données traçables. Leurs activités seront enregistrées à partir de leur prochaine connexion.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Utilisateur</TableHead>
                    <TableHead className="text-muted-foreground">Rôle</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortByRole(userStats.filter(u => u.sessionsCount === 0)).map(user => (
                    <TableRow key={user.userId} className="opacity-60 hover:opacity-80">
                      <TableCell>
                        <div className="font-medium">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'Sans nom'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role && (
                          <Badge variant="outline" className="opacity-70">
                            {user.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sheet détail utilisateur */}
      <UserAnalyticsDetailSheet
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        user={selectedUser}
        entrepriseId={entrepriseId}
      />
    </div>
  );
};
