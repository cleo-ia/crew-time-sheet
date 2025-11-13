import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Download, Lock } from "lucide-react";
import { AppNav } from "@/components/navigation/AppNav";
import { RHFilters } from "@/components/rh/RHFilters";
import { RHSummary } from "@/components/rh/RHSummary";
import { RHConsolidated } from "@/components/rh/RHConsolidated";
import { RHDetailView } from "@/components/rh/RHDetailView";
import { RHHistorique } from "@/components/rh/RHHistorique";
import { RHFicheDetail } from "@/components/rh/RHFicheDetail";
import { RHEmployeeDetail } from "@/components/rh/RHEmployeeDetail";
import { ClotureDialog } from "@/components/rh/ClotureDialog";
import { RHPreExport } from "@/components/rh/RHPreExport";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchRHExportData } from "@/hooks/useRHExport";
import { generateRHExcel } from "@/lib/excelExport";


const ConsultationRH = () => {
  const [selectedFiche, setSelectedFiche] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("consolide");
  const [showClotureDialog, setShowClotureDialog] = useState(false);
  const [filters, setFilters] = useState({
    periode: format(new Date(), "yyyy-MM"), // Mois courant par défaut
    semaine: "",
    conducteur: "",
    chantier: "",
    chef: "",
    salarie: "all",
    typeSalarie: "all",
  });

  const handleExport = async (exportFormat: "csv" | "excel") => {
    if (exportFormat === "excel") {
      try {
        // Déterminer le mois à exporter (toujours le mois complet avec les filtres actifs)
        const mois = filters.periode || format(new Date(), "yyyy-MM");

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
              variant="outline" 
              onClick={() => setActiveTab("preexport")}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Modifier et Exporter Excel
            </Button>
            <Button 
              className="bg-accent hover:bg-accent-hover"
              onClick={() => setShowClotureDialog(true)}
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
        ) : selectedFiche.startsWith("emp___") ? (
          <RHEmployeeDetail 
            salarieId={selectedFiche.substring(6)} 
            filters={filters}
            onBack={() => setSelectedFiche(null)} 
          />
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
