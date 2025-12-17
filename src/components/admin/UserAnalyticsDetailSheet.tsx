import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserDetailAnalytics } from "@/hooks/useUserDetailAnalytics";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Monitor, Smartphone, Tablet, Clock, Calendar, FileText, Activity } from "lucide-react";

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

const getRoleBadgeVariant = (role: string | null) => {
  switch (role) {
    case 'admin': return 'default';
    case 'rh': return 'secondary';
    case 'conducteur': return 'default';
    case 'chef': return 'outline';
    default: return 'outline';
  }
};

const DeviceIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">{user.userName}</SheetTitle>
            {user.role && (
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        ) : (
          <>
            {/* Statistiques résumées */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 py-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Activity className="h-3 w-3" />
                      Sessions
                    </div>
                    <div className="text-lg font-semibold">{stats.totalSessions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Durée moyenne
                    </div>
                    <div className="text-lg font-semibold">
                      {formatDuration(stats.averageSessionDuration)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Jours actifs
                    </div>
                    <div className="text-lg font-semibold">{stats.activeDays}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <FileText className="h-3 w-3" />
                      Pages visitées
                    </div>
                    <div className="text-lg font-semibold">{stats.totalPagesVisited}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pages favorites */}
            {stats && stats.mostVisitedPages.length > 0 && (
              <div className="pb-4">
                <div className="text-sm font-medium mb-2">Pages favorites</div>
                <div className="flex flex-wrap gap-2">
                  {stats.mostVisitedPages.map(({ page, count }) => (
                    <Badge key={page} variant="secondary" className="text-xs">
                      {page} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="sessions" className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="sessions" className="flex-1">Sessions</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">Activité</TabsTrigger>
              </TabsList>

              <TabsContent value="sessions" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {sessions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Aucune session enregistrée
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  {format(new Date(session.started_at), "EEEE d MMMM yyyy", { locale: fr })}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(session.started_at), "HH:mm")}
                                  {session.ended_at && (
                                    <> → {format(new Date(session.ended_at), "HH:mm")}</>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <DeviceIcon type={session.device_type} />
                                {session.browser && (
                                  <span className="text-xs">{session.browser}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {session.duration_seconds && (
                                <span>Durée: {formatDuration(session.duration_seconds)}</span>
                              )}
                              {session.pages_visited && (
                                <span>{session.pages_visited} pages</span>
                              )}
                              {session.is_active && (
                                <Badge variant="default" className="text-xs">Actif</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {activities.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Aucune activité enregistrée
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {activity.page_name || activity.page_path || activity.event_type}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), "d MMM HH:mm", { locale: fr })}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {activity.event_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
