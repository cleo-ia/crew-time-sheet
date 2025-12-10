import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Lock, Users, FileText, Building2, Clock, Umbrella, Coffee, Car, CalendarX } from "lucide-react";
import { useRHHistorique } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RHHistoriqueProps {
  filters: any;
  onSelectFiche: (id: string) => void;
}

export const RHHistorique = ({ filters, onSelectFiche }: RHHistoriqueProps) => {
  const { data: closedPeriods = [], isLoading } = useRHHistorique(filters);

  // Formater le nom du mois
  const formatPeriode = (periode: string) => {
    if (!periode || !periode.includes("-")) return periode;
    const [year, month] = periode.split("-").map(Number);
    if (isNaN(year) || isNaN(month)) return periode;
    const date = new Date(year, month - 1, 1);
    return format(date, "MMMM yyyy", { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-32 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {closedPeriods.map((period) => (
        <Card key={period.id} className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-foreground capitalize">
                {formatPeriode(period.periode)}
              </h3>
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" />
                Clôturée
              </Badge>
            </div>
            <Button variant="outline" onClick={() => onSelectFiche(`periode___${period.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Consulter
            </Button>
          </div>

          {/* Meta info */}
          <div className="text-sm text-muted-foreground mb-4">
            Clôturée le {new Date(period.dateCloture).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
            {period.clotureeParNom && ` par ${period.clotureeParNom}`}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Salariés */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Salariés</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.salaries}</p>
            </div>

            {/* Fiches */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs">Fiches</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.fiches}</p>
            </div>

            {/* Chantiers */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="h-4 w-4" />
                <span className="text-xs">Chantiers</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.nbChantiers}</p>
            </div>

            {/* Heures normales */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">H. Normales</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.totalHeuresNormales}h</p>
            </div>

            {/* Heures supp */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">H. Supp</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.totalHeuresSupp}h</p>
              {(period.totalHeuresSupp25 > 0 || period.totalHeuresSupp50 > 0) && (
                <p className="text-xs text-muted-foreground">
                  {period.totalHeuresSupp25}h à 25% / {period.totalHeuresSupp50}h à 50%
                </p>
              )}
            </div>

            {/* Absences */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CalendarX className="h-4 w-4" />
                <span className="text-xs">Absences</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.totalAbsences}j</p>
            </div>

            {/* Intempéries */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Umbrella className="h-4 w-4" />
                <span className="text-xs">Intempéries</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.totalIntemperies}h</p>
            </div>

            {/* Paniers */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Coffee className="h-4 w-4" />
                <span className="text-xs">Paniers</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.totalPaniers}</p>
            </div>

            {/* Trajets */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Car className="h-4 w-4" />
                <span className="text-xs">Trajets</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{period.totalTrajets}</p>
            </div>

            {/* Total Heures */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--theme-consultation-rh) / 0.3)', borderColor: 'hsl(var(--theme-consultation-rh) / 0.7)' }}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Total Heures</span>
              </div>
              <p className="text-lg font-bold text-foreground">{period.totalHeures}h</p>
            </div>
          </div>

          {/* Trajets par code (si disponibles) */}
          {period.trajetsParCode && Object.keys(period.trajetsParCode).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Détail trajets :</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(period.trajetsParCode)
                  .filter(([code]) => code !== "A_COMPLETER")
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([code, count]) => (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {code}: {count}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Motif si présent */}
          {period.motif && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Commentaire :</p>
              <p className="text-sm text-foreground">{period.motif}</p>
            </div>
          )}
        </Card>
      ))}

      {closedPeriods.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Aucune période clôturée</p>
          <p className="text-sm mt-2">L'historique apparaîtra ici après clôture d'un mois</p>
        </div>
      )}
    </div>
  );
};
