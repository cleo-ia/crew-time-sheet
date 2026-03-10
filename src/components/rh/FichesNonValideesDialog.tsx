import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { FicheNonValidee } from "@/hooks/useExportPaieReadiness";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fichesNonValidees: FicheNonValidee[];
  periodeLabel: string;
}

export const FichesNonValideesDialog = ({ open, onOpenChange, fichesNonValidees, periodeLabel }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="capitalize">Fiches en attente — {periodeLabel}</DialogTitle>
          <DialogDescription>
            {fichesNonValidees.length > 0
              ? `${fichesNonValidees.length} salarié(s) avec des fiches non validées`
              : "Toutes les fiches sont validées"}
          </DialogDescription>
        </DialogHeader>

        {fichesNonValidees.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">Toutes les fiches sont validées ✓</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salarié</TableHead>
                  <TableHead>Semaines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichesNonValidees.map((f) => (
                  <TableRow key={f.salarieId}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {f.nom} {f.prenom}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.semaines.map((s) => {
                          const weekNum = s.split("-S")[1] || s;
                          return (
                            <Badge key={s} variant="secondary" className="text-xs">
                              S{weekNum}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
