import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Users, Clock } from "lucide-react";
import { useChefHistorique } from "@/hooks/useChefHistorique";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { parseISOWeek } from "@/lib/weekUtils";

interface ChefHistoriqueProps {
  chefId: string | null;
  onSelectFiche: (ficheId: string) => void;
}

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case "EN_SIGNATURE":
      return "En signature";
    case "VALIDE_CHEF":
      return "Validé";
    case "VALIDE_CONDUCTEUR":
      return "Validé";
    case "AUTO_VALIDE":
      return "Auto-validé";
    case "ENVOYE_RH":
      return "Envoyé RH";
    default:
      return statut;
  }
};

export const ChefHistorique = ({ chefId, onSelectFiche }: ChefHistoriqueProps) => {
  const { data: history = [], isLoading } = useChefHistorique(chefId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => {
        const weekDate = parseISOWeek(item.semaine);
        const weekLabel = format(weekDate, "'Semaine' w - yyyy", { locale: fr });

        return (
          <Card 
            key={`${item.chantierId}-${item.semaine}`} 
            className="p-4 hover:bg-accent/5 transition-colors border-border/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* En-tête compact */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {weekLabel}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {getStatutLabel(item.statut)}
                  </Badge>
                </div>
                
                {/* Infos chantier - ligne compacte */}
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{item.chantierNom}</span>
                  <span className="mx-2">•</span>
                  <span>{item.chantierCode}</span>
                  <span className="mx-2">•</span>
                  <span>{item.chantierVille}</span>
                </div>
                
                {/* Stats - ligne compacte */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {item.nbMacons} maçon{item.nbMacons > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.totalHeures}h
                  </span>
                </div>
              </div>
              
              {/* Bouton consulter - plus discret */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onSelectFiche(`${item.chantierId}-${item.semaine}`)}
                className="shrink-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}

      {history.length === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Aucun historique disponible
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
