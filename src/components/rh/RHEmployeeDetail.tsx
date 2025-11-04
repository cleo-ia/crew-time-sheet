import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { ArrowLeft, User, Calendar, Clock, Coffee, Car, CloudRain, Building2, UserX, CarFront, FileEdit, FileText, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRHEmployeeDetail } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EditableCell } from "@/components/rh/EditableCell";
import { EditableAbsenceTypeCell } from "@/components/rh/EditableAbsenceTypeCell";
import { EditableTextCell } from "@/components/rh/EditableTextCell";
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
              <TableRow className="bg-muted/50 border-b-2 border-border">
                <TableHead className="font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>Date</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Date du jour</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span>Chantier</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Chantier affecté</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>H. Normales</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Heures normales travaillées</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <CloudRain className="h-4 w-4 text-blue-500" />
                          <span>Intempéries</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Heures d'intempéries</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <UserX className="h-4 w-4 text-orange-500" />
                          <span>Type d'absence</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Type d'absence (CP, Maladie, etc.)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <Coffee className="h-4 w-4 text-orange-500" />
                          <span>Panier</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Indemnité panier repas</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <Car className="h-4 w-4 text-green-500" />
                          <span>Trajet</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Trajet entreprise</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2">
                          <CarFront className="h-4 w-4 text-purple-500" />
                          <span>Trajet Perso</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Trajet personnel</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <FileEdit className="h-4 w-4 text-amber-500" />
                          <span>Régularisation M-1</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Notes de régularisation du mois précédent</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span>Autres éléments</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Notes diverses pour RH</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.dailyDetails.map((day, idx) => {
                const isAbsent = day.heuresNormales === 0 && day.heuresIntemperies === 0;
                const hasRegularisation = (day as any).regularisationM1?.trim();
                const hasAutresElements = (day as any).autresElements?.trim();
                
                return (
                <TableRow 
                  key={idx} 
                  className={`
                    hover:bg-muted/30 transition-colors py-4 border-l-4
                    ${isAbsent 
                      ? 'border-l-red-500 bg-red-50/30 dark:bg-red-950/10' 
                      : 'border-l-green-500 bg-green-50/20 dark:bg-green-950/10'
                    }
                  `}
                >
                  <TableCell className="font-medium py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">
                        {format(new Date(day.date), "dd MMM yyyy", { locale: fr })}
                      </span>
                      <Badge variant="outline" className="w-fit text-xs">
                        {format(new Date(day.date), "EEEE", { locale: fr })}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{day.chantier}</span>
                    </div>
                  </TableCell>
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
                  <TableCell className="text-center py-4">
                    {day.panier ? (
                      <div className="flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      </div>
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {day.trajet > 0 ? (
                      <div className="flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    ) : (
                      <EditableCell
                        value={day.trajet > 0}
                        type="checkbox"
                        disabled={isAbsent}
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
                    )}
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {day.trajetPerso ? (
                      <div className="flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-purple-500" />
                      </div>
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-start gap-2">
                      {hasRegularisation && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300">
                          <FileEdit className="h-3 w-3 mr-1" />
                          Note
                        </Badge>
                      )}
                      <div className="flex-1">
                        <EditableTextCell
                          value={(day as any).regularisationM1 || ""}
                          onSave={async (newValue) => {
                            await updateFicheJour.mutateAsync({
                              ficheJourId: day.ficheJourId,
                              field: "regularisation_m1",
                              value: newValue,
                            });
                          }}
                          placeholder="Ajouter une note de régularisation..."
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-start gap-2">
                      {hasAutresElements && (
                        <Badge variant="secondary" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300">
                          <FileText className="h-3 w-3 mr-1" />
                          Note
                        </Badge>
                      )}
                      <div className="flex-1">
                        <EditableTextCell
                          value={(day as any).autresElements || ""}
                          onSave={async (newValue) => {
                            await updateFicheJour.mutateAsync({
                              ficheJourId: day.ficheJourId,
                              field: "autres_elements",
                              value: newValue,
                            });
                          }}
                          placeholder="Ajouter une note..."
                        />
                      </div>
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
