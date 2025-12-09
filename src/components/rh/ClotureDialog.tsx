import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Lock, Download } from "lucide-react";
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

export const ClotureDialog = ({ open, onOpenChange, filters }: ClotureDialogProps) => {
  const { toast } = useToast();
  const [motif, setMotif] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const clotureMutation = useCloturePeriode();

  // Formater le nom du mois pour l'affichage
  const getMonthLabel = () => {
    if (!filters.periode) return "N/A";
    const [year, month] = filters.periode.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, "MMMM yyyy", { locale: fr });
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
          <Button onClick={handleCloture} className="bg-accent hover:bg-accent-hover" disabled={isProcessing}>
            <Lock className="h-4 w-4 mr-2" />
            {isProcessing ? "Clôture en cours..." : "Confirmer la clôture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};