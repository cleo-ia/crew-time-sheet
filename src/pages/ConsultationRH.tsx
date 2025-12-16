import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Download, Lock, Route } from "lucide-react";
import { AppNav } from "@/components/navigation/AppNav";
import { RHFilters } from "@/components/rh/RHFilters";
import { RHSummary } from "@/components/rh/RHSummary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRHSummary } from "@/hooks/useRHData";
import { RHConsolidated } from "@/components/rh/RHConsolidated";
import { RHDetailView } from "@/components/rh/RHDetailView";
import { RHHistorique } from "@/components/rh/RHHistorique";
import { RHFicheDetail } from "@/components/rh/RHFicheDetail";
import { RHPeriodeDetail } from "@/components/rh/RHPeriodeDetail";
import { RHEmployeeDetail } from "@/components/rh/RHEmployeeDetail";
import { ClotureDialog } from "@/components/rh/ClotureDialog";
import { RHPreExport } from "@/components/rh/RHPreExport";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchRHExportData } from "@/hooks/useRHExport";
import { generateRHExcel } from "@/lib/excelExport";
import { ConversationButton } from "@/components/chat/ConversationButton";
import { ConversationListSheet } from "@/components/chat/ConversationListSheet";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { supabase } from "@/integrations/supabase/client";


