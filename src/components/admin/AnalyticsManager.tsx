import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserAnalytics, PeriodFilter } from '@/hooks/useUserAnalytics';
import { 
  Users, 
  Clock, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Activity,
  TrendingUp,
  FileText,
  CircleHelp
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

const getRoleBadgeVariant = (role: string | null) => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'rh': return 'default';
    case 'conducteur': return 'secondary';
    case 'chef': return 'outline';
    default: return 'outline';
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
  const { globalStats, userStats, dailyStats, isLoading } = useUserAnalytics(period);

  return (
    <div className="space-y-6">
      {/* Header avec filtre */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analyse d'activité</h2>
          <p className="text-muted-foreground text-sm">
            Suivi des connexions et de l'utilisation de l'application
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-[180px]">
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

      {/* Cards statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Utilisateurs actifs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{globalStats?.activeUsersToday || 0}</div>
                <p className="text-xs text-muted-foreground">
                  aujourd'hui · {globalStats?.activeUsers7Days || 0} sur 7j
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{globalStats?.totalSessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  sur la période sélectionnée
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Durée moyenne */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durée moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatDuration(globalStats?.avgSessionDuration || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  par session
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Répartition appareils */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appareils</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  <span>{globalStats?.deviceDistribution.desktop || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tablet className="h-3 w-3" />
                  <span>{globalStats?.deviceDistribution.tablet || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  <span>{globalStats?.deviceDistribution.mobile || 0}</span>
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Évolution des connexions
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--muted-foreground))' }}
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
        <Card className={period === 'all' ? 'lg:col-span-3' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pages les plus visitées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : globalStats?.topPages && globalStats.topPages.length > 0 ? (
              <div className="space-y-2">
                {globalStats.topPages.map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4">{index + 1}.</span>
                      {page.page}
                    </span>
                    <Badge variant="secondary">{page.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Utilisateurs AVEC données d'activité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-green-600" />
            Utilisateurs avec données d'activité
            {userStats && (
              <Badge variant="secondary" className="ml-2">
                {userStats.filter(u => u.sessionsCount > 0).length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead className="text-center">Durée moy.</TableHead>
                    <TableHead className="text-center">Pages</TableHead>
                    <TableHead className="text-center">Appareil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats && userStats.filter(u => u.sessionsCount > 0).length > 0 ? (
                    sortByRole(userStats.filter(u => u.sessionsCount > 0)).map(user => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : 'Sans nom'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role && (
                            <Badge variant={getRoleBadgeVariant(user.role)}>
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
                          {user.sessionsCount}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatDuration(user.avgDurationSeconds)}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.totalPagesVisited}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <DeviceIcon type={user.deviceType} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
      {userStats && userStats.filter(u => u.sessionsCount === 0).length > 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Utilisateurs sans données d'activité
              <Badge variant="outline" className="ml-2">
                {userStats.filter(u => u.sessionsCount === 0).length}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Ces utilisateurs n'ont pas de données traçables historiques. Leurs activités seront enregistrées à partir de leur prochaine connexion.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortByRole(userStats.filter(u => u.sessionsCount === 0)).map(user => (
                    <TableRow key={user.userId} className="opacity-60">
                      <TableCell>
                        <div className="font-medium">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'Sans nom'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role && (
                          <Badge variant={getRoleBadgeVariant(user.role)}>
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
    </div>
  );
};
