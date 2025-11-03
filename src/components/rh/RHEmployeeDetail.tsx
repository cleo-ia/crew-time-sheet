import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { ArrowLeft, User, Calendar, Clock, Coffee, Car, CloudRain } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRHEmployeeDetail } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EditableCell } from "@/components/rh/EditableCell";
import { EditableAbsenceTypeCell } from "@/components/rh/EditableAbsenceTypeCell";
import { useUpdateFicheJour } from "@/hooks/useUpdateFicheJour";

interface RHEmployeeDetailProps {
  salarieId: string;
  filters: any;
  onBack: () => void;
}

export const RHEmployeeDetail = ({ salarieId, filters, onBack }: RHEmployeeDetailProps) => {
  const { data, isLoading } = useRHEmployeeDetail(salarieId, filters);
  const updateFicheJour = useUpdateFicheJour();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card className="p-6">
          <Skeleton className="h-96 w-full" />
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Aucune donnée trouvée</p>
            <p className="text-sm mt-2">Ce salarié n'a pas de données pour cette période</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              {data.salarie.nom} {data.salarie.prenom}
            </h2>
            {data.salarie.isChef ? (
              <RoleBadge role="chef" />
            ) : data.salarie.role ? (
              <>
                <RoleBadge role={data.salarie.role as any} />
                {data.salarie.role === "interimaire" && data.salarie.agence_interim && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30">
                    {data.salarie.agence_interim}
                  </Badge>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-6 shadow-md border-border/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Résumé global de la période
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/30">
            <Clock className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.summary.totalHeures}h</p>
            <p className="text-xs text-muted-foreground mt-1">Total Heures</p>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/30">
            <CloudRain className="h-6 w-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.summary.totalIntemperies}h</p>
            <p className="text-xs text-muted-foreground mt-1">Intempéries</p>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/30">
            <Coffee className="h-6 w-6 text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.summary.totalPaniers}</p>
            <p className="text-xs text-muted-foreground mt-1">Paniers</p>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/30">
            <Car className="h-6 w-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.summary.totalTrajets}</p>
            <p className="text-xs text-muted-foreground mt-1">Trajets</p>
          </div>
        </div>
      </Card>

      {/* Daily Details Table */}
      <Card className="shadow-md border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/20">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Détail jour par jour
          </h3>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Chantier</TableHead>
                <TableHead className="text-center">H. Normales</TableHead>
                <TableHead className="text-center">Intempéries</TableHead>
                <TableHead className="font-semibold">Type d'absence</TableHead>
                <TableHead className="text-center">Panier</TableHead>
                <TableHead className="text-center">Trajet</TableHead>
                <TableHead className="text-center">Trajet Perso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.dailyDetails.map((day, idx) => (
                <TableRow key={idx} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    {format(new Date(day.date), "EEE dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>{day.chantier}</TableCell>
                  <TableCell className="text-center">
                    <EditableCell
                      value={day.heuresNormales}
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      unit="h"
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "HNORM",
                          value: newValue as number,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {day.heuresIntemperies > 0 || day.ficheJourId ? (
                      <EditableCell
                        value={day.heuresIntemperies}
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        unit="h"
                        onSave={async (newValue) => {
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "HI",
                            value: newValue as number,
                          });
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EditableAbsenceTypeCell
                      value={(day as any).typeAbsence || null}
                      heuresAbsence={day.heuresIntemperies}
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "type_absence",
                          value: newValue,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <EditableCell
                      value={day.panier}
                      type="checkbox"
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "PA",
                          value: newValue as boolean,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <EditableCell
                      value={day.trajet > 0}
                      type="checkbox"
                      onSave={async (checked) => {
                        if (checked) {
                          // Si on coche "Trajet", on décoche "Trajet Perso"
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "T",
                            value: 1,
                          });
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "trajet_perso",
                            value: false,
                          });
                        } else {
                          // Si on décoche "Trajet", on met juste à 0
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "T",
                            value: 0,
                          });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <EditableCell
                      value={day.trajetPerso}
                      type="checkbox"
                      onSave={async (checked) => {
                        if (checked) {
                          // Si on coche "Trajet Perso", on décoche "Trajet"
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "trajet_perso",
                            value: true,
                          });
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "T",
                            value: 0,
                          });
                        } else {
                          // Si on décoche "Trajet Perso", on met juste à false
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "trajet_perso",
                            value: false,
                          });
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {data.dailyDetails.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune donnée à afficher</p>
          <p className="text-sm mt-2">Aucun jour saisi pour cette période</p>
        </div>
      )}
    </div>
  );
};
