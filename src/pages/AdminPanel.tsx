import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Briefcase, UserCog, HardHat, UserCheck, Truck, Users, Bell, User, FileUser, BarChart3, LayoutDashboard, History, RefreshCw } from "lucide-react";
import { clearCacheAndReload } from "@/hooks/useClearCache";
import { AppNav } from "@/components/navigation/AppNav";
import { ChantiersManager } from "@/components/admin/ChantiersManager";
import { ConducteursManager } from "@/components/admin/ConducteursManager";
import { ChefsManager } from "@/components/admin/ChefsManager";
import { MaconsManager } from "@/components/admin/MaconsManager";
import { GrutiersManager } from "@/components/admin/GrutiersManager";
import { InterimairesManager } from "@/components/admin/InterimairesManager";
import { FinisseursManager } from "@/components/admin/FinisseursManager";
import { VehiculesManager } from "@/components/admin/VehiculesManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { UsersManager } from "@/components/admin/UsersManager";
import { RappelsManager } from "@/components/admin/RappelsManager";
import { TransportDebugManager } from "@/components/admin/TransportDebugManager";
import { RHAdminManager } from "@/components/admin/RHAdminManager";
import { AnalyticsManager } from "@/components/admin/AnalyticsManager";
import { DashboardManager } from "@/components/admin/DashboardManager";
import { HistoriqueManager } from "@/components/admin/HistoriqueManager";
import { ConversationButton } from "@/components/chat/ConversationButton";
import { ConversationListSheet } from "@/components/chat/ConversationListSheet";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/contexts/AuthProvider";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

// Onglets autorisés pour le rôle gestionnaire
const GESTIONNAIRE_TABS = ['dashboard', 'utilisateurs', 'chantiers', 'interimaires', 'vehicules'];

const AdminPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "dashboard");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  const { user } = useAuth();
  const currentUserId = user?.id || "";
  const { data: unreadData } = useUnreadMessages(currentUserId);
  const { data: userRole } = useCurrentUserRole();

  const isGestionnaire = userRole === "gestionnaire";

  // Sync tab with URL parameter
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      // Pour gestionnaire, vérifier que l'onglet est autorisé
      if (isGestionnaire && !GESTIONNAIRE_TABS.includes(tabFromUrl)) {
        setActiveTab("dashboard");
        setSearchParams({ tab: "dashboard" });
      } else {
        setActiveTab(tabFromUrl);
      }
    }
  }, [tabFromUrl, isGestionnaire]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <AppNav />
      
      <PageHeader
        title="Administration"
        subtitle="Gestion des chantiers, conducteurs, chefs, maçons et intérimaires"
        icon={Settings}
        theme="admin"
        actions={
          <div className="flex gap-2">
            <ConversationButton
              onClick={() => setShowConversation(true)}
              unreadCount={unreadData?.total || 0}
            />
            {!isGestionnaire && (
              <Button 
                variant="outline"
                onClick={() => handleTabChange("analyse")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyse
              </Button>
            )}
            {!isGestionnaire && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Inviter un utilisateur
              </Button>
            )}
          </div>
        }
      />

      <InviteUserDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen} 
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Card className="shadow-md border-border/50 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full flex flex-wrap justify-start gap-1 rounded-none border-b bg-transparent h-auto p-2">
              <TabsTrigger value="dashboard" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="utilisateurs" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="chantiers" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Chantiers</span>
              </TabsTrigger>
              {!isGestionnaire && (
                <TabsTrigger value="conducteurs" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Conducteurs</span>
                </TabsTrigger>
              )}
              {!isGestionnaire && (
                <TabsTrigger value="chefs" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UserCog className="h-4 w-4" />
                  <span className="hidden sm:inline">Chefs</span>
                </TabsTrigger>
              )}
              {!isGestionnaire && (
                <TabsTrigger value="macons" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <HardHat className="h-4 w-4" />
                  <span className="hidden sm:inline">Maçons</span>
                </TabsTrigger>
              )}
              {!isGestionnaire && (
                <TabsTrigger value="grutiers" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <HardHat className="h-4 w-4" />
                  <span className="hidden sm:inline">Grutiers</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="interimaires" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Intérimaires</span>
              </TabsTrigger>
              {!isGestionnaire && (
                <TabsTrigger value="finisseurs" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Finisseurs</span>
                </TabsTrigger>
              )}
              {!isGestionnaire && (
                <TabsTrigger value="rh" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileUser className="h-4 w-4" />
                  <span className="hidden sm:inline">RH</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="vehicules" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Véhicules</span>
              </TabsTrigger>
              {!isGestionnaire && (
                <TabsTrigger value="rappels" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Rappels</span>
                </TabsTrigger>
              )}
              {!isGestionnaire && (
                <TabsTrigger value="historique" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Historique</span>
                </TabsTrigger>
              )}
              {!isGestionnaire && (
                <TabsTrigger value="debug" className="rounded-md gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Debug</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard" className="p-6">
              <DashboardManager />
            </TabsContent>

            <TabsContent value="utilisateurs" className="p-6">
              <UsersManager />
            </TabsContent>

            <TabsContent value="chantiers" className="p-6">
              <ChantiersManager />
            </TabsContent>

            {!isGestionnaire && (
              <TabsContent value="conducteurs" className="p-6">
                <ConducteursManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="chefs" className="p-6">
                <ChefsManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="macons" className="p-6">
                <MaconsManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="grutiers" className="p-6">
                <GrutiersManager />
              </TabsContent>
            )}

            <TabsContent value="interimaires" className="p-6">
              <InterimairesManager />
            </TabsContent>

            {!isGestionnaire && (
              <TabsContent value="finisseurs" className="p-6">
                <FinisseursManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="rh" className="p-6">
                <RHAdminManager />
              </TabsContent>
            )}

            <TabsContent value="vehicules" className="p-6">
              <VehiculesManager />
            </TabsContent>

            {!isGestionnaire && (
              <TabsContent value="rappels" className="p-6">
                <RappelsManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="analyse" className="p-6">
                <AnalyticsManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="historique" className="p-6">
                <HistoriqueManager />
              </TabsContent>
            )}

            {!isGestionnaire && (
              <TabsContent value="debug" className="p-6">
                <TransportDebugManager />
              </TabsContent>
            )}
          </Tabs>
        </Card>

        {/* Bouton vider le cache */}
        <div className="flex justify-center mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Vider le cache peut résoudre les problèmes d'affichage. Voulez-vous continuer ?")) {
                clearCacheAndReload();
              }
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Problème d'affichage ? Vider le cache
          </Button>
        </div>
      </main>

      <ConversationListSheet
        open={showConversation}
        onOpenChange={setShowConversation}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default AdminPanel;
