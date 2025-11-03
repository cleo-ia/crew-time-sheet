import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRHSummary, useCloturePeriode } from "@/hooks/useRHData";

interface ClotureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: any;
}

export const ClotureDialog = ({ open, onOpenChange, filters }: ClotureDialogProps) => {
  const { toast } = useToast();
  const [motif, setMotif] = useState("");
  const { data: summaryData } = useRHSummary(filters);
  const clotureMutation = useCloturePeriode();

  const summary = {
    periode: filters.semaine || "N/A",
    fiches: 0,
    salaries: summaryData?.salaries || 0,
    totalHeures: ((summaryData?.heuresNormales || 0) + (summaryData?.heuresSupp || 0)),
    anomalies: 0,
  };

  const handleCloture = async () => {
    if (!motif.trim() && summary.anomalies > 0) {
      toast({
        title: "Justification requise",
        description: "Vous devez justifier la clôture malgré les anomalies détectées.",
        variant: "destructive",
      });
      return;
    }

    if (!summaryData) {
      toast({
        title: "Erreur",
        description: "Impossible de clôturer: données non disponibles",
        variant: "destructive",
      });
      return;
    }

    try {
      await clotureMutation.mutateAsync({ filters, motif, summary: summaryData });
      onOpenChange(false);
      setMotif("");
    } catch (error) {
      // Error handled in mutation
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
            Cette action verrouillera toutes les fiches de la période sélectionnée en lecture seule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-semibold text-foreground">Résumé de la période</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Période :</span>
                <p className="font-medium text-foreground">{summary.periode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fiches :</span>
                <p className="font-medium text-foreground">{summary.fiches}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Salariés :</span>
                <p className="font-medium text-foreground">{summary.salaries}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total heures :</span>
                <p className="font-medium text-foreground">{summary.totalHeures}h</p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {summary.anomalies > 0 && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-warning">Anomalies détectées</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {summary.anomalies} fiche{summary.anomalies > 1 ? "s présentent" : " présente"} des anomalies. 
                    Veuillez les corriger ou justifier la clôture ci-dessous.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Justification */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Commentaire {summary.anomalies > 0 ? "(obligatoire)" : "(optionnel)"}
            </label>
            <Textarea
              placeholder="Raison de la clôture, notes pour l'archive..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Final warning */}
          <div className="text-sm text-muted-foreground">
            ⚠️ Après clôture, les fiches ne pourront plus être modifiées. 
            Une réouverture exceptionnelle sera possible uniquement avec justification.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={clotureMutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleCloture} className="bg-accent hover:bg-accent-hover" disabled={clotureMutation.isPending}>
            <Lock className="h-4 w-4 mr-2" />
            {clotureMutation.isPending ? "Clôture en cours..." : "Confirmer la clôture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
