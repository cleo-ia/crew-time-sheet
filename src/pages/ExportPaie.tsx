import { useState, useMemo, useEffect } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { FileOutput, ChevronRight, ChevronLeft, Clock, Download, Lock, Loader2, FileSpreadsheet, PieChart, Users, CheckCircle2, Building2, CircleDot, AlertTriangle, ShieldCheck, ShieldX, Info, Database, Truck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { RHPreExport } from "@/components/rh/RHPreExport";
import { ClotureDialog } from "@/components/rh/ClotureDialog";
import { InterimaireExportDialog } from "@/components/rh/InterimaireExportDialog";
import { fetchRHExportData } from "@/hooks/useRHExport";
import { generateRHExcel } from "@/lib/excelExport";
import { useRecapChantier, useVentilationOuvrier, useVentilationInterim } from "@/hooks/useVentilationAnalytique";
import { exportVentilationCompletePdf } from "@/lib/ventilationExport";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
import { useLogModification } from "@/hooks/useLogModification";
import { useCurrentUserInfo } from "@/hooks/useCurrentUserInfo";
import { useExportPaieReadiness } from "@/hooks/useExportPaieReadiness";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FichesNonValideesDialog } from "@/components/rh/FichesNonValideesDialog";

const STEPS = [
  { id: 1, label: "Période", icon: Clock },
  { id: 2, label: "Ajustements & Dashboard", icon: FileSpreadsheet },
  { id: 3, label: "Export & Clôture", icon: Lock },
];

