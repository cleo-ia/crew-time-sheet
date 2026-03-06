import { useState, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { FileOutput, ChevronRight, ChevronLeft, Users, Clock, TrendingUp, UserX, Building2, Utensils, Car, Route, Download, Lock, Loader2, AlertTriangle, FileSpreadsheet, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { RHPreExport } from "@/components/rh/RHPreExport";
import { ClotureDialog } from "@/components/rh/ClotureDialog";
import { InterimaireExportDialog } from "@/components/rh/InterimaireExportDialog";
import { useRHSummary } from "@/hooks/useRHData";
import { fetchRHExportData } from "@/hooks/useRHExport";
import { generateRHExcel } from "@/lib/excelExport";
import { useRecapChantier, useVentilationOuvrier, useVentilationInterim } from "@/hooks/useVentilationAnalytique";
import { exportVentilationCompletePdf } from "@/lib/ventilationExport";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Période", icon: Clock },
  { id: 2, label: "Récapitulatif", icon: Users },
  { id: 3, label: "Ajustements", icon: FileSpreadsheet },
  { id: 4, label: "Export & Clôture", icon: Lock },
];

const ExportPaie = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [periode, setPeriode] = useState(format(new Date(), "yyyy-MM"));
  const [showClotureDialog, setShowClotureDialog] = useState(false);
  const [showInterimaireExport, setShowInterimaireExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingVentilation, setIsExportingVentilation] = useState(false);

  const enterpriseConfig = useEnterpriseConfig();

  // Filters object compatible with existing hooks
  const filters = useMemo(() => ({
    periode,
    semaine: "all",
    chantier: "all",
    chef: "all",
    salarie: "all",
    typeSalarie: "all",
  }), [periode]);

  const { data: summary, isLoading: summaryLoading } = useRHSummary(filters);

  // Ventilation data for PDF export
  const { data: recapChantierData } = useRecapChantier(periode);
  const { data: ventilationOuvrierData } = useVentilationOuvrier(periode);
  const { data: ventilationInterimData } = useVentilationInterim(periode);

  const derniersMois = useMemo(() => {
    const mois = [];
    const today = new Date();
    const moisSuivant = addMonths(today, 1);
    mois.push({
      value: format(moisSuivant, "yyyy-MM"),
      label: format(moisSuivant, "MMMM yyyy", { locale: fr }),
    });
    for (let i = 0; i < 12; i++) {
      const date = subMonths(today, i);
      mois.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: fr }),
      });
    }
    return mois;
  }, []);

  const periodeLabel = useMemo(() => {
    const match = derniersMois.find(m => m.value === periode);
    return match?.label || periode;
  }, [periode, derniersMois]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchRHExportData(periode, filters);
      if (data.length === 0) {
        toast.error("Aucune donnée à exporter pour cette période");
        return;
      }
      const filename = await generateRHExcel(data, periode, undefined, {
        entrepriseNom: enterpriseConfig?.nom,
        dossierRef: enterpriseConfig?.dossierRef,
      });
      toast.success(`Excel généré : ${filename}`);
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toast.error("Erreur lors de la génération de l'Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVentilation = async () => {
    if (!recapChantierData || !ventilationOuvrierData || !ventilationInterimData) {
      toast.error("Données de ventilation non disponibles");
      return;
    }
    setIsExportingVentilation(true);
    try {
      await exportVentilationCompletePdf(
        recapChantierData,
        ventilationOuvrierData,
        ventilationInterimData,
        periode
      );
      toast.success("PDF ventilation généré");
    } catch (error) {
      console.error("Erreur export ventilation:", error);
      toast.error("Erreur lors de l'export ventilation");
    } finally {
      setIsExportingVentilation(false);
    }
  };

  const canGoNext = () => {
    if (currentStep === 1) return !!periode;
    if (currentStep === 2) return (summary?.salaries || 0) > 0;
    return true;
  };

  return (
    <PageLayout>
      <AppNav />
      <PageHeader
        title="Export de paie"
        subtitle={`Workflow d'export pour ${periodeLabel}`}
        icon={FileOutput}
        theme="consultation-rh"
      />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isDone
                      ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{step.label}</span>
                  <span className="md:hidden">{step.id}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Sélection période */}
        {currentStep === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Sélection de la période</h2>
            <p className="text-sm text-muted-foreground">
              Choisissez le mois pour lequel vous souhaitez préparer l'export de paie.
            </p>
            <div className="max-w-sm">
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Sélectionner un mois" />
                </SelectTrigger>
                <SelectContent>
                  {derniersMois.map((mois) => (
                    <SelectItem key={mois.value} value={mois.value}>
                      <span className="capitalize">{mois.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        )}

        {/* Step 2: Récapitulatif */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              Récapitulatif — {periodeLabel}
            </h2>
            {summaryLoading ? (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4"><Skeleton className="h-20 w-full" /></Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "Salariés", value: summary?.salaries || 0, icon: Users, color: "text-primary" },
                    { label: "Heures normales", value: `${summary?.heuresNormales || 0}h`, icon: Clock, color: "text-primary" },
                    { label: "Heures supp.", value: `${summary?.heuresSupp || 0}h`, icon: TrendingUp, color: "text-accent" },
                    { label: "Absences", value: `${summary?.absences || 0}j`, icon: UserX, color: "text-warning" },
                    { label: "Chantiers", value: summary?.chantiers || 0, icon: Building2, color: "text-primary" },
                    { label: "Trajets à compléter", value: summary?.trajetsACompleter || 0, icon: Route, color: (summary?.trajetsACompleter || 0) > 0 ? "text-orange-500" : "text-muted-foreground" },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={idx} className="p-4 shadow-md border-border/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {(summary?.trajetsACompleter || 0) > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {summary?.trajetsACompleter} trajet(s) à compléter. Corrigez-les avant l'export.
                    </AlertDescription>
                  </Alert>
                )}

                {(summary?.salaries || 0) === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Aucune donnée trouvée pour cette période. Vérifiez que les fiches ont bien été transmises.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Ajustements (Pré-export) */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              Ajustements pré-export — {periodeLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              Vérifiez et ajustez les données avant l'export final. Les modifications sont enregistrées en base.
            </p>
            <RHPreExport filters={filters} />
          </div>
        )}

        {/* Step 4: Export & Clôture */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              Export & Clôture — {periodeLabel}
            </h2>

            {/* Export actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Export Excel complet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Génère le fichier Excel avec toutes les données de paie du mois, incluant les ajustements effectués.
                </p>
                <Button onClick={handleExportExcel} disabled={isExporting} className="w-full">
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Télécharger l'Excel
                </Button>
              </Card>

              <Card className="p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Export intérimaires
                </h3>
                <p className="text-sm text-muted-foreground">
                  Génère les fiches PDF par agence intérimaire pour envoi aux agences.
                </p>
                <Button onClick={() => setShowInterimaireExport(true)} variant="outline" className="w-full">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter intérimaires
                </Button>
              </Card>

              <Card className="p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Ventilation analytique
                </h3>
                <p className="text-sm text-muted-foreground">
                  Génère le PDF de ventilation par chantier, ouvrier et intérimaire.
                </p>
                <Button onClick={handleExportVentilation} disabled={isExportingVentilation} variant="outline" className="w-full">
                  {isExportingVentilation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PieChart className="h-4 w-4 mr-2" />}
                  Exporter ventilation PDF
                </Button>
              </Card>

              <Card className="p-6 space-y-3 border-destructive/30">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5 text-destructive" />
                  Clôture de période
                </h3>
                <p className="text-sm text-muted-foreground">
                  Verrouille toutes les fiches du mois en lecture seule et archive les données. Action irréversible.
                </p>
                <Button onClick={() => setShowClotureDialog(true)} variant="destructive" className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Clôturer la période
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          {currentStep < 4 && (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              disabled={!canGoNext()}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ClotureDialog
        open={showClotureDialog}
        onOpenChange={setShowClotureDialog}
        filters={filters}
      />
      <InterimaireExportDialog
        open={showInterimaireExport}
        onOpenChange={setShowInterimaireExport}
        filters={filters}
      />
    </PageLayout>
  );
};

export default ExportPaie;
