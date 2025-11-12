import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Eye, AlertTriangle, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRHConsolidated } from "@/hooks/useRHData";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RHConsolidatedProps {
  filters: any;
  onSelectFiche: (id: string) => void;
}

export const RHConsolidated = ({ filters, onSelectFiche }: RHConsolidatedProps) => {
  const { data: employees = [], isLoading } = useRHConsolidated(filters);

  const getStatutBadge = (statut: string) => {
    const configs = {
      "prete": { label: "Prête pour paie", className: "bg-success/10 text-success border-success/30" },
      "a-traiter": { label: "À traiter", className: "bg-warning/10 text-warning border-warning/30" },
      "rectification": { label: "En rectification", className: "bg-destructive/10 text-destructive border-destructive/30" },
    };
    const config = configs[statut as keyof typeof configs] || configs["a-traiter"];
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <Skeleton className="h-96 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Salarié</TableHead>
              <TableHead className="text-center">Chantier</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">H. Normales</TableHead>
              <TableHead className="text-center">H. Supp</TableHead>
              <TableHead className="text-center">Absences</TableHead>
              <TableHead className="text-center">Paniers</TableHead>
              <TableHead className="text-center">Trajets</TableHead>
              <TableHead className="text-center">Trajets perso</TableHead>
              <TableHead className="text-center">Agence</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id} className="hover:bg-muted/20">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {emp.nom}
                    {emp.anomalies > 0 && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    {emp.hasUnqualifiedAbsences && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center animate-pulse">
                              <Badge 
                                variant="outline" 
                                className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50 px-2 py-1 text-sm font-semibold shadow-sm"
                              >
                                <AlertCircle className="h-5 w-5" />
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">⚠️ Absence(s) à qualifier</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {emp.chantier_codes && emp.chantier_codes.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {emp.chantier_codes.map((code, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {emp.isChef ? (
                    <RoleBadge role="chef" size="sm" />
                  ) : emp.role ? (
                    <RoleBadge role={emp.role as any} size="sm" />
                  ) : null}
                </TableCell>
                <TableCell className="text-center">{emp.heuresNormales}h</TableCell>
                <TableCell className="text-center">{emp.heuresSupp}h</TableCell>
                <TableCell className="text-center">{emp.absences}j</TableCell>
                <TableCell className="text-center">{emp.paniers}</TableCell>
                <TableCell className="text-center">{emp.trajets}</TableCell>
                <TableCell className="text-center">{emp.trajetsPerso > 0 ? emp.trajetsPerso : '-'}</TableCell>
                <TableCell className="text-center">
                  {emp.role === "interimaire" && emp.agence_interim ? (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30">
                      {emp.agence_interim}
                    </Badge>
                  ) : emp.role === "interimaire" ? (
                    <span className="text-muted-foreground text-xs">Non renseignée</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{getStatutBadge(emp.statut)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onSelectFiche(`emp___${emp.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune donnée à afficher</p>
          <p className="text-sm mt-2">Aucun résultat avec ces filtres</p>
        </div>
      )}
    </div>
  );
};
