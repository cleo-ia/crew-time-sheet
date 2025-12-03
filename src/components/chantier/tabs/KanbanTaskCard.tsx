import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
        return "Terminé";
      default:
        return "";
    }
  };

  const progress = tache.heures_estimees && tache.heures_estimees > 0
    ? Math.min(100, Math.round(((tache.heures_realisees || 0) / tache.heures_estimees) * 100))
    : 0;

  const hasProgress = tache.heures_estimees && tache.heures_estimees > 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow bg-card"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Badge En retard */}
        {computedStatus === "EN_RETARD" && (
          <Badge variant="destructive" className="text-xs">
            En retard
          </Badge>
        )}

        {/* Nom de la tâche */}
        <h4 className="font-medium text-sm leading-tight">{tache.nom}</h4>

        {/* Message de date */}
        <p className="text-xs text-muted-foreground">{getDateMessage()}</p>

        {/* Barre de progression */}
        {hasProgress && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Progression</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" indicatorClassName="bg-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
