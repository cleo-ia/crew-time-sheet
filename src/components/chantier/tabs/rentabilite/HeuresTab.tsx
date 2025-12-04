import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const mockHeures = [
  { id: "1", date: "2024-03-18", ouvrier: "Martin Dupont", tache: "Fondations", heures: 8, cout: 320 },
  { id: "2", date: "2024-03-18", ouvrier: "Jean Petit", tache: "Fondations", heures: 8, cout: 280 },
  { id: "3", date: "2024-03-19", ouvrier: "Martin Dupont", tache: "Fondations", heures: 7.5, cout: 300 },
  { id: "4", date: "2024-03-19", ouvrier: "Pierre Durand", tache: "Gros œuvre", heures: 8, cout: 320 },
  { id: "5", date: "2024-03-20", ouvrier: "Jean Petit", tache: "Gros œuvre", heures: 8, cout: 280 },
  { id: "6", date: "2024-03-20", ouvrier: "Marie Lambert", tache: "Charpente", heures: 6, cout: 270 },
  { id: "7", date: "2024-03-21", ouvrier: "Martin Dupont", tache: "Gros œuvre", heures: 8, cout: 320 },
  { id: "8", date: "2024-03-21", ouvrier: "Pierre Durand", tache: "Gros œuvre", heures: 8, cout: 320 },
];

const mockOuvriers = ["Tous", "Martin Dupont", "Jean Petit", "Pierre Durand", "Marie Lambert"];
const mockLots = ["Tous", "Lot 1 - Structure", "Lot 2 - Couverture", "Lot 3 - Finitions"];
const mockTaches = ["Toutes", "Fondations", "Gros œuvre", "Charpente", "Couverture"];

export const HeuresTab = () => {
  const [dateDebut, setDateDebut] = useState<Date>();
  const [dateFin, setDateFin] = useState<Date>();

  const totalHeures = mockHeures.reduce((sum, h) => sum + h.heures, 0);
  const totalCout = mockHeures.reduce((sum, h) => sum + h.cout, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Date début */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[160px] justify-start text-left font-normal",
                !dateDebut && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateDebut ? format(dateDebut, "dd/MM/yyyy") : "Date début"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateDebut}
              onSelect={setDateDebut}
              locale={fr}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Date fin */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[160px] justify-start text-left font-normal",
                !dateFin && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFin ? format(dateFin, "dd/MM/yyyy") : "Date fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFin}
              onSelect={setDateFin}
              locale={fr}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Select defaultValue="Tous">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ouvrier" />
          </SelectTrigger>
          <SelectContent>
            {mockOuvriers.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="Tous">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Lot" />
          </SelectTrigger>
          <SelectContent>
            {mockLots.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="Toutes">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tâche" />
          </SelectTrigger>
          <SelectContent>
            {mockTaches.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ouvrier</TableHead>
                <TableHead>Tâche</TableHead>
                <TableHead className="text-right">Heures</TableHead>
                <TableHead className="text-right">Coût</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHeures.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{new Date(h.date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{h.ouvrier}</TableCell>
                  <TableCell>{h.tache}</TableCell>
                  <TableCell className="text-right">{h.heures}h</TableCell>
                  <TableCell className="text-right font-medium">{h.cout}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end gap-4">
        <Card className="w-fit">
          <CardContent className="py-3 px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Total heures</span>
              <span className="text-xl font-bold">{totalHeures}h</span>
            </div>
          </CardContent>
        </Card>
        <Card className="w-fit">
          <CardContent className="py-3 px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Coût total</span>
              <span className="text-xl font-bold">{totalCout.toLocaleString()}€</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
