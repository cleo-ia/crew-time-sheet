import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { ArrowLeft, User, Calendar, Clock, Coffee, Car, CloudRain, FileText, MapPin, ChevronRight, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRHEmployeeDetail } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState, useEffect } from "react";
import { RHWeekDetailDialog } from "@/components/rh/RHWeekDetailDialog";
import { EditableCell } from "@/components/rh/EditableCell";
import { EditableAbsenceTypeCell } from "@/components/rh/EditableAbsenceTypeCell";
import { EditableTextCell } from "@/components/rh/EditableTextCell";
import { useUpdateFicheJour } from "@/hooks/useUpdateFicheJour";
import { useUpdateCodeTrajetBatch } from "@/hooks/useUpdateCodeTrajetBatch";
import { CodeTrajetSelector } from "@/components/timesheet/CodeTrajetSelector";
import { generateEmployeePeriodPdf } from "@/lib/rhEmployeePdfExport";
import { toast } from "sonner";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
import { useLogModification } from "@/hooks/useLogModification";
import { useCurrentUserInfo } from "@/hooks/useCurrentUserInfo";

interface RHEmployeeDetailProps {
  salarieId: string;
  filters: any;
  onBack: () => void;
}

export const RHEmployeeDetail = ({ salarieId, filters, onBack }: RHEmployeeDetailProps) => {
  const { data, isLoading } = useRHEmployeeDetail(salarieId, filters);
  const updateFicheJour = useUpdateFicheJour();
  const batchUpdateTrajet = useUpdateCodeTrajetBatch();
  const logModification = useLogModification();
  const userInfo = useCurrentUserInfo();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const enterpriseConfig = useEnterpriseConfig();
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Charger le logo en base64 pour le PDF
  useEffect(() => {
    if (enterpriseConfig?.theme?.logo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL("image/png");
          setLogoBase64(dataURL);
        }
      };
      img.src = enterpriseConfig.theme.logo;
    }
  }, [enterpriseConfig?.theme?.logo]);

  // Grouper les jours par semaine
  const weeklyData = useMemo(() => {
    if (!data?.dailyDetails) return [];
    
    const weekMap = new Map<string, {
      semaine: string;
      year: number;
      weekNumber: number;
      chantiers: Set<string>;
      heuresNormales: number;
      heuresIntemperies: number;
      paniers: number;
      trajets: number;
      nbJours: number;
      absences: string[];
    }>();

    data.dailyDetails.forEach(day => {
      const dateObj = new Date(day.date);
      const weekNumber = getISOWeek(dateObj);
      const year = getISOWeekYear(dateObj);
      const semaineKey = `${year}-S${weekNumber.toString().padStart(2, '0')}`;
      
      if (!weekMap.has(semaineKey)) {
        weekMap.set(semaineKey, {
          semaine: semaineKey,
          year,
          weekNumber,
          chantiers: new Set<string>(),
          heuresNormales: 0,
          heuresIntemperies: 0,
          paniers: 0,
          trajets: 0,
          nbJours: 0,
          absences: [],
        });
      }

      const weekData = weekMap.get(semaineKey)!;
      weekData.chantiers.add(day.chantier);
      weekData.heuresNormales += day.heuresNormales || 0;
      weekData.heuresIntemperies += day.heuresIntemperies || 0;
      weekData.paniers += day.panier ? 1 : 0;
      weekData.trajets += (day as any).codeTrajet && (day as any).codeTrajet !== 'A_COMPLETER' ? 1 : 0;
      weekData.nbJours += 1;
      
      // Ne compter le type d'absence que si c'est vraiment un jour d'absence (heures normales = 0)
      const isAbsentDay = (day.heuresNormales || 0) === 0;
      if (isAbsentDay && (day as any).typeAbsence) {
        weekData.absences.push((day as any).typeAbsence);
      }
    });

    return Array.from(weekMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNumber - b.weekNumber;
    });
  }, [data?.dailyDetails]);

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

  const handleExportPdf = () => {
    try {
      generateEmployeePeriodPdf({
        salarie: data.salarie,
        dailyDetails: data.dailyDetails,
        summary: data.summary,
        signaturesBySemaine: data.signaturesBySemaine,
        periode: filters.periode || format(new Date(), "yyyy-MM"),
        // Enterprise branding
        entrepriseNom: enterpriseConfig?.nom || 'DIVA',
        entrepriseLogo: logoBase64 || undefined,
        primaryColor: enterpriseConfig?.theme?.primaryColor || '#ea580c',
      });
      toast.success("PDF exporté avec succès");
    } catch (error) {
      console.error("Erreur export PDF:", error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      {/* Weekly Summary Cards */}
      {weeklyData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Récapitulatif par semaine
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weeklyData.map((week) => (
              <Card 
                key={week.semaine} 
                className="p-4 shadow-sm border-border/50 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                onClick={() => setSelectedWeek(week.semaine)}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-sm font-semibold bg-primary/10 text-primary border-primary/30">
                    {week.semaine}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{week.nbJours} jour{week.nbJours > 1 ? 's' : ''}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                {/* Chantiers */}
                <div className="flex items-start gap-2 mb-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {Array.from(week.chantiers).map((chantier, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {chantier}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">{week.heuresNormales}h</span>
                  </div>
                  {week.heuresIntemperies > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                      <CloudRain className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{week.heuresIntemperies}h</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-2 rounded bg-orange-50 dark:bg-orange-900/20">
                    <Coffee className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{week.paniers}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
                    <Car className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{week.trajets}</span>
                  </div>
                </div>
                
                {/* Absences */}
                {week.absences.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <div className="flex flex-wrap gap-1">
                      {week.absences.map((absence, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {absence}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Daily Details Table */}
      <Card className="shadow-md border-border/40 overflow-hidden">
        <div className="p-6 border-b border-border/40 bg-muted/20 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Détail jour par jour
          </h3>
          <Button onClick={handleExportPdf} className="gap-2" size="sm">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
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
                const isAbsent = day.heuresNormales === 0;
                
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
                  <TableCell className="py-3 px-4">
                    <div className="leading-tight">
                      <div className="font-medium">{(day as any).chantierNom || day.chantier}</div>
                      {(day as any).chantierCode && (
                        <div className="text-xs text-muted-foreground">{(day as any).chantierCode}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-4 px-4">
                    <EditableCell
                      value={day.heuresNormales}
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      unit="h"
                      onSave={async (newValue) => {
                        const oldValue = day.heuresNormales;
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "HNORM",
                          value: newValue as number,
                        });
                        // Log modification (non-blocking)
                        if (userInfo) {
                          try {
                            await logModification.mutateAsync({
                              ficheId: (day as any).ficheId || null,
                              entrepriseId: userInfo.entrepriseId,
                              userId: userInfo.userId,
                              userName: userInfo.userName,
                              action: "modification_heures_normales",
                              champModifie: "HNORM",
                              ancienneValeur: String(oldValue),
                              nouvelleValeur: String(newValue),
                              details: {
                                salarie: `${data?.salarie?.prenom || ""} ${data?.salarie?.nom || ""}`.trim(),
                                date: day.date,
                                chantier: day.chantier,
                              },
                            });
                          } catch (e) { console.error("Log error:", e); }
                        }
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
                          const oldValue = day.heuresIntemperies;
                          await updateFicheJour.mutateAsync({
                            ficheJourId: day.ficheJourId,
                            field: "HI",
                            value: newValue as number,
                          });
                          // Log modification (non-blocking)
                          if (userInfo) {
                            try {
                              await logModification.mutateAsync({
                                ficheId: (day as any).ficheId || null,
                                entrepriseId: userInfo.entrepriseId,
                                userId: userInfo.userId,
                                userName: userInfo.userName,
                                action: "modification_heures_intemperies",
                                champModifie: "HI",
                                ancienneValeur: String(oldValue),
                                nouvelleValeur: String(newValue),
                                details: {
                                  salarie: `${data?.salarie?.prenom || ""} ${data?.salarie?.nom || ""}`.trim(),
                                  date: day.date,
                                  chantier: day.chantier,
                                },
                              });
                            } catch (e) { console.error("Log error:", e); }
                          }
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <EditableAbsenceTypeCell
                      value={(day as any).typeAbsence || null}
                      isAbsent={day.heuresNormales === 0}
                      allDays={data.dailyDetails.map(d => ({
                        date: d.date,
                        ficheJourId: d.ficheJourId,
                        heuresNormales: d.heuresNormales,
                        heuresIntemperies: d.heuresIntemperies,
                        typeAbsence: (d as any).typeAbsence || null,
                      }))}
                      currentDate={day.date}
                      onSave={async (newValue) => {
                        const oldValue = (day as any).typeAbsence || null;
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "type_absence",
                          value: newValue,
                        });
                        // Log modification (non-blocking)
                        if (userInfo) {
                          try {
                            await logModification.mutateAsync({
                              ficheId: (day as any).ficheId || null,
                              entrepriseId: userInfo.entrepriseId,
                              userId: userInfo.userId,
                              userName: userInfo.userName,
                              action: "modification_type_absence",
                              champModifie: "type_absence",
                              ancienneValeur: oldValue,
                              nouvelleValeur: newValue,
                              details: {
                                salarie: `${data?.salarie?.prenom || ""} ${data?.salarie?.nom || ""}`.trim(),
                                date: day.date,
                                chantier: day.chantier,
                              },
                            });
                          } catch (e) { console.error("Log error:", e); }
                        }
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
                        const oldValue = (day as any).codeTrajet || null;
                        await updateFicheJour.mutateAsync({
                          ficheJourId: day.ficheJourId,
                          field: "code_trajet",
                          value: value || null,
                        });
                        // Log modification (non-blocking)
                        if (userInfo) {
                          try {
                            await logModification.mutateAsync({
                              ficheId: (day as any).ficheId || null,
                              entrepriseId: userInfo.entrepriseId,
                              userId: userInfo.userId,
                              userName: userInfo.userName,
                              action: "modification_code_trajet",
                              champModifie: "code_trajet",
                              ancienneValeur: oldValue,
                              nouvelleValeur: value,
                              details: {
                                salarie: `${data?.salarie?.prenom || ""} ${data?.salarie?.nom || ""}`.trim(),
                                date: day.date,
                                chantier: day.chantier,
                              },
                            });
                          } catch (e) { console.error("Log error:", e); }
                        }
                      }}
                      onBatchChange={async (value) => {
                        await batchUpdateTrajet.mutateAsync({
                          ficheJourIds: batchFicheJourIds,
                          codeTrajet: value,
                        });
                        // Log batch modification (non-blocking)
                        if (userInfo) {
                          try {
                            await logModification.mutateAsync({
                              ficheId: null,
                              entrepriseId: userInfo.entrepriseId,
                              userId: userInfo.userId,
                              userName: userInfo.userName,
                              action: "modification_code_trajet_lot",
                              champModifie: "code_trajet",
                              ancienneValeur: null,
                              nouvelleValeur: value,
                              details: {
                                salarie: `${data?.salarie?.prenom || ""} ${data?.salarie?.nom || ""}`.trim(),
                                chantier: day.chantier,
                                nbJours: batchDaysCount,
                              },
                            });
                          } catch (e) { console.error("Log error:", e); }
                        }
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

      {/* Week Detail Dialog */}
      <RHWeekDetailDialog
        open={!!selectedWeek}
        onOpenChange={(open) => !open && setSelectedWeek(null)}
        semaine={selectedWeek || ""}
        days={
          selectedWeek
            ? data.dailyDetails
                .filter((day) => {
                  const dateObj = new Date(day.date);
                  const weekNumber = getISOWeek(dateObj);
                  const year = getISOWeekYear(dateObj);
                  const semaineKey = `${year}-S${weekNumber.toString().padStart(2, '0')}`;
                  return semaineKey === selectedWeek;
                })
                .map((day) => ({
                  date: day.date,
                  chantier: day.chantier,
                  heuresNormales: day.heuresNormales,
                  heuresIntemperies: day.heuresIntemperies,
                  panier: day.panier,
                  ficheJourId: day.ficheJourId,
                  codeTrajet: (day as any).codeTrajet,
                  typeAbsence: (day as any).typeAbsence,
                  trajetPerso: (day as any).trajetPerso,
                }))
            : []
        }
        signature={selectedWeek && data.signaturesBySemaine ? data.signaturesBySemaine[selectedWeek] : undefined}
        employeeName={data?.salarie ? `${data.salarie.prenom || ""} ${data.salarie.nom || ""}`.trim() : "Employé"}
      />
    </div>
  );
};
