import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays, MapPin } from "lucide-react";
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

  const statusColor = chantier.actif ? 'amber' : 'green';

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin?tab=chantiers")}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux chantiers
      </Button>

      {/* Header card with refined design */}
      <div className="relative">
        {/* Main card */}
        <div className={`
          relative overflow-hidden rounded-xl
          bg-gradient-to-br from-card via-card to-muted/30
          border border-border/60
          shadow-lg shadow-black/5
          dark:shadow-black/20
        `}>
          {/* Subtle decorative element */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 ${
            chantier.actif ? 'bg-amber-400' : 'bg-green-400'
          }`} />
          
          <div className="relative flex gap-0">
            {/* Image/Icon - Clickable */}
            <div
              onClick={onImageClick}
              className={`
                w-36 h-36 md:w-44 md:h-44 
                bg-muted/50 
                flex items-center justify-center 
                overflow-hidden flex-shrink-0 
                cursor-pointer group relative
                border-r border-border/30
              `}
            >
              {chantier.cover_image ? (
                <>
                  <img
                    src={chantier.cover_image}
                    alt={chantier.nom}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-center pb-4 transition-opacity duration-300">
                    <span className="text-white text-xs font-medium px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                      Modifier
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Building2 className="h-14 w-14 text-muted-foreground/50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-center pb-4 transition-opacity duration-300">
                    <span className="text-white text-xs font-medium px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                      Ajouter
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-5 md:p-6 flex flex-col justify-center space-y-4">
              {/* Title row */}
              <div className="flex items-start gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                      {title || chantier.nom}
                    </h1>
                    {chantier.code_chantier && (
                      <span className="text-sm md:text-base text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
                        {chantier.code_chantier}
                      </span>
                    )}
                  </div>
                </div>
                <Badge 
                  className={`
                    ml-auto shrink-0
                    ${chantier.actif 
                      ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' 
                      : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                    }
                    border font-medium
                  `}
                >
                  {chantier.actif ? "En cours" : "Terminé"}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {(startDate || endDate) && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`p-1.5 rounded-md ${chantier.actif ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                      <CalendarDays className={`h-3.5 w-3.5 ${chantier.actif ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
                    </div>
                    <span className="text-muted-foreground">
                      {startDate && endDate
                        ? `${startDate} → ${endDate}`
                        : startDate
                        ? `Début: ${startDate}`
                        : `Fin: ${endDate}`}
                    </span>
                  </div>
                )}

                {chantier.ville && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`p-1.5 rounded-md ${chantier.actif ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                      <MapPin className={`h-3.5 w-3.5 ${chantier.actif ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
                    </div>
                    <span className="text-muted-foreground">{chantier.ville}</span>
                  </div>
                )}
              </div>

              {/* Client */}
              {chantier.client && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Client</span>
                  <div className="h-px flex-1 max-w-8 bg-border/50" />
                  <span className="text-sm font-medium text-foreground">{chantier.client}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
