import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck } from "lucide-react";
import { TransportSheet } from "@/types/transport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TransportSummaryProps {
  transportData: TransportSheet;
}

export const TransportSummary = ({ transportData }: TransportSummaryProps) => {
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
              <TableHead>Conducteur Aller</TableHead>
              <TableHead>Conducteur Retour</TableHead>
              <TableHead>Véhicule</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transportData.days.map((day, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {format(new Date(day.date), "EEE dd/MM", { locale: fr })}
                </TableCell>
                <TableCell>{day.conducteurAllerNom || "-"}</TableCell>
                <TableCell>{day.conducteurRetourNom || "-"}</TableCell>
                <TableCell>{day.immatriculation || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
