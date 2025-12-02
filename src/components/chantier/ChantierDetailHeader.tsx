import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChantierDetail } from "@/hooks/useChantierDetail";

interface ChantierDetailHeaderProps {
  chantier: ChantierDetail;
  onImageClick?: () => void;
}

export const ChantierDetailHeader = ({ chantier, onImageClick }: ChantierDetailHeaderProps) => {
  const navigate = useNavigate();

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
        onClick={() => navigate("/admin?tab=chantiers")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux chantiers
      </Button>

      {/* Header content */}
      <div className="flex gap-6 items-start">
        {/* Image/Icon - Clickable */}
        <div
          onClick={onImageClick}
          className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
        >
          {chantier.cover_image ? (
            <div className="relative w-full h-full">
              <img
                src={chantier.cover_image}
                alt={chantier.nom}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-medium">Modifier</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-medium">Modifier</span>
              </div>
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

          {(startDate || endDate) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {startDate && endDate
                  ? `${startDate} → ${endDate}`
                  : startDate
                  ? `Début: ${startDate}`
                  : `Fin: ${endDate}`}
              </span>
            </div>
          )}

          {chantier.client && (
            <p className="text-muted-foreground">Client: {chantier.client}</p>
          )}
        </div>
      </div>
    </div>
  );
};
