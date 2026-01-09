import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { parseISOWeek } from "@/lib/weekUtils";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, CalendarCheck, List, Table as TableIcon, X, AlertCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { FinisseurCombobox } from "./FinisseurCombobox";
import { useChantiers } from "@/hooks/useChantiers";
import {
  useAffectationsFinisseursJours,
  useUpsertAffectationJour,
  useDeleteAffectationJour,
  useAffectationsPreviousWeekByConducteur,
  useAffectationsCurrentWeekByConducteur,
  useFinisseursPartiellementAffectes,
} from "@/hooks/useAffectationsFinisseursJours";
import { useCopyPreviousWeekFinisseurs } from "@/hooks/useCopyPreviousWeekFinisseurs";
import { useCreateFicheJourForAffectation } from "@/hooks/useCreateFicheJourForAffectation";
import { useDeleteFicheJourForAffectation } from "@/hooks/useDeleteFicheJourForAffectation";
import { useFinisseursFichesThisWeek } from "@/hooks/useFinisseursFichesThisWeek";
import { useAffectations } from "@/hooks/useAffectations";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  conducteurId: string;
  semaine: string;
  onAffectationsChange?: (list: Array<{ finisseur_id: string; date: string; chantier_id: string }>) => void;
}

type StatutAffectation = "non_affecte" | "partiel" | "complet";

