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
import { EditableTextCell } from "@/components/rh/EditableTextCell";
import { useUpdateFicheJour } from "@/hooks/useUpdateFicheJour";
import { useUpdateCodeTrajetBatch } from "@/hooks/useUpdateCodeTrajetBatch";
import { CodeTrajetSelector } from "@/components/timesheet/CodeTrajetSelector";

interface RHEmployeeDetailProps {
  salarieId: string;
  filters: any;
  onBack: () => void;
}

export const RHEmployeeDetail = ({ salarieId, filters, onBack }: RHEmployeeDetailProps) => {
  const { data, isLoading } = useRHEmployeeDetail(salarieId, filters);
  const updateFicheJour = useUpdateFicheJour();
  const batchUpdateTrajet = useUpdateCodeTrajetBatch();

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col items-center justify-center p-5 rounded-lg bg-muted/40 border border-border/40">
            <Clock className="h-7 w-7 text-primary mb-2" />
            <p className="text-3xl font-bold text-foreground">{data.summary.totalHeures}h</p>
            <p className="text-xs text-muted-foreground mt-1">Total Heures</p>
          </div>
          <div className="flex flex-col items-center justify-center p-5 rounded-lg bg-muted/40 border border-border/40">
            <CloudRain className="h-7 w-7 text-blue-500 mb-2" />
            <p className="text-3xl font-bold text-foreground">{data.summary.totalIntemperies}h</p>
            <p className="text-xs text-muted-foreground mt-1">Intempéries</p>
          </div>
          <div className="flex flex-col items-center justify-center p-5 rounded-lg bg-muted/40 border border-border/40">
            <Coffee className="h-7 w-7 text-orange-500 mb-2" />
            <p className="text-3xl font-bold text-foreground">{data.summary.totalPaniers}</p>
            <p className="text-xs text-muted-foreground mt-1">Paniers</p>
          </div>
          <div className="flex flex-col items-center justify-center p-5 rounded-lg bg-muted/40 border border-border/40">
            <Car className="h-7 w-7 text-green-500 mb-2" />
            <p className="text-3xl font-bold text-foreground">{data.summary.totalTrajets}</p>
            <p className="text-xs text-muted-foreground mt-1">Trajets</p>
          </div>
        </div>
      </Card>

      {/* Daily Details Table */}
      <Card className="shadow-md border-border/40 overflow-hidden">
        <div className="p-6 border-b border-border/40 bg-muted/20">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Détail jour par jour
          </h3>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="font-semibold py-3 px-4 bg-muted text-foreground">Date</TableHead>
                <TableHead className="font-semibold py-3 px-4 bg-muted text-foreground">Chantier</TableHead>
                <TableHead className="text-center py-3 px-4 bg-orange-100 dark:bg-orange-900/20 text-foreground">H. Normales</TableHead>
                <TableHead className="text-center py-3 px-4 bg-orange-100 dark:bg-orange-900/20 text-foreground">Intempéries</TableHead>
                <TableHead className="font-semibold py-3 px-4 bg-orange-100 dark:bg-orange-900/20 text-foreground">Type d'absence</TableHead>
                <TableHead className="text-center py-3 px-4 bg-green-100 dark:bg-green-900/20 text-foreground">Panier</TableHead>
                <TableHead className="text-center py-3 px-4 bg-amber-100 dark:bg-amber-900/20 text-foreground">Trajet</TableHead>
                <TableHead className="text-center py-3 px-4 bg-amber-100 dark:bg-amber-900/20 text-foreground">Trajet Perso</TableHead>
                <TableHead className="font-semibold py-3 px-4 bg-purple-200 dark:bg-purple-900/30 text-foreground">Régularisation M-1</TableHead>
                <TableHead className="font-semibold py-3 px-4 bg-purple-100 dark:bg-purple-900/20 text-foreground">Autres éléments</TableHead>
                <TableHead className="font-semibold py-3 px-4 bg-blue-100 dark:bg-blue-900/20 text-foreground">Commentaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.dailyDetails.map((day, idx) => {
                const isAbsent = day.heuresNormales === 0 && day.heuresIntemperies === 0;
                
                // Calculer les autres jours sur le même chantier qui n'ont pas encore de code_trajet défini
                const sameSiteDays = data.dailyDetails.filter(
                  d => d.chantier === day.chantier && 
                       d.ficheJourId !== day.ficheJourId &&
                       (!((d as any).codeTrajet) || (d as any).codeTrajet === 'A_COMPLETER')
                );
                
                const batchFicheJourIds = [day.ficheJourId, ...sameSiteDays.map(d => d.ficheJourId)];
                const batchDaysCount = batchFicheJourIds.length;

                return (
                <TableRow 
                  key={idx} 
                  className={`
                    transition-colors duration-150
                    hover:bg-muted/30
                    ${idx % 2 === 0 ? 'bg-muted/5' : ''}
                    ${isAbsent ? 'bg-red-50/30 dark:bg-red-950/10' : ''}
                  `}
                >
                  <TableCell className="font-medium py-4 px-4">
                    {format(new Date(day.date), "EEE dd MMM", { locale: fr })}
                  </TableCell>
                  <TableCell className="py-4 px-4">{day.chantier}</TableCell>
                  <TableCell className="text-center py-4 px-4">
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
                  <TableCell className="text-center py-4 px-4">
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
                  <TableCell className="py-4 px-4">
                    <EditableAbsenceTypeCell
                      value={(day as any).typeAbsence || null}
                      isAbsent={day.heuresNormales === 0 && day.heuresIntemperies === 0}
                      allDays={data.dailyDetails.map(d => ({
                        date: d.date,
                        ficheJourId: d.ficheJourId,
                        heuresNormales: d.heuresNormales,
                        heuresIntemperies: d.heuresIntemperies,
                        typeAbsence: (d as any).typeAbsence || null,
                      }))}
                      currentDate={day.date}
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "type_absence",
                          value: newValue,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center py-4 px-4">
                    <EditableCell
                      value={day.panier}
                      type="checkbox"
                      disabled={isAbsent}
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "PA",
                          value: newValue as boolean,
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center py-4 px-4">
                    <CodeTrajetSelector
                      value={(day as any).codeTrajet || null}
                      onChange={async (value) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "code_trajet",
                          value: value || null,
                        });
                      }}
                      onBatchChange={async (value) => {
                        await batchUpdateTrajet.mutateAsync({
                          ficheJourIds: batchFicheJourIds,
                          codeTrajet: value,
                        });
                      }}
                      batchDaysCount={batchDaysCount}
                      chantierName={day.chantier}
                      disabled={false}
                      hasHours={day.heuresNormales > 0}
                    />
                  </TableCell>
                  <TableCell className="text-center py-4 px-4">
                    <EditableCell
                      value={day.trajetPerso}
                      type="checkbox"
                      disabled={isAbsent}
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
                  <TableCell className="py-4 px-4">
                    <EditableTextCell
                      value={(day as any).regularisationM1 || ""}
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "regularisation_m1",
                          value: newValue,
                        });
                      }}
                      placeholder="Note de régularisation..."
                    />
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <EditableTextCell
                      value={(day as any).autresElements || ""}
                      onSave={async (newValue) => {
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "autres_elements",
                          value: newValue,
                        });
                      }}
                      placeholder="Note..."
                    />
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="text-sm text-muted-foreground max-w-xs">
                      {(day as any).commentaire || "-"}
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
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
