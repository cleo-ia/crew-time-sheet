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
        <Card key={period.id} className="p-6 bg-gradient-to-br from-background to-muted/20">
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
            {/* Salariés - Bleu pastel */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Salariés</span>
              </div>
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{period.salaries}</p>
            </div>

            {/* Fiches - Indigo pastel */}
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium">Fiches</span>
              </div>
              <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{period.fiches}</p>
            </div>

            {/* Chantiers - Slate pastel */}
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium">Chantiers</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{period.nbChantiers}</p>
            </div>

            {/* Heures normales - Teal pastel */}
            <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">H. Normales</span>
              </div>
              <p className="text-lg font-semibold text-teal-900 dark:text-teal-100">{period.totalHeuresNormales}h</p>
            </div>

            {/* Heures supp - Amber pastel */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">H. Supp</span>
              </div>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-200">{period.totalHeuresSupp}h</p>
              {(period.totalHeuresSupp25 > 0 || period.totalHeuresSupp50 > 0) && (
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  {period.totalHeuresSupp25}h à 25% / {period.totalHeuresSupp50}h à 50%
                </p>
              )}
            </div>

            {/* Absences - Rose pastel */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                <CalendarX className="h-4 w-4" />
                <span className="text-xs font-medium">Absences</span>
              </div>
              <p className="text-lg font-semibold text-rose-900 dark:text-rose-100">{period.totalAbsences}j</p>
            </div>

            {/* Intempéries - Cyan pastel */}
            <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1">
                <Umbrella className="h-4 w-4" />
                <span className="text-xs font-medium">Intempéries</span>
              </div>
              <p className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">{period.totalIntemperies}h</p>
            </div>

            {/* Paniers - Orange pastel */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                <Coffee className="h-4 w-4" />
                <span className="text-xs font-medium">Paniers</span>
              </div>
              <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">{period.totalPaniers}</p>
            </div>

            {/* Trajets - Violet pastel */}
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
                <Car className="h-4 w-4" />
                <span className="text-xs font-medium">Trajets</span>
              </div>
              <p className="text-lg font-semibold text-violet-900 dark:text-violet-100">{period.totalTrajets}</p>
            </div>

            {/* Total Heures - Emerald accentué */}
            <div className="bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Total Heures</span>
              </div>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{period.totalHeures}h</p>
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
