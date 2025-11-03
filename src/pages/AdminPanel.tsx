import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Briefcase, UserCog, HardHat, UserCheck, Truck, Users, Bell, User } from "lucide-react";
import { AppNav } from "@/components/navigation/AppNav";
import { ChantiersManager } from "@/components/admin/ChantiersManager";
import { ConducteursManager } from "@/components/admin/ConducteursManager";
import { ChefsManager } from "@/components/admin/ChefsManager";
import { MaconsManager } from "@/components/admin/MaconsManager";
import { InterimairesManager } from "@/components/admin/InterimairesManager";
import { FinisseursManager } from "@/components/admin/FinisseursManager";
import { VehiculesFinisseursManager } from "@/components/admin/VehiculesFinisseursManager";
import { VehiculesChefsMaconsManager } from "@/components/admin/VehiculesChefsMaconsManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { UsersManager } from "@/components/admin/UsersManager";
import { RappelsManager } from "@/components/admin/RappelsManager";
import { TransportDebugManager } from "@/components/admin/TransportDebugManager";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("utilisateurs");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <AppNav />
      
      <PageHeader
        title="Administration"
        subtitle="Gestion des chantiers, conducteurs, chefs, maçons et intérimaires"
        icon={Settings}
        theme="admin"
        actions={
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Inviter un utilisateur
          </Button>
        }
      />

      <InviteUserDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen} 
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Card className="shadow-md border-border/50 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-10 rounded-none border-b">
              <TabsTrigger value="utilisateurs" className="rounded-none gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="chantiers" className="rounded-none gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Chantiers</span>
              </TabsTrigger>
              <TabsTrigger value="conducteurs" className="rounded-none gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Conducteurs</span>
              </TabsTrigger>
              <TabsTrigger value="chefs" className="rounded-none gap-2">
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline">Chefs</span>
              </TabsTrigger>
              <TabsTrigger value="macons" className="rounded-none gap-2">
                <HardHat className="h-4 w-4" />
                <span className="hidden sm:inline">Maçons</span>
              </TabsTrigger>
              <TabsTrigger value="interimaires" className="rounded-none gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Intérimaires</span>
              </TabsTrigger>
              <TabsTrigger value="finisseurs" className="rounded-none gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Finisseurs</span>
              </TabsTrigger>
              <TabsTrigger value="vehicules" className="rounded-none gap-2">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Véhicules</span>
              </TabsTrigger>
              <TabsTrigger value="rappels" className="rounded-none gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Rappels</span>
              </TabsTrigger>
              <TabsTrigger value="debug" className="rounded-none gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Debug</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="utilisateurs" className="p-6">
              <UsersManager />
            </TabsContent>

            <TabsContent value="chantiers" className="p-6">
              <ChantiersManager />
            </TabsContent>

            <TabsContent value="conducteurs" className="p-6">
              <ConducteursManager />
            </TabsContent>

            <TabsContent value="chefs" className="p-6">
              <ChefsManager />
            </TabsContent>

            <TabsContent value="macons" className="p-6">
              <MaconsManager />
            </TabsContent>

            <TabsContent value="interimaires" className="p-6">
              <InterimairesManager />
            </TabsContent>

            <TabsContent value="finisseurs" className="p-6">
              <FinisseursManager />
            </TabsContent>

            <TabsContent value="vehicules" className="p-6">
              <Tabs defaultValue="chefs-macons" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chefs-macons">Véhicules Chefs/Maçons</TabsTrigger>
                  <TabsTrigger value="finisseurs">Véhicules Finisseurs</TabsTrigger>
                </TabsList>
                <TabsContent value="chefs-macons" className="mt-4">
                  <VehiculesChefsMaconsManager />
                </TabsContent>
                <TabsContent value="finisseurs" className="mt-4">
                  <VehiculesFinisseursManager />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="rappels" className="p-6">
              <RappelsManager />
            </TabsContent>

          <TabsContent value="debug" className="p-6">
            <TransportDebugManager />
          </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
};

export default AdminPanel;
