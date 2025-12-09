import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Lock, Download, Loader2, Users, FileText, Clock, Building2, Utensils, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCloturePeriode } from "@/hooks/useRHData";
import { buildRHConsolidation } from "@/hooks/rhShared";
import { fetchRHExportData, RHExportEmployee } from "@/hooks/useRHExport";
import { generateRHExcel } from "@/lib/excelExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClotureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: any;
}

interface PreviewData {
  salaries: number;
  fiches: number;
  totalHeures: number;
  totalHeuresNormales: number;
  totalHeuresSupp: number;
  totalAbsences: number;
  totalPaniers: number;
  totalTrajets: number;
  nbChantiers: number;
  hasWarnings: boolean;
  warnings: string[];
}

export const ClotureDialog = ({ open, onOpenChange, filters }: ClotureDialogProps) => {
  const { toast } = useToast();
  const [motif, setMotif] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const clotureMutation = useCloturePeriode();

  // Formater le nom du mois pour l'affichage
  const getMonthLabel = () => {
    if (!filters.periode) return "N/A";
    const [year, month] = filters.periode.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, "MMMM yyyy", { locale: fr });
  };

  // Charger les données à l'ouverture du dialog
  useEffect(() => {
    if (open && filters.periode) {
      loadPreviewData();
    } else {
      setPreviewData(null);
    }
  }, [open, filters.periode]);

  const loadPreviewData = async () => {
    setIsLoading(true);
    try {
      const consolidatedData = await buildRHConsolidation({ 
        ...filters, 
        periode: filters.periode 
      });

      if (consolidatedData.length === 0) {
        setPreviewData(null);
        return;
      }

      // Calculer les statistiques
      const totalHeuresNormales = consolidatedData.reduce((sum, emp) => sum + emp.heuresNormales, 0);
      const totalHeuresSupp25 = consolidatedData.reduce((sum, emp) => sum + emp.heuresSupp25, 0);
      const totalHeuresSupp50 = consolidatedData.reduce((sum, emp) => sum + emp.heuresSupp50, 0);
      const totalHeuresSupp = totalHeuresSupp25 + totalHeuresSupp50;
      const totalAbsences = consolidatedData.reduce((sum, emp) => sum + emp.absences, 0);
      const totalPaniers = consolidatedData.reduce((sum, emp) => sum + emp.paniers, 0);
      const totalTrajets = consolidatedData.reduce((sum, emp) => sum + emp.totalJoursTrajets, 0);
      
      // Collecter les chantiers uniques
      const uniqueChantiers = new Set<string>();
      consolidatedData.forEach(emp => {
        emp.chantier_codes?.forEach(code => uniqueChantiers.add(code));
      });

      // Vérifier les warnings
      const hasUnqualifiedAbsences = consolidatedData.some(emp => emp.hasUnqualifiedAbsences);
      const trajetsACompleter = consolidatedData.reduce((total, emp) => {
        return total + (emp.trajetsParCode?.A_COMPLETER || 0);
      }, 0);

      const warnings: string[] = [];
      if (hasUnqualifiedAbsences) warnings.push("Absences non qualifiées détectées");
      if (trajetsACompleter > 0) warnings.push(`${trajetsACompleter} trajets à compléter`);

      setPreviewData({
        salaries: consolidatedData.length,
        fiches: consolidatedData.length,
        totalHeures: Math.round((totalHeuresNormales + totalHeuresSupp) * 100) / 100,
        totalHeuresNormales: Math.round(totalHeuresNormales * 100) / 100,
        totalHeuresSupp: Math.round(totalHeuresSupp * 100) / 100,
        totalAbsences,
        totalPaniers,
        totalTrajets,
        nbChantiers: uniqueChantiers.size,
        hasWarnings: warnings.length > 0,
        warnings,
      });
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setPreviewData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloture = async () => {
    if (!filters.periode) {
      toast({
        title: "Période requise",
        description: "Veuillez sélectionner un mois à clôturer.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Récupérer les données consolidées via buildRHConsolidation
      const consolidatedData = await buildRHConsolidation({ 
        ...filters, 
        periode: filters.periode 
      });

      if (consolidatedData.length === 0) {
        toast({
          title: "Aucune donnée",
          description: "Aucune fiche à clôturer pour cette période.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // 2. Vérifier les prérequis (absences non qualifiées, trajets à compléter)
      const hasUnqualifiedAbsences = consolidatedData.some(emp => emp.hasUnqualifiedAbsences);
      const trajetsACompleter = consolidatedData.reduce((total, emp) => {
        return total + (emp.trajetsParCode?.A_COMPLETER || 0);
      }, 0);

      if (hasUnqualifiedAbsences || trajetsACompleter > 0) {
        const warnings: string[] = [];
        if (hasUnqualifiedAbsences) warnings.push("absences non qualifiées");
        if (trajetsACompleter > 0) warnings.push(`${trajetsACompleter} trajets à compléter`);
        
        toast({
          title: "Données incomplètes",
          description: `Veuillez d'abord corriger : ${warnings.join(", ")}.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // 3. Calculer toutes les statistiques
      const totalHeuresNormales = consolidatedData.reduce((sum, emp) => sum + emp.heuresNormales, 0);
      const totalHeuresSupp25 = consolidatedData.reduce((sum, emp) => sum + emp.heuresSupp25, 0);
      const totalHeuresSupp50 = consolidatedData.reduce((sum, emp) => sum + emp.heuresSupp50, 0);
      const totalHeuresSupp = totalHeuresSupp25 + totalHeuresSupp50;
      const totalAbsences = consolidatedData.reduce((sum, emp) => sum + emp.absences, 0);
      const totalIntemperies = consolidatedData.reduce((sum, emp) => sum + emp.intemperies, 0);
      const totalPaniers = consolidatedData.reduce((sum, emp) => sum + emp.paniers, 0);
      const totalTrajets = consolidatedData.reduce((sum, emp) => sum + emp.totalJoursTrajets, 0);
      
      // Agréger trajets par code
      const trajetsParCode: Record<string, number> = {};
      consolidatedData.forEach(emp => {
        Object.entries(emp.trajetsParCode || {}).forEach(([code, count]) => {
          trajetsParCode[code] = (trajetsParCode[code] || 0) + count;
        });
      });

      // Collecter les chantiers uniques
      const uniqueChantiers = new Set<string>();
      consolidatedData.forEach(emp => {
        emp.chantier_codes?.forEach(code => uniqueChantiers.add(code));
      });

      // Compter les fiches (une fiche = un salarié/semaine unique)
      const fichesCount = consolidatedData.length;

      // 4. Générer et télécharger l'Excel
      const exportData = await fetchRHExportData(filters.periode, filters);
      const fichierExcel = await generateRHExcel(exportData, filters.periode);

      // 5. Clôturer la période
      await clotureMutation.mutateAsync({
        filters,
        motif,
        fichierExcel,
        consolidatedData: {
          salaries: consolidatedData.length,
          fiches: fichesCount,
          totalHeures: Math.round((totalHeuresNormales + totalHeuresSupp) * 100) / 100,
          totalHeuresNormales: Math.round(totalHeuresNormales * 100) / 100,
          totalHeuresSupp: Math.round(totalHeuresSupp * 100) / 100,
          totalHeuresSupp25: Math.round(totalHeuresSupp25 * 100) / 100,
          totalHeuresSupp50: Math.round(totalHeuresSupp50 * 100) / 100,
          totalAbsences,
          totalIntemperies: Math.round(totalIntemperies * 100) / 100,
          totalPaniers,
          totalTrajets,
          nbChantiers: uniqueChantiers.size,
          trajetsParCode,
        },
      });

      onOpenChange(false);
      setMotif("");
    } catch (error) {
      console.error("Erreur lors de la clôture:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la clôture.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canConfirm = previewData && !previewData.hasWarnings && previewData.salaries > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Clôturer la période de paie
          </DialogTitle>
          <DialogDescription>
            Cette action va télécharger l'export Excel et verrouiller toutes les fiches du mois en lecture seule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-semibold text-foreground">Période à clôturer</h4>
            <p className="text-lg font-medium text-primary capitalize">{getMonthLabel()}</p>
          </div>

          {/* Données à clôturer */}
          {isLoading ? (
            <div className="p-6 bg-muted/50 rounded-lg text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Chargement des données...</p>
            </div>
          ) : previewData ? (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-semibold text-foreground">Données à clôturer</h4>
              
              {/* Statistiques principales */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-background rounded-lg border">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{previewData.salaries}</p>
                  <p className="text-xs text-muted-foreground">Salariés</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg border">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{previewData.fiches}</p>
                  <p className="text-xs text-muted-foreground">Fiches</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg border">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{previewData.totalHeures.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Heures totales</p>
                </div>
              </div>

              {/* Statistiques secondaires */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-2 bg-background rounded-lg border">
                  <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">{previewData.nbChantiers}</p>
                  <p className="text-xs text-muted-foreground">Chantiers</p>
                </div>
                <div className="text-center p-2 bg-background rounded-lg border">
                  <Utensils className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">{previewData.totalPaniers}</p>
                  <p className="text-xs text-muted-foreground">Paniers</p>
                </div>
                <div className="text-center p-2 bg-background rounded-lg border">
                  <Car className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">{previewData.totalTrajets}</p>
                  <p className="text-xs text-muted-foreground">Trajets</p>
                </div>
              </div>

              {/* Warnings si données incomplètes */}
              {previewData.hasWarnings && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-destructive font-medium">Données incomplètes</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                        {previewData.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-destructive/10 rounded-lg text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <p className="text-sm text-destructive font-medium">Aucune donnée à clôturer pour cette période</p>
            </div>
          )}

          {/* Info about what will happen */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-700 dark:text-blue-400">Actions automatiques</p>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-1">
                  <li>Téléchargement automatique de l'export Excel</li>
                  <li>Verrouillage de toutes les fiches du mois</li>
                  <li>Archivage des données dans l'historique</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Commentaire (optionnel)
            </label>
            <Textarea
              placeholder="Notes pour l'archive..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Final warning */}
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Après clôture, les fiches ne pourront plus être modifiées.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Annuler
          </Button>
          <Button 
            onClick={handleCloture} 
            className="bg-accent hover:bg-accent-hover" 
            disabled={isProcessing || isLoading || !canConfirm}
          >
            <Lock className="h-4 w-4 mr-2" />
            {isProcessing ? "Clôture en cours..." : "Confirmer la clôture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
