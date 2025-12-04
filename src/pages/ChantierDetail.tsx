import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useChantierDetail } from "@/hooks/useChantierDetail";
import { ChantierDetailHeader } from "@/components/chantier/ChantierDetailHeader";
import { ChantierEditDialog } from "@/components/chantier/ChantierEditDialog";
import { ChantierPlanningTab } from "@/components/chantier/tabs/ChantierPlanningTab";
import { ChantierKanbanTab } from "@/components/chantier/tabs/ChantierKanbanTab";
import { ChantierFichiersTab } from "@/components/chantier/tabs/ChantierFichiersTab";
import { ChantierTodoTab } from "@/components/chantier/tabs/ChantierTodoTab";
import { ChantierRentabiliteTab } from "@/components/chantier/tabs/ChantierRentabiliteTab";
import { ChantierInfosTab } from "@/components/chantier/tabs/ChantierInfosTab";
import { CalendarDays, FileText, Info, LayoutList, ListTodo, TrendingUp } from "lucide-react";

const ChantierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: chantier, isLoading, error } = useChantierDetail(id);
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-6">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !chantier) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Chantier introuvable</h2>
          <p className="text-muted-foreground">
            Le chantier demandé n'existe pas ou a été supprimé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <ChantierDetailHeader 
          chantier={chantier} 
          onImageClick={() => setShowEditDialog(true)}
        />

        <Tabs defaultValue="planning" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="planning" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="recap" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Récap
            </TabsTrigger>
            <TabsTrigger value="fichiers" className="gap-2">
              <FileText className="h-4 w-4" />
              Fichiers
            </TabsTrigger>
            <TabsTrigger value="todo" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Todo
            </TabsTrigger>
            <TabsTrigger value="rentabilite" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Rentabilité
            </TabsTrigger>
            <TabsTrigger value="infos" className="gap-2">
              <Info className="h-4 w-4" />
              Informations
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="planning">
              <ChantierPlanningTab chantierId={chantier.id} chantierNom={chantier.nom} />
            </TabsContent>
            <TabsContent value="recap">
              <ChantierKanbanTab chantierId={chantier.id} />
            </TabsContent>
            <TabsContent value="fichiers">
              <ChantierFichiersTab chantierId={chantier.id} />
            </TabsContent>
            <TabsContent value="todo">
              <ChantierTodoTab chantierId={chantier.id} />
            </TabsContent>
            <TabsContent value="rentabilite">
              <ChantierRentabiliteTab chantierId={chantier.id} />
            </TabsContent>
            <TabsContent value="infos">
              <ChantierInfosTab />
            </TabsContent>
          </div>
        </Tabs>

        {/* Edit Dialog */}
        <ChantierEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          chantier={chantier}
        />
      </div>
    </div>
  );
};

export default ChantierDetail;
