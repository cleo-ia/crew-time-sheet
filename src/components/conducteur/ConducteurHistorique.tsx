import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, User, Utensils, Car, Calendar } from "lucide-react";
import { useConducteurHistorique } from "@/hooks/useConducteurHistorique";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ConducteurHistoriqueProps {
  conducteurId: string | null;
}

export const ConducteurHistorique = ({ conducteurId }: ConducteurHistoriqueProps) => {
  const { data: historique, isLoading } = useConducteurHistorique(conducteurId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!historique || historique.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun historique disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="space-y-4">
        {historique.map((semaine, idx) => (
          <AccordionItem key={semaine.semaine} value={semaine.semaine} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-4 w-full">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Semaine {semaine.semaine}</span>
                    <Badge variant={semaine.statut === "AUTO_VALIDE" ? "default" : "secondary"}>
                      {semaine.statut === "AUTO_VALIDE" ? "Validé" : "Transmis à RH"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Transmis le {format(new Date(semaine.dateTransmission), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {semaine.finisseurs.length} finisseur{semaine.finisseurs.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4 mt-4">
                {semaine.finisseurs.map((finisseur) => (
                  <Card key={finisseur.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5 text-primary" />
                        {finisseur.prenom} {finisseur.nom}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Résumé des heures */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Heures</p>
                            <p className="font-semibold">{finisseur.totalHeures.toFixed(2)}h</p>
                          </div>
                        </div>
                        {finisseur.totalIntemperie > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-sm text-muted-foreground">Intempéries</p>
                              <p className="font-semibold">{finisseur.totalIntemperie.toFixed(2)}h</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Paniers</p>
                            <p className="font-semibold">{finisseur.paniers}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Trajets</p>
                            <p className="font-semibold">{finisseur.trajets}</p>
                          </div>
                        </div>
                      </div>

                      {/* Détail par jour */}
                      {finisseur.ficheJours && finisseur.ficheJours.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Détail par jour
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Heures</TableHead>
                                <TableHead>Intempéries</TableHead>
                                <TableHead>Panier</TableHead>
                                <TableHead>Trajets</TableHead>
                                <TableHead>Chantier</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {finisseur.ficheJours.map((jour) => (
                                <TableRow key={jour.date}>
                                  <TableCell className="font-medium">
                                    {format(new Date(jour.date), "EEE dd/MM", { locale: fr })}
                                  </TableCell>
                                  <TableCell>{(jour.heures || jour.HNORM || 0).toFixed(2)}h</TableCell>
                                  <TableCell>{jour.HI > 0 ? `${jour.HI.toFixed(2)}h` : "-"}</TableCell>
                                  <TableCell>{jour.PA ? "✓" : "-"}</TableCell>
                                  <TableCell>
                                    {(jour as any).trajet_perso ? (
                                      <Badge variant="secondary" className="text-xs">Trajet perso</Badge>
                                    ) : (
                                      jour.T || "-"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {jour.code_chantier_du_jour && jour.ville_du_jour
                                      ? `${jour.code_chantier_du_jour} - ${jour.ville_du_jour}`
                                      : jour.code_chantier_du_jour || jour.ville_du_jour || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Détails transport */}
                      {finisseur.transportJours.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            Transport quotidien
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Véhicule</TableHead>
                                <TableHead>Conducteur Matin</TableHead>
                                <TableHead>Conducteur Soir</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {finisseur.transportJours.map((jour) => (
                                <TableRow key={jour.date}>
                                  <TableCell className="font-medium">
                                    {format(new Date(jour.date), "EEE dd/MM", { locale: fr })}
                                  </TableCell>
                                  <TableCell>
                                    {jour.trajet_perso ? (
                                      <Badge variant="outline" className="text-xs">Véhicule perso</Badge>
                                    ) : (
                                      jour.immatriculation || "-"
                                    )}
                                  </TableCell>
                                  <TableCell>{jour.conducteurMatinNom || "-"}</TableCell>
                                  <TableCell>{jour.conducteurSoirNom || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
