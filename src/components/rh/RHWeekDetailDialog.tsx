import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DayDetail {
  date: string;
  chantier: string;
  heuresNormales: number;
  heuresIntemperies: number;
  panier: boolean;
  ficheJourId: string;
  codeTrajet?: string | null;
  typeAbsence?: string | null;
  trajetPerso?: boolean;
}

interface RHWeekDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semaine: string;
  days: DayDetail[];
}

export const RHWeekDetailDialog = ({ open, onOpenChange, semaine, days }: RHWeekDetailDialogProps) => {
  // Calculer les totaux
  const totals = days.reduce(
    (acc, day) => ({
      heuresNormales: acc.heuresNormales + (day.heuresNormales || 0),
      heuresIntemperies: acc.heuresIntemperies + (day.heuresIntemperies || 0),
      paniers: acc.paniers + (day.panier ? 1 : 0),
      trajets: acc.trajets + (day.codeTrajet && day.codeTrajet !== 'A_COMPLETER' ? 1 : 0),
    }),
    { heuresNormales: 0, heuresIntemperies: 0, paniers: 0, trajets: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détail semaine
            <Badge variant="outline" className="text-sm font-semibold bg-primary/10 text-primary border-primary/30">
              {semaine}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50">
                <TableHead className="text-left py-2 px-3 font-semibold text-foreground">Date</TableHead>
                <TableHead className="text-left py-2 px-3 font-semibold text-foreground">Chantier</TableHead>
                <TableHead className="text-center py-2 px-3 font-semibold text-foreground">Heures</TableHead>
                <TableHead className="text-center py-2 px-3 font-semibold text-foreground">Panier</TableHead>
                <TableHead className="text-center py-2 px-3 font-semibold text-foreground">Trajets</TableHead>
                <TableHead className="text-center py-2 px-3 font-semibold text-foreground">Intempérie</TableHead>
                <TableHead className="text-center py-2 px-3 font-semibold text-foreground">Absence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day, idx) => {
                const isAbsent = day.heuresNormales === 0 && day.heuresIntemperies === 0;
                
                return (
                  <TableRow 
                    key={idx} 
                    className={`border-b border-border/30 ${isAbsent ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                  >
                    <TableCell className="py-2 px-3 text-foreground font-medium">
                      {format(new Date(day.date), "EEE dd/MM", { locale: fr })}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-foreground text-sm">
                      {day.chantier}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      {isAbsent ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30 text-xs">
                          Absent
                        </Badge>
                      ) : (
                        <span className="text-foreground font-medium">{day.heuresNormales}h</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      {day.panier ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      {day.trajetPerso ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30 text-xs">
                          Perso
                        </Badge>
                      ) : day.codeTrajet && day.codeTrajet !== '' && day.codeTrajet !== 'A_COMPLETER' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30 text-xs">
                          {day.codeTrajet}
                        </Badge>
                      ) : day.codeTrajet === 'A_COMPLETER' ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30 text-xs">
                          À compléter
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3 text-foreground">
                      {day.heuresIntemperies > 0 ? `${day.heuresIntemperies}h` : "-"}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      {day.typeAbsence ? (
                        <Badge variant="destructive" className="text-xs">
                          {day.typeAbsence}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t-2 border-border/70 bg-muted/30">
                <TableCell colSpan={2} className="py-3 px-3 font-bold text-foreground">Total</TableCell>
                <TableCell className="text-center py-3 px-3 font-bold text-primary">
                  {totals.heuresNormales}h
                </TableCell>
                <TableCell className="text-center py-3 px-3 font-bold text-foreground">
                  {totals.paniers}
                </TableCell>
                <TableCell className="text-center py-3 px-3 font-bold text-foreground">
                  {totals.trajets}
                </TableCell>
                <TableCell className="text-center py-3 px-3 font-bold text-foreground">
                  {totals.heuresIntemperies > 0 ? `${totals.heuresIntemperies}h` : "-"}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
