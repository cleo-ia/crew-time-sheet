import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TransportSummaryV2Props {
  transportData: any;
}

export const TransportSummaryV2 = ({ transportData }: TransportSummaryV2Props) => {
  if (!transportData?.days || transportData.days.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-primary" />
            Récapitulatif Trajet
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aucune fiche de trajet enregistrée pour cette semaine.
        </CardContent>
      </Card>
    );
  }

  // Détecter le format des données
  const isV2Format = transportData.days?.[0]?.vehicules !== undefined;

  // Grouper les données par date avec code chantier
  const groupedByDate = new Map<string, { codeChantier: string; vehicules: any[] }>();

  if (isV2Format) {
    // Format V2 : { days: [{date, vehicules: []}] }
    transportData.days.forEach((day: any) => {
      groupedByDate.set(day.date, {
        codeChantier: "-",
        vehicules: day.vehicules || []
      });
    });
  } else {
    // Format V1 : { days: [{date, conducteurAllerId, ...}] }
    transportData.days.forEach((day: any) => {
      if (!groupedByDate.has(day.date)) {
        groupedByDate.set(day.date, {
          codeChantier: day.codeChantierDuJour || "-",
          vehicules: []
        });
      }
      groupedByDate.get(day.date)!.vehicules.push({
        immatriculation: day.immatriculation,
        conducteurMatinNom: day.conducteurAllerNom,
        conducteurSoirNom: day.conducteurRetourNom,
      });
    });
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="h-5 w-5 text-primary" />
          Récapitulatif Trajet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Code Chantier</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Conducteur Matin</TableHead>
              <TableHead>Conducteur Soir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(groupedByDate.entries()).map(([date, dayData]) => {
              if (dayData.vehicules.length === 0) {
                return (
                  <TableRow key={date}>
                    <TableCell className="font-medium capitalize">
                      {format(new Date(date), "EEE dd/MM", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {dayData.codeChantier}
                    </TableCell>
                    <TableCell colSpan={3} className="text-muted-foreground italic">
                      Aucun véhicule
                    </TableCell>
                  </TableRow>
                );
              }

              // Consolider les véhicules par immatriculation (fusionner matin et soir)
              const consolidatedVehicules = dayData.vehicules.reduce((acc: any[], vehicule: any) => {
                const existing = acc.find(v => v.immatriculation === vehicule.immatriculation);
                if (existing) {
                  // Fusionner les infos matin et soir
                  if (vehicule.conducteurMatinNom) {
                    existing.conducteurMatinNom = vehicule.conducteurMatinNom;
                  }
                  if (vehicule.conducteurSoirNom) {
                    existing.conducteurSoirNom = vehicule.conducteurSoirNom;
                  }
                } else {
                  acc.push({ ...vehicule });
                }
                return acc;
              }, []);

              return consolidatedVehicules.map((vehicule, index) => (
                <TableRow key={`${date}-${index}`}>
                  {index === 0 && (
                    <>
                      <TableCell
                        className="font-medium capitalize"
                        rowSpan={consolidatedVehicules.length}
                      >
                        {format(new Date(date), "EEE dd/MM", { locale: fr })}
                      </TableCell>
                      <TableCell
                        className="font-medium text-sm"
                        rowSpan={consolidatedVehicules.length}
                      >
                        {dayData.codeChantier}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="font-mono text-sm">
                    {vehicule.immatriculation || "-"}
                  </TableCell>
                  <TableCell>
                    {vehicule.conducteurMatinNom || "-"}
                  </TableCell>
                  <TableCell>
                    {vehicule.conducteurSoirNom || "-"}
                  </TableCell>
                </TableRow>
              ));
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
