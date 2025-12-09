import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { ArrowLeft, Lock, Users, FileText, Building2, Clock, Umbrella, Coffee, Car, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildRHConsolidation } from "@/hooks/rhShared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RHPeriodeDetailProps {
  periodeId: string;
  onBack: () => void;
  onSelectEmployee: (id: string) => void;
}

export const RHPeriodeDetail = ({ periodeId, onBack, onSelectEmployee }: RHPeriodeDetailProps) => {
  // Récupérer les infos de la période clôturée
  const { data: periode, isLoading: isLoadingPeriode } = useQuery({
    queryKey: ["periode-cloturee", periodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodes_cloturees")
        .select(`
          *,
          cloturee_par_user:utilisateurs!periodes_cloturees_cloturee_par_fkey(prenom, nom)
        `)
        .eq("id", periodeId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Récupérer les données consolidées pour cette période
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["rh-periode-detail-employees", periode?.periode],
    enabled: !!periode?.periode,
    queryFn: async () => {
      const result = await buildRHConsolidation({
        periode: periode.periode,
        semaine: "all",
        conducteur: "all",
        chantier: "all",
        chef: "all",
        salarie: "all",
        typeSalarie: "all",
      });
      return result;
    }
  });

  const formatPeriode = (periodeStr: string) => {
    if (!periodeStr || !periodeStr.includes("-")) return periodeStr;
    const [year, month] = periodeStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month)) return periodeStr;
    const date = new Date(year, month - 1, 1);
    return format(date, "MMMM yyyy", { locale: fr });
  };

  const isLoading = isLoadingPeriode || isLoadingEmployees;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!periode) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'historique
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Période non trouvée</p>
        </div>
      </div>
    );
  }

  const clotureeParNom = periode.cloturee_par_user 
    ? `${periode.cloturee_par_user.prenom || ''} ${periode.cloturee_par_user.nom || ''}`.trim()
    : null;

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground capitalize">
              {formatPeriode(periode.periode)}
            </h2>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              <Lock className="h-3 w-3 mr-1" />
              Clôturée
            </Badge>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <p className="text-sm text-muted-foreground">
        Clôturée le {new Date(periode.date_cloture).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}
        {clotureeParNom && ` par ${clotureeParNom}`}
      </p>

      {/* Résumé global */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Résumé de la période</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Salariés</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.nb_salaries}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Fiches</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.nb_fiches}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Chantiers</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.nb_chantiers}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">H. Normales</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.total_heures_normales}h</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs">H. Supp</span>
            </div>
            <p className="text-lg font-semibold text-primary">{periode.total_heures_supp}h</p>
            {(periode.total_heures_supp_25 > 0 || periode.total_heures_supp_50 > 0) && (
              <p className="text-xs text-muted-foreground">
                {periode.total_heures_supp_25}h à 25% / {periode.total_heures_supp_50}h à 50%
              </p>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs">Absences</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.total_absences}j</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Umbrella className="h-4 w-4" />
              <span className="text-xs">Intempéries</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.total_intemperies}h</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Coffee className="h-4 w-4" />
              <span className="text-xs">Paniers</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.total_paniers}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Car className="h-4 w-4" />
              <span className="text-xs">Trajets</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{periode.total_trajets}</p>
          </div>

          <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Total Heures</span>
            </div>
            <p className="text-lg font-bold text-primary">{periode.total_heures}h</p>
          </div>
        </div>

        {/* Trajets par code */}
        {periode.trajets_par_code && Object.keys(periode.trajets_par_code).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Détail trajets :</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(periode.trajets_par_code as Record<string, number>)
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
      </Card>

      {/* Liste des salariés */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Détail par salarié ({employees.length})</h3>
        <div className="rounded-lg border border-border/50 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Salarié</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">H. Normales</TableHead>
                <TableHead className="text-center">H. Supp 25%</TableHead>
                <TableHead className="text-center">H. Supp 50%</TableHead>
                <TableHead className="text-center">Absences</TableHead>
                <TableHead className="text-center">Paniers</TableHead>
                <TableHead className="text-center">Trajets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.salarieId} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    {emp.prenom} {emp.nom}
                  </TableCell>
                  <TableCell className="text-center">
                    {emp.role && <RoleBadge role={emp.role as any} size="sm" />}
                  </TableCell>
                  <TableCell className="text-center">{emp.heuresNormales}h</TableCell>
                  <TableCell className="text-center">
                    {emp.heuresSupp25 > 0 ? `${emp.heuresSupp25}h` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {emp.heuresSupp50 > 0 ? `${emp.heuresSupp50}h` : '-'}
                  </TableCell>
                  <TableCell className="text-center">{emp.absences}j</TableCell>
                  <TableCell className="text-center">{emp.paniers}</TableCell>
                  <TableCell className="text-center">{emp.totalJoursTrajets}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onSelectEmployee(`emp___${emp.salarieId}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">Aucun salarié trouvé</p>
            <p className="text-sm mt-2">Les données de cette période ne sont plus disponibles</p>
          </div>
        )}
      </Card>
    </div>
  );
};
