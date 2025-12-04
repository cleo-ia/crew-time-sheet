import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const mockAchats = [
  { id: "1", nom: "Béton C25/30", date: "2024-03-15", tache: "Fondations", pu: 95, qte: 45, total: 4275 },
  { id: "2", nom: "Ferraillage HA", date: "2024-03-18", tache: "Fondations", pu: 1.2, qte: 2500, total: 3000 },
  { id: "3", nom: "Parpaings 20x20x50", date: "2024-03-22", tache: "Gros œuvre", pu: 1.85, qte: 3200, total: 5920 },
  { id: "4", nom: "Ciment CEM II", date: "2024-03-25", tache: "Gros œuvre", pu: 8.5, qte: 120, total: 1020 },
  { id: "5", nom: "Chevrons 8x10", date: "2024-04-02", tache: "Charpente", pu: 12, qte: 85, total: 1020 },
  { id: "6", nom: "Tuiles terre cuite", date: "2024-04-08", tache: "Couverture", pu: 0.95, qte: 2800, total: 2660 },
];

const mockLots = ["Tous", "Lot 1 - Structure", "Lot 2 - Couverture", "Lot 3 - Finitions"];
const mockCategories = ["Toutes", "Matériaux", "Quincaillerie", "Location", "Divers"];

export const AchatsTab = () => {
  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Select defaultValue="Tous">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lot" />
          </SelectTrigger>
          <SelectContent>
            {mockLots.map((lot) => (
              <SelectItem key={lot} value={lot}>{lot}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="Toutes">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {mockCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un achat
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Achats</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tâches</TableHead>
                <TableHead className="text-right">P.U.</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAchats.map((achat) => (
                <TableRow key={achat.id}>
                  <TableCell className="font-medium">{achat.nom}</TableCell>
                  <TableCell>{new Date(achat.date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{achat.tache}</TableCell>
                  <TableCell className="text-right">{achat.pu.toLocaleString()}€</TableCell>
                  <TableCell className="text-right">{achat.qte.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{achat.total.toLocaleString()}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Total */}
      <div className="flex justify-end">
        <Card className="w-fit">
          <CardContent className="py-3 px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Total achats</span>
              <span className="text-xl font-bold">17 895€</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
