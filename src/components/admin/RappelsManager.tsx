import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, PlayCircle, Clock, CheckCircle, AlertCircle, Calendar, Loader2, History, Eye, Trash2, AlertTriangle } from "lucide-react";
import { useRappels } from "@/hooks/useRappels";
import { useRappelsHistorique } from "@/hooks/useRappelsHistorique";
import { usePurgeTestData } from "@/hooks/usePurgeTestData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useEffect } from "react";
import { formatTimestampParis } from "@/lib/date";

export const RappelsManager = () => {
  const {
    triggerRappelChefs,
    isExecutingChefs,
    triggerRappelConducteurs,
    isExecutingConducteurs,
    triggerRappelChefsLundi,
    isExecutingChefsLundi,
    triggerRappelConducteursFinisseurs,
    isExecutingConducteursFinisseurs,
  } = useRappels();

  const { data: historique, isLoading: historiqueLoading } = useRappelsHistorique();
  const { getCounts, purge, isLoading: isPurging, counts, currentWeek } = usePurgeTestData();
  
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    getCounts();
  }, []);

  const handlePurge = async () => {
    if (confirmText === "SUPPRIMER") {
      const success = await purge();
      if (success) {
        setPurgeDialogOpen(false);
        setConfirmText("");
      }
    }
  };

  const rappelChefsConfig = {
    title: "Rappel Chefs d'équipe",
    schedule: "Tous les vendredis à 17h00 (heure de Paris)",
    scheduleDetails: "Adaptation automatique heure d'été/hiver",
    description: "Envoie des rappels aux chefs ayant des fiches non finalisées pour la semaine en cours",
    active: true,
  };

  const rappelConducteursConfig = {
    title: "Rappel Conducteurs",
    schedule: "Tous les vendredis à 17h00 (heure de Paris)",
    scheduleDetails: "Adaptation automatique heure d'été/hiver",
    description: "Envoie des rappels aux conducteurs ayant des fiches en attente de validation",
    active: true,
  };

  const rappelChefsLundiConfig = {
    title: "Rappel Chefs lundi matin",
    schedule: "Tous les lundis à 08h00 (heure de Paris)",
    scheduleDetails: "Adaptation automatique heure d'été/hiver",
    description: "Envoie des rappels aux chefs ayant des fiches de la semaine précédente (S-1) non finalisées",
    active: true,
  };

  const rappelConducteursFinisseursConfig = {
    title: "Rappel Conducteurs Finisseurs",
    schedule: "Tous les vendredis à 17h00 (heure de Paris)",
    scheduleDetails: "Adaptation automatique heure d'été/hiver",
    description: "Envoie des rappels aux conducteurs pour valider/exporter les heures des finisseurs",
    active: true,
  };

  return (
    <div className="space-y-6">
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Gestion automatique du fuseau horaire</AlertTitle>
        <AlertDescription>
          Les rappels s'exécutent toujours à l'heure de Paris (Europe/Paris), 
          avec adaptation automatique lors des changements heure d'été/hiver. 
          Les boutons "Lancer maintenant" permettent de tester le système manuellement.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Rappel Chefs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  {rappelChefsConfig.title}
                </CardTitle>
                <CardDescription>
                  {rappelChefsConfig.description}
                </CardDescription>
              </div>
              <Badge variant={rappelChefsConfig.active ? "default" : "secondary"}>
                {rappelChefsConfig.active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactif
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{rappelChefsConfig.schedule}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">{rappelChefsConfig.scheduleDetails}</span>
              </div>
            </div>

            <Button
              onClick={() => triggerRappelChefs()}
              disabled={isExecutingChefs}
              className="w-full"
              variant="outline"
            >
              {isExecutingChefs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exécution...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Lancer maintenant
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Rappel Conducteurs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  {rappelConducteursConfig.title}
                </CardTitle>
                <CardDescription>
                  {rappelConducteursConfig.description}
                </CardDescription>
              </div>
              <Badge variant={rappelConducteursConfig.active ? "default" : "secondary"}>
                {rappelConducteursConfig.active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactif
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{rappelConducteursConfig.schedule}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">{rappelConducteursConfig.scheduleDetails}</span>
              </div>
            </div>

            <Button
              onClick={() => triggerRappelConducteurs()}
              disabled={isExecutingConducteurs}
              className="w-full"
              variant="outline"
            >
              {isExecutingConducteurs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exécution...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Lancer maintenant
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Rappel Chefs Lundi */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  {rappelChefsLundiConfig.title}
                </CardTitle>
                <CardDescription>
                  {rappelChefsLundiConfig.description}
                </CardDescription>
              </div>
              <Badge variant={rappelChefsLundiConfig.active ? "default" : "secondary"}>
                {rappelChefsLundiConfig.active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactif
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{rappelChefsLundiConfig.schedule}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">{rappelChefsLundiConfig.scheduleDetails}</span>
              </div>
            </div>

            <Button
              onClick={() => triggerRappelChefsLundi()}
              disabled={isExecutingChefsLundi}
              className="w-full"
              variant="outline"
            >
              {isExecutingChefsLundi ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exécution...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Lancer maintenant
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Rappel Conducteurs Finisseurs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-green-500" />
                  {rappelConducteursFinisseursConfig.title}
                </CardTitle>
                <CardDescription>
                  {rappelConducteursFinisseursConfig.description}
                </CardDescription>
              </div>
              <Badge variant={rappelConducteursFinisseursConfig.active ? "default" : "secondary"}>
                {rappelConducteursFinisseursConfig.active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactif
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{rappelConducteursFinisseursConfig.schedule}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">{rappelConducteursFinisseursConfig.scheduleDetails}</span>
              </div>
            </div>

            <Button
              onClick={() => triggerRappelConducteursFinisseurs()}
              disabled={isExecutingConducteursFinisseurs}
              className="w-full"
              variant="outline"
            >
              {isExecutingConducteursFinisseurs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exécution...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Lancer maintenant
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique récent
          </CardTitle>
          <CardDescription>Les 20 dernières exécutions des rappels</CardDescription>
        </CardHeader>
        <CardContent>
          {historiqueLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !historique || historique.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun historique d'exécution pour le moment</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Destinataires</TableHead>
                    <TableHead className="text-right">Succès</TableHead>
                    <TableHead className="text-right">Échecs</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historique.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant={
                          record.type === 'rappel_chefs' ? 'default' :
                          record.type === 'rappel_chefs_lundi' ? 'outline' :
                          record.type === 'rappel_conducteurs_finisseurs' ? 'default' :
                          'secondary'
                        }>
                          {record.type === 'rappel_chefs' ? 'Chefs' : 
                           record.type === 'rappel_chefs_lundi' ? 'Chefs Lundi' :
                           record.type === 'rappel_conducteurs_finisseurs' ? 'Conduc. Finisseurs' :
                           'Conducteurs'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimestampParis(record.executed_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.execution_mode === 'manual' ? 'outline' : 'secondary'}>
                          {record.execution_mode === 'manual' ? 'Manuel' : 'CRON'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{record.nb_destinataires}</TableCell>
                      <TableCell className="text-right text-green-600">{record.nb_succes}</TableCell>
                      <TableCell className="text-right text-red-600">{record.nb_echecs}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {record.duration_ms ? `${record.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        {record.details && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Détails de l'exécution</DialogTitle>
                                <DialogDescription>
                                  {formatTimestampParis(record.executed_at)}
                                </DialogDescription>
                              </DialogHeader>
                              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                                {JSON.stringify(record.details, null, 2)}
                              </pre>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Liens utiles */}
        <Card>
          <CardHeader>
            <CardTitle>Liens utiles</CardTitle>
            <CardDescription>Accès rapide aux logs et configurations Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://supabase.com/dashboard/project/rxkhtqezcyaqvjlbzzpu/functions/rappel-chefs/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📊 Logs rappel-chefs
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://supabase.com/dashboard/project/rxkhtqezcyaqvjlbzzpu/functions/rappel-conducteurs/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📊 Logs rappel-conducteurs
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://supabase.com/dashboard/project/rxkhtqezcyaqvjlbzzpu/functions/rappel-chefs-lundi/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📊 Logs rappel-chefs-lundi
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://supabase.com/dashboard/project/rxkhtqezcyaqvjlbzzpu/functions/rappel-conducteurs-finisseurs/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📊 Logs rappel-conducteurs-finisseurs
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Nettoyage des données de test */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Nettoyage des données de test
            </CardTitle>
            <CardDescription>
              Supprime toutes les fiches de la semaine en cours et de la semaine suivante
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {counts && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="text-sm font-medium mb-2">Données semaines {currentWeek} + suivante</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Fiches:</div>
                  <div className="text-right font-mono">{counts.fiches}</div>
                  <div>Heures (jours):</div>
                  <div className="text-right font-mono">{counts.fiches_jours}</div>
                  <div>Transport:</div>
                  <div className="text-right font-mono">{counts.fiches_transport}</div>
                  <div>Trajets:</div>
                  <div className="text-right font-mono">{counts.fiches_transport_jours}</div>
                  <div>Signatures:</div>
                  <div className="text-right font-mono">{counts.signatures}</div>
                  <div className="font-semibold border-t pt-2">Total:</div>
                  <div className="text-right font-mono font-semibold border-t pt-2">
                    {Object.values(counts).reduce((a, b) => a + b, 0)}
                  </div>
                </div>
              </div>
            )}

            <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isPurging || !counts || Object.values(counts).reduce((a, b) => a + b, 0) === 0}
                  onClick={() => setConfirmText("")}
                >
                  {isPurging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purger maintenant
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Confirmer la suppression
                  </DialogTitle>
                  <DialogDescription className="space-y-2 pt-2">
                    <p className="font-medium">
                      Cette opération va supprimer définitivement toutes les données suivantes 
                      pour la semaine <span className="font-mono font-bold">{currentWeek}</span> et la semaine suivante :
                    </p>
                    {counts && (
                      <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                        <li>{counts.signatures} signature(s)</li>
                        <li>{counts.fiches_transport_jours} trajet(s)</li>
                        <li>{counts.fiches_transport} fiche(s) de transport</li>
                        <li>{counts.fiches_jours} journée(s) d'heures</li>
                        <li>{counts.fiches} fiche(s) de temps</li>
                      </ul>
                    )}
                    <p className="font-semibold text-destructive pt-2">
                      ⚠️ Cette action est irréversible !
                    </p>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm">
                      Pour confirmer, tapez <span className="font-mono font-bold">SUPPRIMER</span>
                    </Label>
                    <Input
                      id="confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="SUPPRIMER"
                      className="font-mono"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPurgeDialogOpen(false);
                      setConfirmText("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handlePurge}
                    disabled={confirmText !== "SUPPRIMER" || isPurging}
                  >
                    {isPurging ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer définitivement
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
