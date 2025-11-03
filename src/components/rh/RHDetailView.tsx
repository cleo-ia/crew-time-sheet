import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, AlertTriangle } from "lucide-react";
import { useRHDetails } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";

interface RHDetailViewProps {
  filters: any;
  onSelectFiche: (id: string) => void;
}

export const RHDetailView = ({ filters, onSelectFiche }: RHDetailViewProps) => {
  const { data: fiches = [], isLoading } = useRHDetails(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fiches.map((fiche) => (
        <Card key={fiche.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground">{fiche.chantier}</h3>
                  <p className="text-sm text-muted-foreground">{fiche.semaine}</p>
                </div>
                {fiche.anomalies > 0 && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {fiche.anomalies} anomalie{fiche.anomalies > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Chef: {fiche.chef}</span>
                <span>{fiche.macons} maçons</span>
                <span>{fiche.totalHeures}h total</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => onSelectFiche(fiche.id)}>
              <Eye className="h-4 w-4 mr-2" />
              Voir le détail
            </Button>
          </div>
        </Card>
      ))}

      {fiches.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune fiche à afficher</p>
          <p className="text-sm mt-2">Aucun résultat avec ces filtres</p>
        </div>
      )}
    </div>
  );
};