const ExportPaie = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [periode, setPeriode] = useState(format(new Date(), "yyyy-MM"));
  const [showClotureDialog, setShowClotureDialog] = useState(false);
  const [showInterimaireExport, setShowInterimaireExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingVentilation, setIsExportingVentilation] = useState(false);
  const [showFichesDetail, setShowFichesDetail] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const enterpriseConfig = useEnterpriseConfig();
  const logModification = useLogModification();
  const userInfo = useCurrentUserInfo();
  const readiness = useExportPaieReadiness(periode);

  // Reset dataLoaded when periode changes
  useEffect(() => { setDataLoaded(false); }, [periode]);

  // Filters object compatible with existing hooks
  const filters = useMemo(() => ({
    periode,
    semaine: "all",
    chantier: "all",
    chef: "all",
    salarie: "all",
    typeSalarie: "non_interimaire",
  }), [periode]);

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

  const handlePrevMonth = () => {
    const [y, m] = periode.split("-").map(Number);
    const prev = subMonths(new Date(y, m - 1), 1);
    setPeriode(format(prev, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const [y, m] = periode.split("-").map(Number);
    const next = addMonths(new Date(y, m - 1), 1);
    setPeriode(format(next, "yyyy-MM"));
  };

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
      if (userInfo) {
        try {
          logModification.mutate({
            entrepriseId: userInfo.entrepriseId,
            userId: userInfo.userId,
            userName: userInfo.userName,
            action: "export_paie",
            userRole: "rh",
            details: {
              periode,
              type: "excel",
              message: `Export paie Excel généré pour ${periodeLabel}`,
            },
          });
        } catch (e) { console.error("Log error:", e); }
      }
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
      if (userInfo) {
        try {
          logModification.mutate({
            entrepriseId: userInfo.entrepriseId,
            userId: userInfo.userId,
            userName: userInfo.userName,
            action: "export_paie",
            userRole: "rh",
            details: {
              periode,
              type: "ventilation_pdf",
              message: `Export ventilation PDF généré pour ${periodeLabel}`,
            },
          });
        } catch (e) { console.error("Log error:", e); }
      }
    } catch (error) {
      console.error("Erreur export ventilation:", error);
      toast.error("Erreur lors de l'export ventilation");
    } finally {
      setIsExportingVentilation(false);
    }
  };

  const canGoNext = () => {
    if (currentStep === 1) return !!periode;
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
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sélection de la période</h2>
              <p className="text-sm text-muted-foreground">
                Choisissez le mois pour lequel vous souhaitez préparer l'export de paie.
              </p>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-64">
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
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Readiness badge */}
            {readiness.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : readiness.data && (
              <div className={`rounded-lg border p-4 flex items-start gap-3 ${
                readiness.data.status === "closed"
                  ? "bg-destructive/10 border-destructive/30"
                  : readiness.data.status === "incomplete"
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "bg-green-500/10 border-green-500/30"
              }`}>
                {readiness.data.status === "closed" ? (
                  <ShieldX className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                ) : readiness.data.status === "incomplete" ? (
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`font-semibold ${
                    readiness.data.status === "closed"
                      ? "text-destructive"
                      : readiness.data.status === "incomplete"
                      ? "text-orange-600"
                      : "text-green-700"
                  }`}>
                    {readiness.data.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{readiness.data.sublabel}</p>
                </div>
              </div>
            )}

            {/* KPI cards */}
            {readiness.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : readiness.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 space-y-1 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium">Salariés</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-foreground">{readiness.data.nbSalaries}</p>
                </Card>
                <Card
                  className={`p-4 space-y-1 cursor-pointer transition-shadow shadow-sm hover:shadow-md border border-border ${
                    readiness.data.nbFichesValidees === readiness.data.nbFichesTotal && readiness.data.nbFichesTotal > 0
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-orange-400"
                  }`}
                  onClick={() => setShowFichesDetail(true)}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {readiness.data.nbFichesValidees === readiness.data.nbFichesTotal && readiness.data.nbFichesTotal > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                    )}
                    <span className="text-xs font-medium">Fiches validées</span>
                    <Info className="h-3 w-3 ml-auto text-muted-foreground/40" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-foreground">
                    {readiness.data.nbFichesValidees}
                    <span className="text-sm font-normal text-muted-foreground"> / {readiness.data.nbFichesTotal}</span>
                  </p>
                </Card>
                <Card className="p-4 space-y-1 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium">Chantiers</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-foreground">{readiness.data.nbChantiers}</p>
                </Card>
                <Card className="p-4 space-y-1 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Statut</span>
                  </div>
                  <Badge
                    variant={readiness.data.status === "closed" ? "destructive" : "outline"}
                    className={readiness.data.status !== "closed" ? "mt-1 border-blue-500 text-blue-600" : "mt-1"}
                  >
                    {readiness.data.status === "closed" ? "Clôturée" : "Ouverte"}
                  </Badge>
                </Card>
              </div>
            )}

            {/* Dernière clôture */}
            {readiness.data?.dateDerniereCloture && (
              <p className="text-xs text-muted-foreground text-center">
                Dernière clôture : <span className="capitalize">{readiness.data.moisDerniereCloture}</span> — le {readiness.data.dateDerniereCloture}
              </p>
            )}
          </Card>
        )}

        {/* Step 2: Ajustements & Dashboard */}
        {currentStep === 2 && !dataLoaded && (
          <Card className="max-w-lg mx-auto text-center p-8 space-y-6 shadow-sm border border-border">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center mx-auto">
              <Database className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Prêt à analyser les données de <span className="capitalize">{periodeLabel}</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Le système va compiler les heures, paniers et trajets pour préparer votre export.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 py-4">
              {[
                { icon: Clock, label: "Heures & Paniers" },
                { icon: Truck, label: "Trajets & Zones" },
                { icon: BarChart3, label: "Totaux par Chantier" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <Button
              size="lg"
              className="group bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
              onClick={() => setDataLoaded(true)}
            >
              Charger les données
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-muted-foreground/60">
              L'analyse prend généralement moins de 3 secondes.
            </p>
          </Card>
        )}
        {currentStep === 2 && dataLoaded && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              Ajustements & Dashboard — {periodeLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              Vérifiez et ajustez les données avant l'export final. Les modifications sont enregistrées en base.
            </p>
            <RHPreExport filters={filters} autoLoad />
          </div>
        )}

        {/* Step 3: Export & Clôture */}
        {currentStep === 3 && (
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
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
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
      <FichesNonValideesDialog
        open={showFichesDetail}
        onOpenChange={setShowFichesDetail}
        fichesNonValidees={readiness.data?.fichesNonValidees || []}
        periodeLabel={periodeLabel}
      />
    </PageLayout>
  );
};

export default ExportPaie;
