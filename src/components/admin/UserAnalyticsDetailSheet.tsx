import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserDetailAnalytics } from "@/hooks/useUserDetailAnalytics";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Clock, 
  Calendar, 
  FileText, 
  Activity, 
  Star,
  TrendingUp,
  User
} from "lucide-react";

interface UserAnalyticsDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    userId: string;
    userName: string;
    role: string | null;
  } | null;
  entrepriseId: string | null;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
};

const getRoleConfig = (role: string | null) => {
  switch (role) {
    case 'admin': 
      return { 
        bg: 'bg-red-100 dark:bg-red-900/30', 
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        gradient: 'from-red-500/10 to-transparent'
      };
    case 'rh': 
      return { 
        bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        gradient: 'from-emerald-500/10 to-transparent'
      };
    case 'conducteur': 
      return { 
        bg: 'bg-amber-100 dark:bg-amber-900/30', 
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        gradient: 'from-amber-500/10 to-transparent'
      };
    case 'chef': 
      return { 
        bg: 'bg-blue-100 dark:bg-blue-900/30', 
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500/10 to-transparent'
      };
    default: 
      return { 
        bg: 'bg-muted', 
        text: 'text-muted-foreground',
        border: 'border-border',
        gradient: 'from-muted/50 to-transparent'
      };
  }
};

const DeviceIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
};

const getDeviceLabel = (type: string | null) => {
  switch (type) {
    case 'mobile': return 'Mobile';
    case 'tablet': return 'Tablette';
    default: return 'Desktop';
  }
};

const getSessionDurationColor = (seconds: number | null) => {
  if (!seconds) return 'border-l-muted-foreground/30';
  if (seconds < 600) return 'border-l-emerald-500'; // < 10min = efficace
  if (seconds <= 1200) return 'border-l-amber-500'; // 10-20min = normal
  return 'border-l-red-400'; // > 20min = trop long
};

