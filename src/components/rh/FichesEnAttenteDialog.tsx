import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FicheEnAttenteConducteur } from "@/hooks/useFichesEnAttente";

interface FichesEnAttenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FicheEnAttenteConducteur[];
  total: number;
}

export const FichesEnAttenteDialog = ({
  open,
  onOpenChange,
  data,
  total,
}: FichesEnAttenteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Fiches en attente de validation
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
              {total}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucune fiche en attente de validation
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conducteur</TableHead>
                <TableHead className="text-right">Fiches en attente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.conducteurId}>
                  <TableCell className="font-medium">
                    {item.conducteurPrenom} {item.conducteurNom}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline" 
                      className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
                    >
                      {item.nbFiches}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
