import { useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { parseISOWeek } from "@/lib/weekUtils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { useUtilisateursByRoles } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";
import {
  useAffectationsFinisseursJours,
  useAffectationsCurrentWeekByConducteur,
} from "@/hooks/useAffectationsFinisseursJours";
import { useFinisseursFichesThisWeek } from "@/hooks/useFinisseursFichesThisWeek";

interface Props {
  conducteurId: string;
  semaine: string;
  onAffectationsChange?: (list: Array<{ finisseur_id: string; date: string; chantier_id: string }>) => void;
}

export const FinisseursDispatchWeekly = ({ conducteurId, semaine, onAffectationsChange }: Props) => {
  const { data: employes = [], isLoading: loadingEmployes } = useUtilisateursByRoles(["finisseur", "macon", "grutier", "interimaire"]);
  const { data: chantiers = [], isLoading: loadingChantiers } = useChantiers();
  const { data: affectations = [], isLoading: loadingAffectations } = useAffectationsFinisseursJours(semaine);
  const { data: finisseursCurrentIds = [], isLoading: loadingCurrent } =
    useAffectationsCurrentWeekByConducteur(conducteurId, semaine);
  const { data: finisseursFichesIds = [], isLoading: loadingFiches } =
    useFinisseursFichesThisWeek(conducteurId, semaine);

  // Calculer les jours de la semaine
  const days = useMemo(() => {
    const monday = parseISOWeek(semaine);
    return Array.from({ length: 5 }, (_, i) => {
      const date = addDays(monday, i);
      return {
        date: format(date, "yyyy-MM-dd"),
        label: format(date, "EEEE d MMM", { locale: fr }),
        shortLabel: format(date, "EEE d", { locale: fr }),
      };
    });
  }, [semaine]);

  // Map des chantiers pour lookup rapide
  const chantiersMap = useMemo(() => {
    const map = new Map<string, string>();
    chantiers.forEach((c) => map.set(c.id, c.nom));
    return map;
  }, [chantiers]);

  // Employés de mon équipe (affectés par CE conducteur OU avec fiches)
  const mesEmployes = useMemo(() => {
    const ids = new Set([...finisseursCurrentIds, ...finisseursFichesIds]);
    return employes.filter((f) => ids.has(f.id));
  }, [employes, finisseursCurrentIds, finisseursFichesIds]);

  // Affectations par finisseur pour CE conducteur
  const affectationsByFinisseur = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    affectations
      .filter((a) => a.conducteur_id === conducteurId)
      .forEach((a) => {
        if (!map.has(a.finisseur_id)) map.set(a.finisseur_id, new Map());
        map.get(a.finisseur_id)!.set(a.date, a.chantier_id);
      });
    return map;
  }, [affectations, conducteurId]);

  // Émettre les affectations au parent
  useEffect(() => {
    if (!onAffectationsChange) return;
    const list: Array<{ finisseur_id: string; date: string; chantier_id: string }> = [];
    affectationsByFinisseur.forEach((daysMap, finisseurId) => {
      daysMap.forEach((chantierId, date) => {
        list.push({ finisseur_id: finisseurId, date, chantier_id: chantierId });
      });
    });
    onAffectationsChange(list);
  }, [affectationsByFinisseur, onAffectationsChange]);

  if (loadingEmployes || loadingChantiers || loadingAffectations || loadingCurrent || loadingFiches) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement des données...</span>
        </div>
      </Card>
    );
  }

  if (mesEmployes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Aucun employé affecté cette semaine. Les affectations sont gérées depuis le <strong>Planning</strong>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bandeau info lecture seule */}
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Lock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          <strong>Vue en lecture seule.</strong> Les affectations sont gérées depuis le <strong>Planning</strong> par les conducteurs ou admins.
          Contactez votre responsable pour toute modification d'équipe.
        </AlertDescription>
      </Alert>

      {/* Résumé équipe */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">👥 Mon équipe</h3>
          <Badge variant="secondary">{mesEmployes.length} employé(s)</Badge>
          <span className="text-sm text-muted-foreground ml-auto">Semaine {semaine}</span>
        </div>
      </Card>

      {/* Liste en accordéon lecture seule */}
      <Accordion type="multiple" className="space-y-2">
        {mesEmployes.map((employe) => {
          const finisseurAffectations = affectationsByFinisseur.get(employe.id);
          const affectedCount = finisseurAffectations?.size || 0;

          return (
            <AccordionItem
              key={employe.id}
              value={employe.id}
              className="border rounded-lg"
            >
              <AccordionTrigger className="px-4 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {employe.prenom} {employe.nom}
                  </span>
                  <Badge
                    variant={
                      affectedCount === 5
                        ? "default"
                        : affectedCount > 0
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {affectedCount}/5 jours
                  </Badge>
                  {employe.agence_interim && (
                    <Badge variant="outline" className="text-[10px]">
                      {employe.agence_interim}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2">
                  {days.map((day) => {
                    const chantierId = finisseurAffectations?.get(day.date);
                    const chantierNom = chantierId ? chantiersMap.get(chantierId) : null;

                    return (
                      <div
                        key={day.date}
                        className={`flex items-center gap-4 p-3 rounded-md ${
                          chantierId ? "bg-primary/5 border border-primary/10" : "bg-muted/30"
                        }`}
                      >
                        <div className="w-40 font-medium text-sm">{day.label}</div>
                        {chantierNom ? (
                          <Badge variant="outline" className="bg-background">
                            🏗️ {chantierNom}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Non affecté
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
