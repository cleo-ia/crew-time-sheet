import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown } from "lucide-react";

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
    trajet: number;
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
              <Badge 
                variant="default" 
                className="bg-primary/10 text-primary border-primary/20"
              >
                <Crown className="h-3 w-3 mr-1" />
                Chef d'équipe
              </Badge>
            ) : employee.role === "interimaire" ? (
              <Badge 
                variant="secondary" 
                className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
              >
                Intérimaire
              </Badge>
            ) : employee.role === "finisseur" ? (
              <Badge 
                variant="secondary" 
                className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                Finisseur
              </Badge>
            ) : (
              <Badge 
                variant="secondary" 
                className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
              >
                Maçon
              </Badge>
            )}
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
                    {jour.trajet > 0 ? "✓" : "-"}
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
