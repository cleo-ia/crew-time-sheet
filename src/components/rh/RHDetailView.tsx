import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, AlertTriangle, CalendarOff } from "lucide-react";
import { useRHDetails } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";

interface RHDetailViewProps {
  filters: any;
  onSelectFiche: (id: string) => void;
}

const isAbsenceFiche = (chantier: string) => {
  const absenceLabels = ["Congés payés", "Maladie", "Accident du travail", "Sans solde", "Formation", "Autre absence", "Absence longue durée"];
  return absenceLabels.includes(chantier);
};

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
      {fiches.map((fiche) => {
        const isAbsence = isAbsenceFiche(fiche.chantier);
        return (
          <Card key={fiche.id} className={`p-4 hover:shadow-lg transition-shadow ${isAbsence ? 'border-l-4 border-l-orange-400 dark:border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/10' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isAbsence && <CalendarOff className="h-4 w-4 text-orange-500" />}
                    <div>
                      <h3 className="font-semibold text-foreground">{fiche.chantier}</h3>
                      <p className="text-sm text-muted-foreground">{fiche.semaine}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAbsence && (
                      <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                        Absence
                      </Badge>
                    )}
                    {fiche.anomalies > 0 && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {fiche.anomalies} anomalie{fiche.anomalies > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {!isAbsence && <span>{fiche.chef ? `Chef: ${fiche.chef}` : "Conducteur direct"}</span>}
                  <span>{fiche.macons} salarié{fiche.macons > 1 ? "s" : ""}</span>
                  <span>{fiche.totalHeures}h total</span>
                </div>
              </div>
              {!isAbsence && (
                <Button variant="outline" onClick={() => onSelectFiche(fiche.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le détail
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      {fiches.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune fiche à afficher</p>
          <p className="text-sm mt-2">Aucun résultat avec ces filtres</p>
        </div>
      )}
    </div>
  );
};