export const FinisseursDispatchWeekly = ({ conducteurId, semaine, onAffectationsChange }: Props) => {
  const queryClient = useQueryClient();

  // Calculer la semaine S-1
  const previousWeek = useMemo(() => {
    const currentMonday = parseISOWeek(semaine);
    const previousMonday = addWeeks(currentMonday, -1);
    return format(previousMonday, "RRRR-'S'II");
  }, [semaine]);

  const { data: finisseurs = [], isLoading: loadingFinisseurs } = useUtilisateursByRole("finisseur");
  const { data: chantiers = [], isLoading: loadingChantiers } = useChantiers();
  const { data: affectations = [], isLoading: loadingAffectations } = useAffectationsFinisseursJours(semaine);
  const { data: finisseursS1Ids = [], isLoading: loadingS1 } = 
    useAffectationsPreviousWeekByConducteur(conducteurId, previousWeek);
  const { data: finisseursCurrentIds = [], isLoading: loadingCurrent } = 
    useAffectationsCurrentWeekByConducteur(conducteurId, semaine);
  const { data: finisseursFichesIds = [], isLoading: loadingFiches } = 
    useFinisseursFichesThisWeek(conducteurId, semaine);
  const { data: finisseursPartielsIds = [], isLoading: loadingPartiels } = 
    useFinisseursPartiellementAffectes(semaine);
  
  // Charger les affectations des chefs pour bloquer les finisseurs déjà affectés
  const { data: affectationsChefs } = useAffectations();

  const upsertMutation = useUpsertAffectationJour();
  const deleteMutation = useDeleteAffectationJour();
  const copyMutation = useCopyPreviousWeekFinisseurs();
  const createFicheJourMutation = useCreateFicheJourForAffectation();
  const deleteFicheJourMutation = useDeleteFicheJourForAffectation();

  // États UI
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | StatutAffectation>("tous");
  const [viewMode, setViewMode] = useState<"accordion" | "table">("accordion");
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [quickChantiers, setQuickChantiers] = useState<Record<string, string>>({});
  const [selectedFinisseurId, setSelectedFinisseurId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    finisseurId: string;
    finisseurName: string;
  } | null>(null);
  
  // État pour gérer les finisseurs ajoutés mais sans affectations encore
  const [pendingFinisseurs, setPendingFinisseurs] = useState<string[]>([]);

  // État local pour gérer les affectations
  const [localState, setLocalState] = useState<
    Record<string, Record<string, { checked: boolean; chantierId: string }>>
  >({});

  // Calculer les jours de la semaine
  const days = useMemo(() => {
    const monday = parseISOWeek(semaine);
    return Array.from({ length: 5 }, (_, i) => {
      const date = addDays(monday, i);
      return {
        date: format(date, "yyyy-MM-dd"),
        label: format(date, "EEEE d MMM", { locale: fr }),
      };
    });
  }, [semaine]);

  // Initialiser le state local depuis les affectations
  useEffect(() => {
    if (!finisseurs.length) return;

    const newState: Record<string, Record<string, { checked: boolean; chantierId: string }>> = {};

    finisseurs.forEach((f) => {
      newState[f.id] = {};
      days.forEach((day) => {
        const aff = affectations.find((a) => a.finisseur_id === f.id && a.date === day.date);
        newState[f.id][day.date] = {
          checked: !!aff,
          chantierId: aff?.chantier_id || "",
        };
      });
    });

    setLocalState(newState);
  }, [affectations, finisseurs, days]);

  // Émettre les affectations locales au parent à chaque changement
  useEffect(() => {
    if (!onAffectationsChange) return;
    
    const list: Array<{ finisseur_id: string; date: string; chantier_id: string }> = [];
    for (const [finisseurId, daysMap] of Object.entries(localState)) {
      for (const [date, state] of Object.entries(daysMap)) {
        if (state.checked) {
          list.push({ 
            finisseur_id: finisseurId, 
            date, 
            chantier_id: state.chantierId || "" 
          });
        }
      }
    }
    onAffectationsChange(list);
  }, [localState, onAffectationsChange]);

  // Fonction pour scroller vers un finisseur
  const scrollToFinisseur = (finisseurId: string) => {
    // Si le finisseur n'est pas déjà dans "Mon équipe" et pas pending, l'ajouter aux pending
    const isInTeam = mesFinisseursActuels.some(f => f.id === finisseurId);
    if (!isInTeam && !pendingFinisseurs.includes(finisseurId)) {
      setPendingFinisseurs(prev => [...prev, finisseurId]);
    }
    
    setSelectedFinisseurId(finisseurId);
    setStatusFilter("tous");

    // Attendre le rendu de l'élément injecté puis scroller
    setTimeout(() => {
      const element = document.getElementById(`finisseur-${finisseurId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  // Les accordéons restent fermés par défaut au chargement
  // L'utilisateur peut les ouvrir manuellement ou via la recherche combobox

  // Utilitaires de filtrage
  const getAffectedDaysCount = (finisseurId: string): number => {
    return days.filter((day) => localState[finisseurId]?.[day.date]?.checked).length;
  };

  const getFinisseurStatut = (finisseurId: string): StatutAffectation => {
    const count = getAffectedDaysCount(finisseurId);
    if (count === 0) return "non_affecte";
    if (count === 5) return "complet";
    return "partiel";
  };

  const isFinisseurAffectedElsewhere = (finisseurId: string, date: string): boolean => {
    return affectations.some(
      (a) => a.finisseur_id === finisseurId && a.date === date && a.conducteur_id !== conducteurId
    );
  };

  // Vérifier si un finisseur est affecté par un chef (dans la table affectations)
  const isFinisseurAffectedByChef = (finisseurId: string): boolean => {
    if (!affectationsChefs) return false;
    
    return affectationsChefs.some(
      (aff: any) => aff.macon_id === finisseurId && aff.date_fin === null
    );
  };

  // Finisseurs de "mon équipe" (uniquement ceux affectés par CE conducteur OU avec fiches)
  const mesFinisseursActuels = useMemo(() => {
    // Union de deux listes :
    // 1. Ceux avec affectations par CE conducteur (semaine en cours)
    // 2. Ceux avec fiches pour CE conducteur (indépendamment des affectations)
    const mesFinisseursActuelsIds = new Set([
      ...finisseursCurrentIds,
      ...finisseursFichesIds,
    ]);
    return finisseurs.filter(f => mesFinisseursActuelsIds.has(f.id));
  }, [finisseurs, finisseursCurrentIds, finisseursFichesIds]);

  // Finisseurs à afficher selon recherche
  const finisseursToDisplay = useMemo(() => {
    const query = searchQuery.trim();
    
    // Finisseurs avec affectations + pending
    const displayedIds = new Set([
      ...mesFinisseursActuels.map(f => f.id),
      ...pendingFinisseurs
    ]);
    
    if (query === "") {
      return finisseurs.filter(f => displayedIds.has(f.id));
    } else {
      return finisseurs.filter((f) =>
        `${f.prenom} ${f.nom}`.toLowerCase().includes(query.toLowerCase())
      );
    }
  }, [searchQuery, mesFinisseursActuels, finisseurs, pendingFinisseurs]);

  // Filtrage final par statut
  const filteredFinisseurs = useMemo(() => {
    return finisseursToDisplay.filter((f) => {
      const statut = getFinisseurStatut(f.id);
      return statusFilter === "tous" || statut === statusFilter;
    });
  }, [finisseursToDisplay, statusFilter]);

  // Handlers
  const handleCheckboxChange = async (finisseurId: string, date: string, checked: boolean) => {
    if (checked) {
      // Vérifier si déjà affecté ailleurs
      if (isFinisseurAffectedElsewhere(finisseurId, date)) {
        alert("Ce finisseur est déjà affecté à un autre conducteur pour ce jour.");
        return;
      }
    }

    // Mise à jour locale immédiate
    setLocalState((prev) => ({
      ...prev,
      [finisseurId]: {
        ...prev[finisseurId],
        [date]: {
          ...prev[finisseurId]?.[date],
          checked,
          chantierId: checked ? prev[finisseurId]?.[date]?.chantierId || "" : "",
        },
      },
    }));

    if (!checked) {
      // Supprimer l'affectation
      await deleteMutation.mutateAsync({ finisseurId, date });
      
      // Supprimer le fiche_jour correspondant
      await deleteFicheJourMutation.mutateAsync({
        finisseurId,
        date,
        semaine,
      });
      
      // Si le finisseur n'a plus aucune affectation, le remettre dans pendingFinisseurs
      const remainingAffectations = Object.entries(localState[finisseurId] || {}).filter(
        ([d, state]) => d !== date && state.checked
      );
      
      if (remainingAffectations.length === 0 && !pendingFinisseurs.includes(finisseurId)) {
        setPendingFinisseurs(prev => [...prev, finisseurId]);
      }
    }
    // Quand on coche, ne rien faire ici - on attend que handleChantierChange crée l'affectation
  };

  const handleChantierChange = async (finisseurId: string, date: string, chantierId: string) => {
    setLocalState((prev) => ({
      ...prev,
      [finisseurId]: {
        ...prev[finisseurId],
        [date]: {
          ...prev[finisseurId]?.[date],
          chantierId,
        },
      },
    }));

    await upsertMutation.mutateAsync({
      finisseur_id: finisseurId,
      conducteur_id: conducteurId,
      chantier_id: chantierId,
      date,
      semaine,
    });

    // Créer le fiche_jour correspondant
    await createFicheJourMutation.mutateAsync({
      finisseurId,
      conducteurId,
      date,
      semaine,
    });

    // Retirer des pending si c'était la première affectation
    if (pendingFinisseurs.includes(finisseurId)) {
      setPendingFinisseurs(prev => prev.filter(id => id !== finisseurId));
    }
  };

  const handleAssignAllWeek = async (finisseurId: string) => {
    const selectedChantier = quickChantiers[finisseurId];
    if (!selectedChantier) {
      toast({
        variant: "destructive",
        title: "Chantier requis",
        description: "Veuillez d'abord sélectionner un chantier dans le menu déroulant.",
      });
      return;
    }

    const availableDays = days.filter((day) => !isFinisseurAffectedElsewhere(finisseurId, day.date));

    const promises = availableDays.map((day) =>
      upsertMutation.mutateAsync({
        finisseur_id: finisseurId,
        conducteur_id: conducteurId,
        chantier_id: selectedChantier,
        date: day.date,
        semaine,
      })
    );

    await Promise.all(promises);

    toast({
      title: "✅ Semaine assignée",
      description: `${availableDays.length} jour(s) affecté(s)`,
    });
  };

  const handleRemoveFinisseur = (finisseurId: string, finisseurName: string) => {
    setDeleteConfirmation({
      open: true,
      finisseurId,
      finisseurName,
    });
  };

  const confirmRemoveFinisseur = async () => {
    if (!deleteConfirmation) return;
    
    const { finisseurId, finisseurName } = deleteConfirmation;
    
    // Si le finisseur est dans pending (sans affectations), le retirer simplement
    if (pendingFinisseurs.includes(finisseurId)) {
      setPendingFinisseurs(prev => prev.filter(id => id !== finisseurId));
      toast({
        title: "✅ Finisseur retiré",
        description: `${finisseurName} a été retiré de votre équipe.`,
      });
      setDeleteConfirmation(null);
      return;
    }
    
    try {
      // 1. Supprimer toutes les affectations du finisseur pour cette semaine
      const affectedDays = days.filter(
        day => localState[finisseurId]?.[day.date]?.checked
      );

      if (affectedDays.length > 0) {
        const deletePromises = affectedDays.map(day =>
          deleteMutation.mutateAsync({ finisseurId, date: day.date })
        );
        await Promise.all(deletePromises);
      }

      // 2. Récupérer et supprimer la fiche du finisseur pour cette semaine
      const { data: fiche } = await supabase
        .from("fiches")
        .select("id")
        .eq("salarie_id", finisseurId)
        .eq("semaine", semaine)
        .is("chantier_id", null)
        .maybeSingle();

      if (fiche) {
        // Supprimer les signatures liées
        await supabase.from("signatures").delete().eq("fiche_id", fiche.id);
        
        // Supprimer les fiches_jours
        await supabase.from("fiches_jours").delete().eq("fiche_id", fiche.id);
        
        // Supprimer le transport finisseur (jours puis parent)
        const { data: transportFinisseur } = await supabase
          .from("fiches_transport_finisseurs")
          .select("id")
          .eq("fiche_id", fiche.id);
        
        if (transportFinisseur?.length) {
          const transportIds = transportFinisseur.map(t => t.id);
          await supabase
            .from("fiches_transport_finisseurs_jours")
            .delete()
            .in("fiche_transport_finisseur_id", transportIds);
          await supabase
            .from("fiches_transport_finisseurs")
            .delete()
            .eq("fiche_id", fiche.id);
        }
        
        // Supprimer la fiche elle-même
        await supabase.from("fiches").delete().eq("id", fiche.id);
      }
      
      // 3. Invalider tous les caches concernés
      queryClient.invalidateQueries({ 
        queryKey: ["finisseurs-conducteur", conducteurId, semaine] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["finisseurs-fiches-week", conducteurId, semaine] 
      });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["fiches_jours"] });

      toast({
        title: "✅ Finisseur retiré",
        description: `${finisseurName} a été retiré de votre équipe.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de retirer le finisseur. Veuillez réessayer.",
      });
    } finally {
      setDeleteConfirmation(null);
    }
  };

  if (loadingFinisseurs || loadingChantiers || loadingAffectations || loadingS1 || loadingCurrent || loadingFiches) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement des données...</span>
        </div>
      </Card>
    );
  }

  if (finisseurs.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Aucun finisseur disponible dans l'entreprise.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          {/* Header avec toggle vue */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">👥 Gérer mon équipe</h3>
              <p className="text-sm text-muted-foreground">
                {viewMode === "accordion"
                  ? "Affectez et modifiez vos finisseurs jour par jour"
                  : "Vue tableau : gérez toutes les affectations en un coup d'œil"}
              </p>
            </div>

          </div>

          {/* Barre de recherche + Filtres */}
          <div className="flex gap-4">
            <div className="flex-1">
              <FinisseurCombobox
                finisseurs={finisseurs}
                mesFinisseursActuels={mesFinisseursActuels}
                getAffectedDaysCount={getAffectedDaysCount}
                onFinisseurSelect={scrollToFinisseur}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les finisseurs</SelectItem>
                <SelectItem value="non_affecte">Non affectés (0/5)</SelectItem>
                <SelectItem value="partiel">Partiellement affectés</SelectItem>
                <SelectItem value="complet">Semaine complète (5/5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Réinitialiser filtres */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {!searchQuery ? (
                <>
                  Mes finisseurs (semaine {semaine}) : <strong>{mesFinisseursActuels.length}</strong>
                  {statusFilter !== "tous" && ` • Filtrés : ${filteredFinisseurs.length}`}
                </>
              ) : (
                <>
                  Résultats de recherche : <strong>{filteredFinisseurs.length}</strong>
                </>
              )}
            </div>
            {(searchQuery || statusFilter !== "tous") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("tous");
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Vue Accordéon */}
      {viewMode === "accordion" && (
        <>
          {!searchQuery && filteredFinisseurs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aucun finisseur trouvé</AlertTitle>
              <AlertDescription>
                Vous n'avez encore affecté aucun finisseur cette semaine (semaine {semaine}).
                <br />
                <strong>💡 Utilisez la recherche ci-dessus</strong> pour ajouter vos premiers finisseurs.
              </AlertDescription>
            </Alert>
          ) : searchQuery && filteredFinisseurs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun finisseur ne correspond à votre recherche "{searchQuery}".
              </AlertDescription>
            </Alert>
          ) : (
            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-2"
            >
              {filteredFinisseurs.map((finisseur) => {
                const affectedCount = getAffectedDaysCount(finisseur.id);
                const statut = getFinisseurStatut(finisseur.id);

                return (
                  <AccordionItem
                    key={finisseur.id}
                    value={finisseur.id}
                    id={`finisseur-${finisseur.id}`}
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {finisseur.prenom} {finisseur.nom}
                        </span>

                        <Badge
                          variant={
                            statut === "complet"
                              ? "default"
                              : statut === "partiel"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {affectedCount}/5 jours
                          {statut === "partiel" && days.some(day => isFinisseurAffectedElsewhere(finisseur.id, day.date)) && " (partagé)"}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4">
                      {/* Actions rapides */}
                      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/20 rounded-md border">
                        <span className="text-sm font-medium text-muted-foreground">Actions rapides :</span>
                        
                        <Select
                          value={quickChantiers[finisseur.id] || ""}
                          onValueChange={(v) =>
                            setQuickChantiers((prev) => ({ ...prev, [finisseur.id]: v }))
                          }
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue placeholder="Choisir un chantier..." />
                          </SelectTrigger>
                          <SelectContent>
                            {chantiers
                              .filter((c) => c.actif)
                              .map((chantier) => (
                                <SelectItem key={chantier.id} value={chantier.id}>
                                  {chantier.nom}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssignAllWeek(finisseur.id)}
                                disabled={!quickChantiers[finisseur.id]}
                              >
                                <CalendarCheck className="h-4 w-4 mr-1" />
                                Affecter toute la semaine
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Affecter le chantier sélectionné à tous les jours disponibles</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleRemoveFinisseur(
                                    finisseur.id,
                                    `${finisseur.prenom} ${finisseur.nom}`
                                  )
                                }
                                disabled={deleteMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Retirer de l'équipe
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Retirer ce finisseur de votre équipe et supprimer toutes ses affectations pour cette semaine
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="space-y-3 pt-2">
                        {days.map((day) => {
                          const isBlocked = isFinisseurAffectedElsewhere(finisseur.id, day.date);
                          const isAffectedByChef = isFinisseurAffectedByChef(finisseur.id);
                          const cellState = localState[finisseur.id]?.[day.date] || {
                            checked: false,
                            chantierId: "",
                          };

                          return (
                            <div
                              key={day.date}
                              className="flex items-center gap-4 p-3 bg-muted/30 rounded-md"
                            >
                              <div className="w-40 font-medium text-sm">{day.label}</div>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={cellState.checked}
                                        disabled={isBlocked || isAffectedByChef}
                                        onCheckedChange={(checked) =>
                                          handleCheckboxChange(finisseur.id, day.date, !!checked)
                                        }
                                      />
                                      {isAffectedByChef && (
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                                          Affecté à un chef
                                        </Badge>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  {isBlocked && (
                                    <TooltipContent>
                                      <p>⚠️ Déjà affecté à un autre conducteur</p>
                                    </TooltipContent>
                                  )}
                                  {isAffectedByChef && (
                                    <TooltipContent>
                                      <p>🔒 Ce finisseur fait partie de l'équipe d'un chef</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>

                              {cellState.checked ? (
                                <Select
                                  value={cellState.chantierId}
                                  onValueChange={(value) =>
                                    handleChantierChange(finisseur.id, day.date, value)
                                  }
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Sélectionner un chantier..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {chantiers
                                      .filter((c) => c.actif)
                                      .map((chantier) => (
                                        <SelectItem key={chantier.id} value={chantier.id}>
                                          {chantier.nom}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="flex-1 text-sm text-muted-foreground italic">
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
          )}
        </>
      )}

      {/* Vue Tableau (ancienne version) */}
      {viewMode === "table" && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium sticky left-0 bg-background z-10">
                    Finisseur
                  </th>
                  {days.map((day) => (
                    <th key={day.date} className="text-center p-2 font-medium min-w-[200px]">
                      {day.label}
                    </th>
                  ))}
                  <th className="text-center p-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFinisseurs.map((finisseur) => (
                  <tr key={finisseur.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium sticky left-0 bg-background z-10">
                      {finisseur.prenom} {finisseur.nom}
                    </td>
                    {days.map((day) => {
                      const isBlocked = isFinisseurAffectedElsewhere(finisseur.id, day.date);
                      const cellState = localState[finisseur.id]?.[day.date] || {
                        checked: false,
                        chantierId: "",
                      };

                      return (
                        <td key={day.date} className="p-2 text-center">
                          <div className="flex flex-col gap-2 items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={cellState.checked}
                                      disabled={isBlocked}
                                      onCheckedChange={(checked) =>
                                        handleCheckboxChange(finisseur.id, day.date, !!checked)
                                      }
                                    />
                                  </div>
                                </TooltipTrigger>
                                {isBlocked && (
                                  <TooltipContent>
                                    <p>⚠️ Déjà affecté à un autre conducteur</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>

                            {cellState.checked && (
                              <Select
                                value={cellState.chantierId}
                                onValueChange={(value) =>
                                  handleChantierChange(finisseur.id, day.date, value)
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Chantier..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {chantiers
                                    .filter((c) => c.actif)
                                    .map((chantier) => (
                                      <SelectItem key={chantier.id} value={chantier.id}>
                                        {chantier.nom}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleRemoveFinisseur(
                                  finisseur.id,
                                  `${finisseur.prenom} ${finisseur.nom}`
                                )
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Retirer ce finisseur de votre équipe
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog 
        open={deleteConfirmation?.open || false} 
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer {deleteConfirmation?.finisseurName} de l'équipe ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Êtes-vous sûr de vouloir retirer <strong>{deleteConfirmation?.finisseurName}</strong> de votre équipe pour cette semaine ?
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Toutes ses affectations seront supprimées.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveFinisseur}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer de l'équipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
