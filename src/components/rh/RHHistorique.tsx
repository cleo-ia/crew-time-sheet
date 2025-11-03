import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Lock } from "lucide-react";
import { useRHHistorique } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";

interface RHHistoriqueProps {
  filters: any;
  onSelectFiche: (id: string) => void;
}

export const RHHistorique = ({ filters, onSelectFiche }: RHHistoriqueProps) => {
  const { data: closedPeriods = [], isLoading } = useRHHistorique(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {closedPeriods.map((period) => (
        <Card key={period.id} className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground">{period.periode}</h3>
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1" />
                  Clôturée
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Clôturée le {new Date(period.dateCloture).toLocaleDateString("fr-FR")}</span>
                <span>{period.salaries} salariés</span>
                <span>{period.fiches} fiches</span>
                <span>{period.totalHeures}h total</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => onSelectFiche(period.id)}>
              <Eye className="h-4 w-4 mr-2" />
              Consulter
            </Button>
          </div>
        </Card>
      ))}

      {closedPeriods.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune période clôturée</p>
          <p className="text-sm mt-2">L'historique apparaîtra ici après clôture</p>
        </div>
      )}
    </div>
  );
};