const ConsultationRH = () => {
  const [selectedFiche, setSelectedFiche] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("consolide");
  const [showClotureDialog, setShowClotureDialog] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    periode: format(new Date(), "yyyy-MM"),
    semaine: "all",
    conducteur: "all",
    chantier: "all",
    chef: "all",
    salarie: "all",
    typeSalarie: "all",
  });

  const { data: summary } = useRHSummary(filters);
  const { data: unreadData } = useUnreadMessages(currentUserId);

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const entrepriseId = localStorage.getItem("current_entreprise_id");
        const { data } = await supabase
          .from("utilisateurs")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("entreprise_id", entrepriseId)
          .maybeSingle();
        if (data) setCurrentUserId(data.id);
      }
    };
    fetchUserId();
  }, []);

  const handleExport = async (exportFormat: "csv" | "excel") => {
    if (exportFormat === "excel") {
      try {
        // Déterminer le mois à exporter
        const mois = (!filters.periode || filters.periode === "all") 
          ? format(new Date(), "yyyy-MM") 
          : filters.periode;

        console.log(`[Export Excel] Vérification des absences pour ${mois} avec filtres actifs:`, filters);

        // Récupérer les données avec les MÊMES filtres que l'écran
        const data = await fetchRHExportData(mois, filters);

        if (data.length === 0) {
          toast.error("Aucune donnée à exporter pour cette période");
          return;
        }

        // Vérifier s'il y a des absences non justifiées
        const employesAvecAbsencesNonQualifiees = data.filter(emp => {
          return emp.detailJours?.some(
            jour => jour.isAbsent && (!jour.typeAbsence || jour.typeAbsence === "A_QUALIFIER")
          );
        });

        if (employesAvecAbsencesNonQualifiees.length > 0) {
          const nbEmployes = employesAvecAbsencesNonQualifiees.length;
          const nomsSalaries = employesAvecAbsencesNonQualifiees
            .map(e => `${e.prenom} ${e.nom}`)
            .join(", ");
          
          toast.error(
            `Impossible d'exporter : ${nbEmployes} salarié(s) ont des absences non justifiées.\n\nSalariés concernés : ${nomsSalaries}\n\nVeuillez qualifier toutes les absences avant l'export.`,
            { duration: 8000 }
          );
          return;
        }

        // Générer et télécharger le fichier
        console.log(`[Export Excel] Validation OK, génération de l'export...`);
        const fileName = await generateRHExcel(data, mois);
        toast.success(`Export Excel généré : ${fileName}`);
      } catch (error) {
        console.error("[Export Excel] Erreur:", error);
        toast.error("Erreur lors de la génération de l'export Excel");
      }
    } else {
      toast.info("Export CSV à venir");
    }
  };

  return (
    <PageLayout>
      <div className="bg-gradient-to-br from-background to-muted/30">
        <AppNav />
      
      <PageHeader
        title="Consultation & export des heures"
        subtitle="Service RH"
        icon={FileSpreadsheet}
        theme="consultation-rh"
        actions={
          <>
            <Button 
              variant="default"
              onClick={() => handleExport("excel")}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter Excel
            </Button>
            <Button
              className="bg-accent hover:bg-accent-hover"
              onClick={() => setShowClotureDialog(true)}
              disabled={!filters.periode || filters.periode === "all"}
              title={!filters.periode || filters.periode === "all" ? "Sélectionnez un mois spécifique pour clôturer" : ""}
            >
              <Lock className="h-4 w-4 mr-2" />
              Clôturer la période
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {!selectedFiche ? (
          <div className="space-y-6">
            {/* Summary */}
            <RHSummary filters={filters} />

            {/* Bannière d'alerte trajets à compléter */}
            {summary && summary.trajetsACompleter > 0 && (
              <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
                <Route className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span className="text-orange-900 dark:text-orange-200">
                    <strong>{summary.trajetsACompleter} trajet(s)</strong> en attente de complétion. 
                    Accédez à l'onglet "Pré-export Excel" pour les renseigner.
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-orange-300 hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-900 shrink-0"
                    onClick={() => setActiveTab("preexport")}
                  >
                    Compléter les trajets
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Filters */}
            <RHFilters filters={filters} onFiltersChange={setFilters} />

            {/* Tabs */}
            <Card className="shadow-md border-border/50 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
                  <TabsTrigger value="consolide" className="rounded-none">
                    Consolidé par salarié
                  </TabsTrigger>
                  <TabsTrigger value="preexport" className="rounded-none">
                    Pré-export Excel
                  </TabsTrigger>
                  <TabsTrigger value="detail" className="rounded-none">
                    Détail chantier/semaine
                  </TabsTrigger>
                  <TabsTrigger value="historique" className="rounded-none">
                    Historique clôturé
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consolide" className="p-6">
                  <RHConsolidated filters={filters} onSelectFiche={setSelectedFiche} />
                </TabsContent>

                <TabsContent value="preexport" className="p-6">
                  <RHPreExport filters={filters} />
                </TabsContent>

                <TabsContent value="detail" className="p-6">
                  <RHDetailView filters={filters} onSelectFiche={setSelectedFiche} />
                </TabsContent>

                <TabsContent value="historique" className="p-6">
                  <RHHistorique filters={filters} onSelectFiche={setSelectedFiche} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        ) : selectedFiche.startsWith("periode___") ? (
          <RHPeriodeDetail 
            periodeId={selectedFiche.substring(10)} 
            onBack={() => setSelectedFiche(null)}
            onSelectEmployee={setSelectedFiche}
          />
        ) : selectedFiche.startsWith("emp___") ? (
          (() => {
            // Parser le format : "emp___<salarieId>___periode___<yyyy-MM>" ou "emp___<salarieId>"
            const parts = selectedFiche.split("___");
            const salarieId = parts[1];
            const periodeFromCloture = parts.length === 4 && parts[2] === "periode" ? parts[3] : null;
            const periodeIdFromCloture = parts.length === 4 ? parts[3] : null;
            
            // Construire les filtres adaptés pour la période clôturée
            const employeeFilters = periodeFromCloture 
              ? { ...filters, periode: periodeFromCloture, includeCloture: true }
              : filters;
            
            return (
              <RHEmployeeDetail 
                salarieId={salarieId} 
                filters={employeeFilters}
                onBack={() => {
                  if (periodeIdFromCloture) {
                    // Revenir au détail de la période clôturée - on doit retrouver l'ID
                    // Pour simplifier, on retourne à la liste principale
                    setSelectedFiche(null);
                  } else {
                    setSelectedFiche(null);
                  }
                }} 
              />
            );
          })()
        
        ) : (
          <RHFicheDetail ficheId={selectedFiche} onBack={() => setSelectedFiche(null)} />
        )}
      </main>

      <ClotureDialog 
        open={showClotureDialog} 
        onOpenChange={setShowClotureDialog}
        filters={filters}
      />
      </div>
    </PageLayout>
  );
};

export default ConsultationRH;
