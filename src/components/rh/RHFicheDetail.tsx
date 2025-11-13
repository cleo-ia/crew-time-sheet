import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion } from "@/components/ui/accordion";
import { ArrowLeft, Calendar, Users, Clock, Package, Truck, CloudRain } from "lucide-react";
import { useRHFicheDetail } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransportByChantier } from "@/hooks/useTransportByChantier";
import { TransportSummaryV2 } from "@/components/transport/TransportSummaryV2";
import { RHEmployeeAccordion } from "./RHEmployeeAccordion";
import { useUpdateFicheJour } from "@/hooks/useUpdateFicheJour";

interface RHFicheDetailProps {
  ficheId: string;
  onBack: () => void;
}

export const RHFicheDetail = ({ ficheId, onBack }: RHFicheDetailProps) => {
  const { data, isLoading } = useRHFicheDetail(ficheId);
  const updateFicheJour = useUpdateFicheJour();
  
  // Extract chantierId and semaine from ficheId
  const [chantierId, semaine] = ficheId.includes("___")
    ? ficheId.split("___")
    : ficheId.includes("_")
      ? ficheId.split("_")
      : [null, null];
  
  // Fetch transport data
  const { data: transportData } = useTransportByChantier(chantierId, semaine);
  console.log("[RHFicheDetail]", { ficheId, chantierId, semaine, transportDays: transportData?.days?.length });

  // Grouper les jours par salarié
  const joursBySalarie = useMemo(() => {
    if (!data?.detailJours) return new Map();
    
    const grouped = new Map<string, typeof data.detailJours>();
    
    data.detailJours.forEach(jour => {
      const salarieId = jour.salarieId;
      if (!grouped.has(salarieId)) {
        grouped.set(salarieId, []);
      }
      grouped.get(salarieId)!.push(jour);
    });
    
    return grouped;
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucune donnée trouvée</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      {/* Chantier Info Card */}
      <Card className="p-6 border-border/50">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{data.chantier}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Semaine {data.semaine}
              </span>
              <span>Chef: {data.chef}</span>
            </div>
          </div>

          {/* Global Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Maçons</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{data.totalMacons}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Heures totales</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{data.totalHeures}h</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs">Paniers</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{data.totalPaniers}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Truck className="h-4 w-4" />
                <span className="text-xs">Trajets</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{data.totalTrajets}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <CloudRain className="h-4 w-4" />
                <span className="text-xs">Intempéries</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{data.totalIntemperics}h</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Récapitulatif par salarié avec accordéons éditables */}
      <Card className="p-6 border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Récapitulatif par salarié</h3>
        
        <Accordion type="multiple" className="w-full">
          {data.recapSalaries.map(salarie => {
            const joursSalarie = joursBySalarie.get(salarie.id) || [];
            
            return (
              <RHEmployeeAccordion
                key={salarie.id}
                employee={{
                  id: salarie.id,
                  nom: salarie.nom,
                  role: salarie.role || "macon",
                  isChef: salarie.isChef || false,
                  totalHeures: salarie.totalHeures,
                  totalIntemperics: salarie.totalIntemperics,
                  totalPaniers: salarie.paniers,
                  totalTrajets: salarie.trajets,
                  totalTrajetsPerso: salarie.trajetsPerso,
                }}
                joursSalarie={joursSalarie.map(jour => ({
                  ficheJourId: jour.ficheJourId,
                  date: jour.date,
                  dateISO: jour.dateISO,
                  heuresNormales: jour.heuresNormales,
                  heuresIntemperics: jour.heuresIntemperics,
                  panier: jour.panier,
                  trajet: jour.trajet,
                  trajetPerso: jour.trajetPerso,
                  commentaire: jour.commentaire || "",
                }))}
              />
            );
          })}
        </Accordion>
      </Card>

      {/* Daily Detail Table (lecture seule) */}
      <Card className="p-6 border-border/50">
        <h3 className="text-lg font-semibold text-muted-foreground mb-4">Détail jour par jour (lecture seule)</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Salarié</TableHead>
                <TableHead className="text-right">Heures normales</TableHead>
                <TableHead className="text-right">Intempéries</TableHead>
                <TableHead className="text-center">Panier repas</TableHead>
                <TableHead className="text-center">Trajet</TableHead>
                <TableHead className="text-center">Trajet Perso</TableHead>
                <TableHead className="text-left">Commentaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.detailJours.map((jour, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{jour.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {jour.salarie}
                      {jour.isChef ? (
                        <RoleBadge role="chef" size="sm" />
                      ) : jour.role ? (
                        <RoleBadge role={jour.role as any} size="sm" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{jour.heuresNormales}h</TableCell>
                  <TableCell className="text-right">{jour.heuresIntemperics}h</TableCell>
                  <TableCell className="text-center">{jour.panier ? "✓" : "-"}</TableCell>
                  <TableCell className="text-center">{jour.trajet}</TableCell>
                  <TableCell className="text-center">{jour.trajetPerso ? "✓" : "-"}</TableCell>
                  <TableCell className="text-left text-sm text-muted-foreground">{jour.commentaire || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Transport Summary */}
      <TransportSummaryV2 transportData={transportData} />
    </div>
  );
};
