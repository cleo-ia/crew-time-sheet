import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChantierDetail } from "@/hooks/useChantierDetail";

interface ChantierDetailHeaderProps {
  chantier: ChantierDetail;
  onImageClick?: () => void;
}

export const ChantierDetailHeader = ({ chantier, onImageClick }: ChantierDetailHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Déterminer le chemin de retour en fonction de la route actuelle
  const isFromConducteurRoute = location.pathname.startsWith("/chantiers/");
  const backPath = isFromConducteurRoute ? "/chantiers" : "/admin?tab=chantiers";
  const backLabel = isFromConducteurRoute ? "Retour aux chantiers" : "Retour aux chantiers";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
  };

  const title = chantier.nom;
  const startDate = formatDate(chantier.date_debut);
  const endDate = formatDate(chantier.date_fin);

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(backPath)}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>

      {/* Header card */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex gap-0">
            {/* Image/Icon - Clickable */}
            <div
              onClick={onImageClick}
              className="w-36 h-36 md:w-40 md:h-40 bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer group relative"
            >
              {chantier.cover_image ? (
                <>
                  <img
                    src={chantier.cover_image}
                    alt={chantier.nom}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-xs font-medium">Modifier</span>
                  </div>
                </>
              ) : (
                <>
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-xs font-medium">Modifier</span>
                  </div>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-5 flex flex-col justify-center space-y-3">
              {/* Title row */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{title || chantier.nom}</h1>
                {chantier.code_chantier && (
                  <span className="text-base md:text-lg text-muted-foreground font-medium">
                    ({chantier.code_chantier})
                  </span>
                )}
                <Badge 
                  variant={chantier.actif ? "default" : "secondary"}
                  className={chantier.actif ? "bg-primary/90 hover:bg-primary" : ""}
                >
                  {chantier.actif ? "En cours" : "Terminé"}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {(startDate || endDate) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary/70" />
                    <span>
                      {startDate && endDate
                        ? `${startDate} → ${endDate}`
                        : startDate
                        ? `Début: ${startDate}`
                        : `Fin: ${endDate}`}
                    </span>
                  </div>
                )}

                {chantier.ville && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary/70" />
                    <span>{chantier.ville}</span>
                  </div>
                )}
              </div>

              {/* Client */}
              {chantier.client && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</span>
                  <span className="text-sm font-medium text-foreground">{chantier.client}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
