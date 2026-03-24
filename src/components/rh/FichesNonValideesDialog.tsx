import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { RoleBadge } from "@/components/ui/role-badge";
import { FicheBlockDetailDialog } from "./FicheBlockDetailDialog";
import type { FicheNonValidee } from "@/hooks/useExportPaieReadiness";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fichesNonValidees: FicheNonValidee[];
  periodeLabel: string;
}

export const FichesNonValideesDialog = ({ open, onOpenChange, fichesNonValidees, periodeLabel }: Props) => {
  const [detail, setDetail] = useState<{ salarieId: string; semaine: string; name: string } | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
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
                        <div className="flex items-center gap-2">
                          <span>{f.nom} {f.prenom}</span>
                          {f.roleMetier && (
                            <RoleBadge role={f.roleMetier as any} size="sm" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {f.semaines.map((s) => {
                            const weekNum = s.split("-S")[1] || s;
                            return (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                                onClick={() => setDetail({
                                  salarieId: f.salarieId,
                                  semaine: s,
                                  name: `${f.nom} ${f.prenom}`,
                                })}
                              >
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

      <FicheBlockDetailDialog
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
        salarieId={detail?.salarieId || null}
        semaine={detail?.semaine || null}
        salarieName={detail?.name || ""}
      />
    </>
  );
};
