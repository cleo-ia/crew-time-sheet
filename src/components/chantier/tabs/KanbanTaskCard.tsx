import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import type { TacheChantier } from "@/hooks/useTachesChantier";

interface KanbanTaskCardProps {
  tache: TacheChantier;
  computedStatus: "A_FAIRE" | "EN_COURS" | "TERMINE" | "EN_RETARD";
  onClick: () => void;
}

export const KanbanTaskCard = ({ tache, computedStatus, onClick }: KanbanTaskCardProps) => {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  };

  const getDateMessage = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(tache.date_debut);
    const endDate = new Date(tache.date_fin);

    switch (computedStatus) {
      case "A_FAIRE":
        return `Commence le ${formatDate(tache.date_debut)}`;
      case "EN_COURS":
        return `Se termine le ${formatDate(tache.date_fin)}`;
      case "EN_RETARD":
        if (startDate > today) {
          return `Devait commencer le ${formatDate(tache.date_debut)}`;
        }
        return `Devait se terminer le ${formatDate(tache.date_fin)}`;
      case "TERMINE":
        return `Terminé le ${formatDate(tache.date_fin)}`;
      default:
        return "";
    }
  };

  const progress = tache.heures_estimees && tache.heures_estimees > 0
    ? Math.min(100, Math.round(((tache.heures_realisees || 0) / tache.heures_estimees) * 100))
    : 0;

  const hasProgress = tache.heures_estimees && tache.heures_estimees > 0;

  // Border color based on status
  const getBorderColor = () => {
    switch (computedStatus) {
      case "EN_RETARD":
        return "border-l-red-500";
      case "EN_COURS":
        return "border-l-amber-500";
      case "TERMINE":
        return "border-l-green-500";
      default:
        return "border-l-blue-500";
    }
  };

  // Progress bar color based on status
  const getProgressColor = () => {
    switch (computedStatus) {
      case "EN_RETARD":
        return "bg-red-500";
      case "EN_COURS":
        return "bg-amber-500";
      case "TERMINE":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 bg-card border-l-4 ${getBorderColor()} group`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {tache.nom}
          </h4>
          {computedStatus === "EN_RETARD" && (
            <Badge variant="destructive" className="text-xs shrink-0 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Retard
            </Badge>
          )}
        </div>

        {/* Date info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{getDateMessage()}</span>
        </div>

        {/* Hours info if available */}
        {hasProgress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{tache.heures_realisees || 0}h / {tache.heures_estimees}h estimées</span>
          </div>
        )}

        {/* Progress bar */}
        {hasProgress && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Progression</span>
              <span className={`font-semibold ${progress >= 100 ? 'text-green-600' : progress > 50 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                {progress}%
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-2 bg-muted/50" 
              indicatorClassName={getProgressColor()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
