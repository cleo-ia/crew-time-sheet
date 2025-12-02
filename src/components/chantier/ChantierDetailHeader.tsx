import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ChantierDetail } from "@/hooks/useChantierDetail";

interface ChantierDetailHeaderProps {
  chantier: ChantierDetail;
}

export const ChantierDetailHeader = ({ chantier }: ChantierDetailHeaderProps) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "d MMMM yyyy", { locale: fr });
  };

  const title = [chantier.ville, chantier.nom]
    .filter(Boolean)
    .join("-")
    .toUpperCase();

  const dateRange = chantier.date_debut || chantier.date_fin
    ? `du ${formatDate(chantier.date_debut) || "?"} au ${formatDate(chantier.date_fin) || "?"}`
    : null;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin?tab=chantiers")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>

      <div className="flex items-start gap-6">
        {/* Cover Image */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {chantier.cover_image ? (
            <img
              src={chantier.cover_image}
              alt={chantier.nom}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{title || chantier.nom}</h1>
            {chantier.code_chantier && (
              <span className="text-lg text-muted-foreground font-medium">
                ({chantier.code_chantier})
              </span>
            )}
            <Badge variant={chantier.actif ? "default" : "secondary"}>
              {chantier.actif ? "En cours" : "Terminé"}
            </Badge>
          </div>

          {dateRange && (
            <p className="text-sm text-muted-foreground">{dateRange}</p>
          )}

          {chantier.client && (
            <p className="text-sm">
              <span className="text-muted-foreground">Client : </span>
              <span className="font-medium">{chantier.client}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
