import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/ui/role-badge";

interface RHEmployeeAccordionProps {
  employee: {
    id: string;
    nom: string;
    role: string;
    isChef: boolean;
    totalHeures: number;
    totalIntemperics: number;
    totalPaniers: number;
    totalTrajets: number;
    totalTrajetsPerso: number;
  };
  joursSalarie: Array<{
    ficheJourId: string;
    date: string;
    dateISO: string;
    heuresNormales: number;
    heuresIntemperics: number;
    panier: boolean;
    codeTrajet: string | null;
    trajetPerso: boolean;
    commentaire?: string;
  }>;
}

export const RHEmployeeAccordion = ({ employee, joursSalarie }: RHEmployeeAccordionProps) => {
  return (
    <AccordionItem 
      value={employee.id}
      className="border border-border rounded-lg mb-2 bg-muted/30 px-3"
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4 py-1">
          {/* Partie gauche : Nom + Badge rôle */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">
              {employee.nom}
            </span>
            {/* Badge rôle coloré selon le type */}
            {employee.isChef ? (
              <RoleBadge role="chef" size="sm" />
            ) : employee.role ? (
              <RoleBadge role={employee.role as any} size="sm" />
            ) : null}
          </div>
          
          {/* Partie droite : Total heures uniquement */}
          <span className="text-sm font-medium text-muted-foreground">
            Total: {employee.totalHeures}h
          </span>
        </div>
      </AccordionTrigger>
      
      <AccordionContent>
        <div className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Heures normales</TableHead>
                <TableHead className="text-right">Intempéries</TableHead>
                <TableHead className="text-center">Panier</TableHead>
                <TableHead className="text-center">Trajets</TableHead>
                <TableHead className="text-center">Trajet perso</TableHead>
                <TableHead className="text-left">Commentaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {joursSalarie.map(jour => (
                <TableRow key={jour.ficheJourId}>
                  <TableCell className="font-medium">{jour.date}</TableCell>
                  <TableCell className="text-right">
                    {jour.heuresNormales}h
                  </TableCell>
                  <TableCell className="text-right">
                    {jour.heuresIntemperics > 0 ? `${jour.heuresIntemperics}h` : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {jour.panier ? "✓" : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {(jour as any).codeTrajet ? (
                      <span className="font-mono text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded font-medium">
                        {(jour as any).codeTrajet}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {jour.trajetPerso ? "✓" : "-"}
                  </TableCell>
                  <TableCell className="text-left text-sm text-muted-foreground">
                    {jour.commentaire || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