export const UserAnalyticsDetailSheet = ({
  open,
  onOpenChange,
  user,
  entrepriseId,
}: UserAnalyticsDetailSheetProps) => {
  const { sessions, activities, stats, isLoading } = useUserDetailAnalytics(
    user?.userId || null,
    entrepriseId
  );

  if (!user) return null;

  const roleConfig = getRoleConfig(user.role);
  const maxPageVisits = stats?.mostVisitedPages[0]?.count || 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full">
        {/* Header avec gradient */}
        <SheetHeader className={`bg-gradient-to-r ${roleConfig.gradient} px-6 pt-6 pb-5 border-b shrink-0`}>
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full ${roleConfig.bg} flex items-center justify-center ${roleConfig.text} font-bold text-xl shadow-sm`}>
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold">{user.userName}</SheetTitle>
              {user.role && (
                <Badge className={`mt-1.5 ${roleConfig.bg} ${roleConfig.text} border ${roleConfig.border} font-medium`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 py-6">
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Statistiques résumées */}
              {stats && (
                <div className="grid grid-cols-2 gap-3 py-5">
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats.totalSessions}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{formatDuration(stats.averageSessionDuration)}</p>
                          <p className="text-xs text-muted-foreground">Durée moy.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats.activeDays}</p>
                          <p className="text-xs text-muted-foreground">Jours actifs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats.totalPagesVisited}</p>
                          <p className="text-xs text-muted-foreground">Pages visitées</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Pages favorites avec barres de progression */}
              {stats && stats.mostVisitedPages.length > 0 && (
                <Card className="border-0 shadow-md mb-5 bg-card/80 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Star className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">Pages favorites</span>
                    </div>
                    <div className="space-y-3">
                      {stats.mostVisitedPages.slice(0, 5).map(({ page, count }, index) => (
                        <div key={page} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                            index === 1 ? 'bg-slate-300/50 text-slate-600 dark:text-slate-400' :
                            index === 2 ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{page}</span>
                              <span className="text-xs text-muted-foreground ml-2">{count}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary/60 rounded-full transition-all duration-300"
                                style={{ width: `${(count / maxPageVisits) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs redesignés */}
              <Tabs defaultValue="sessions" className="flex-1 flex flex-col min-h-0">
                {/* Légende des couleurs de session */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Légende durée de session</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">&lt; 10 min (efficace)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs text-muted-foreground">10-20 min (normale)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="text-xs text-muted-foreground">&gt; 20 min (longue)</span>
                    </div>
                  </div>
                </div>
                <TabsList className="w-full bg-muted/50 p-1 rounded-xl shrink-0">
                  <TabsTrigger 
                    value="sessions" 
                    className="flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <Clock className="h-4 w-4" />
                    Sessions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity" 
                    className="flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Activité
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sessions" className="mt-4 flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                  <ScrollArea className="flex-1 min-h-0 h-0 pr-4">
                    {sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-muted mb-3">
                          <Activity className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">Aucune session enregistrée</p>
                        <p className="text-xs text-muted-foreground mt-1">Les sessions apparaîtront ici</p>
                      </div>
                    ) : (
                      <div className="relative pl-4">
                        {/* Ligne de timeline */}
                        <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-border" />
                        
                        <div className="space-y-3">
                          {sessions.map((session, index) => (
                            <div key={session.id} className="relative">
                              {/* Point de timeline */}
                              <div className={`absolute left-[-10px] top-4 w-3 h-3 rounded-full border-2 border-background ${
                                session.is_active ? 'bg-emerald-500' : 'bg-primary'
                              } z-10`} />
                              
                              <Card className={`ml-3 border-0 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 ${getSessionDurationColor(session.duration_seconds)}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-semibold text-sm">
                                        <span className="capitalize">
                                          {format(new Date(session.started_at), "EEEE", { locale: fr })}
                                        </span>
                                        {" "}
                                        <span className="text-muted-foreground font-normal">
                                          {format(new Date(session.started_at), "d MMMM yyyy", { locale: fr })}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(session.started_at), "HH:mm")}
                                        {session.ended_at && (
                                          <> → {format(new Date(session.ended_at), "HH:mm")}</>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs gap-1 px-2">
                                        <DeviceIcon type={session.device_type} />
                                        {getDeviceLabel(session.device_type)}
                                      </Badge>
                                      {session.is_active && (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                                          Actif
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dashed">
                                    {session.duration_seconds && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatDuration(session.duration_seconds)}</span>
                                      </div>
                                    )}
                                    {session.pages_visited && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <FileText className="h-3 w-3" />
                                        <span>{session.pages_visited} pages</span>
                                      </div>
                                    )}
                                    {session.browser && (
                                      <div className="text-xs text-muted-foreground ml-auto">
                                        {session.browser}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="activity" className="mt-4 flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                  <ScrollArea className="flex-1 min-h-0 h-0 pr-4">
                    {activities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-muted mb-3">
                          <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">Aucune activité enregistrée</p>
                        <p className="text-xs text-muted-foreground mt-1">L'activité apparaîtra ici</p>
                      </div>
                    ) : (
                      <div className="relative pl-4">
                        {/* Ligne de timeline */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                        
                        <div className="space-y-1">
                          {activities.map((activity) => {
                            const isPageView = activity.event_type === 'page_view';
                            return (
                              <div
                                key={activity.id}
                                className="relative flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                              >
                                {/* Point coloré */}
                                <div className={`absolute left-[-10px] w-2.5 h-2.5 rounded-full ${
                                  isPageView 
                                    ? 'bg-blue-500' 
                                    : 'bg-amber-500'
                                }`} />
                                
                                <div className="flex-1 min-w-0 ml-2">
                                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                    {activity.page_name || activity.page_path || activity.event_type}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(activity.created_at), "d MMM HH:mm", { locale: fr })}
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs shrink-0 ${
                                    isPageView 
                                      ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' 
                                      : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                  }`}
                                >
                                  {isPageView ? 'page' : activity.event_type}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
