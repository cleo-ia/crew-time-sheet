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
import { useUtilisateursByRoles } from "@/hooks/useUtilisateurs";
import { useAffectations } from "@/hooks/useAffectations";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";
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

  const { data: employes = [], isLoading: loadingEmployes } = useUtilisateursByRoles(["finisseur", "macon", "grutier", "interimaire"]);
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
  
  // Dialog création intérimaire
  const [showCreateInterimaireDialog, setShowCreateInterimaireDialog] = useState(false);

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
    if (!employes.length) return;

    const newState: Record<string, Record<string, { checked: boolean; chantierId: string }>> = {};

    employes.forEach((f) => {
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
  }, [affectations, employes, days]);

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

  // Fonction pour scroller vers un employé
  const scrollToFinisseur = (finisseurId: string) => {
    // Si l'employé n'est pas déjà dans "Mon équipe" et pas pending, l'ajouter aux pending
    const isInTeam = mesEmployesActuels.some(f => f.id === finisseurId);
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

  // Employés de "mon équipe" (uniquement ceux affectés par CE conducteur OU avec fiches)
  const mesEmployesActuels = useMemo(() => {
    // Union de deux listes :
    // 1. Ceux avec affectations par CE conducteur (semaine en cours)
    // 2. Ceux avec fiches pour CE conducteur (indépendamment des affectations)
    const mesEmployesActuelsIds = new Set([
      ...finisseursCurrentIds,
      ...finisseursFichesIds,
    ]);
    return employes.filter(f => mesEmployesActuelsIds.has(f.id));
  }, [employes, finisseursCurrentIds, finisseursFichesIds]);

  // Grouper les employés par rôle pour la grille 4 colonnes
  const groupedEmployes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    const filterBySearch = (e: typeof employes[0]) => {
      if (!query) return true;
      return `${e.prenom} ${e.nom}`.toLowerCase().includes(query);
    };
    
    const macons = employes.filter(e => 
      (e.role_metier === "macon" || e._roleType === "macon") && !e.agence_interim && filterBySearch(e)
    );
    const grutiers = employes.filter(e => 
      (e.role_metier === "grutier" || e._roleType === "grutier") && !e.agence_interim && filterBySearch(e)
    );
    const interimaires = employes.filter(e => 
      (e.agence_interim || e._roleType === "interimaire") && filterBySearch(e)
    );
    const finisseurs = employes.filter(e => 
      (e.role_metier === "finisseur" || e._roleType === "finisseur") && !e.agence_interim && filterBySearch(e)
    );
    
    return { macons, grutiers, interimaires, finisseurs };
  }, [employes, searchQuery]);

  // Employés à afficher selon recherche (pour les vues accordion/table)
  const employesToDisplay = useMemo(() => {
    const query = searchQuery.trim();
    
    // Employés avec affectations + pending
    const displayedIds = new Set([
      ...mesEmployesActuels.map(f => f.id),
      ...pendingFinisseurs
    ]);
    
    if (query === "") {
      return employes.filter(f => displayedIds.has(f.id));
    } else {
      return employes.filter((f) =>
        `${f.prenom} ${f.nom}`.toLowerCase().includes(query.toLowerCase())
      );
    }
  }, [searchQuery, mesEmployesActuels, employes, pendingFinisseurs]);
  
  // Vérifier le statut d'un employé pour affichage badge
  const getEmployeStatus = (employeId: string) => {
    // Affecté par un chef ?
    if (isFinisseurAffectedByChef(employeId)) {
      return { type: "chef", label: "Géré par chef", className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" };
    }
    
    // Déjà dans mon équipe ?
    const isInTeam = mesEmployesActuels.some(f => f.id === employeId) || pendingFinisseurs.includes(employeId);
    if (isInTeam) {
      const days = getAffectedDaysCount(employeId);
      if (days === 5) {
        return { type: "complet", label: "5/5 jours", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" };
      } else if (days > 0) {
        return { type: "partiel", label: `${days}/5 jours`, className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" };
      }
      return { type: "added", label: "Ajouté", className: "bg-primary/10 text-primary border-primary/20" };
    }
    
    // Affecté à un autre conducteur ?
    const isAffectedOther = finisseursPartielsIds.includes(employeId) && 
      !finisseursCurrentIds.includes(employeId);
    if (isAffectedOther) {
      return { type: "autre", label: "Autre conducteur", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    }
    
    return { type: "available", label: "Disponible", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  };
  
  // Ajouter un employé à l'équipe
  const handleAddEmploye = (employeId: string) => {
    const isInTeam = mesEmployesActuels.some(f => f.id === employeId) || pendingFinisseurs.includes(employeId);
    if (isInTeam) return;
    
    if (isFinisseurAffectedByChef(employeId)) {
      toast({
        variant: "destructive",
        title: "Employé non disponible",
        description: "Cet employé est déjà géré par un chef de chantier.",
      });
      return;
    }
    
    // Ajouter aux pending
    setPendingFinisseurs(prev => [...prev, employeId]);
    
    // Scroll vers l'employé
    setSelectedFinisseurId(employeId);
    setTimeout(() => {
      const element = document.getElementById(`finisseur-${employeId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    
    toast({
      title: "✅ Employé ajouté",
      description: "Sélectionnez maintenant ses jours et chantiers d'affectation.",
    });
  };

  // Filtrage final par statut
  const filteredEmployes = useMemo(() => {
    return employesToDisplay.filter((f) => {
      const statut = getFinisseurStatut(f.id);
      return statusFilter === "tous" || statut === statusFilter;
    });
  }, [employesToDisplay, statusFilter]);

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

    // Créer le fiche_jour correspondant avec le chantier_id
    await createFicheJourMutation.mutateAsync({
      finisseurId,
      conducteurId,
      date,
      semaine,
      chantierId, // ✅ Maintenant obligatoire
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

  if (loadingEmployes || loadingChantiers || loadingAffectations || loadingS1 || loadingCurrent || loadingFiches) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement des données...</span>
        </div>
      </Card>
    );
  }

  if (employes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Aucun employé disponible dans l'entreprise.</AlertDescription>
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
              <Input
                placeholder="Rechercher un employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
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
          
          {/* Grille 4 colonnes pour ajouter des employés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Colonne Maçons */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                👷 Ajouter des Maçons
              </h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {groupedEmployes.macons.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun maçon</p>
                ) : (
                  groupedEmployes.macons.map((e) => {
                    const status = getEmployeStatus(e.id);
                    const isInTeam = status.type === "added" || status.type === "partiel" || status.type === "complet";
                    const isDisabled = status.type === "chef";
                    
                    return (
                      <div 
                        key={e.id}
                        className={`flex items-center justify-between gap-2 p-2 border rounded-md text-sm ${isDisabled ? 'opacity-50' : 'hover:bg-muted/50'}`}
                      >
                        <span className="truncate font-medium">{e.prenom} {e.nom}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                            {status.label}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant={isInTeam ? "secondary" : "default"}
                            className="h-6 px-2 text-xs"
                            disabled={isInTeam || isDisabled}
                            onClick={() => handleAddEmploye(e.id)}
                          >
                            {isInTeam ? "✓" : "+"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Colonne Grutiers */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                🏗️ Ajouter des Grutiers
              </h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {groupedEmployes.grutiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun grutier</p>
                ) : (
                  groupedEmployes.grutiers.map((e) => {
                    const status = getEmployeStatus(e.id);
                    const isInTeam = status.type === "added" || status.type === "partiel" || status.type === "complet";
                    const isDisabled = status.type === "chef";
                    
                    return (
                      <div 
                        key={e.id}
                        className={`flex items-center justify-between gap-2 p-2 border rounded-md text-sm ${isDisabled ? 'opacity-50' : 'hover:bg-muted/50'}`}
                      >
                        <span className="truncate font-medium">{e.prenom} {e.nom}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                            {status.label}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant={isInTeam ? "secondary" : "default"}
                            className="h-6 px-2 text-xs"
                            disabled={isInTeam || isDisabled}
                            onClick={() => handleAddEmploye(e.id)}
                          >
                            {isInTeam ? "✓" : "+"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Colonne Intérimaires */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                🔄 Ajouter des Intérimaires
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mb-2 text-xs"
                onClick={() => setShowCreateInterimaireDialog(true)}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Créer intérimaire d'urgence
              </Button>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {groupedEmployes.interimaires.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun intérimaire</p>
                ) : (
                  groupedEmployes.interimaires.map((e) => {
                    const status = getEmployeStatus(e.id);
                    const isInTeam = status.type === "added" || status.type === "partiel" || status.type === "complet";
                    const isDisabled = status.type === "chef";
                    
                    return (
                      <div 
                        key={e.id}
                        className={`flex items-center justify-between gap-2 p-2 border rounded-md text-sm ${isDisabled ? 'opacity-50' : 'hover:bg-muted/50'}`}
                      >
                        <div className="truncate">
                          <span className="font-medium">{e.prenom} {e.nom}</span>
                          {e.agence_interim && (
                            <span className="text-[10px] text-muted-foreground block truncate">{e.agence_interim}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                            {status.label}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant={isInTeam ? "secondary" : "default"}
                            className="h-6 px-2 text-xs"
                            disabled={isInTeam || isDisabled}
                            onClick={() => handleAddEmploye(e.id)}
                          >
                            {isInTeam ? "✓" : "+"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Colonne Finisseurs */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                🔨 Ajouter des Finisseurs
              </h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {groupedEmployes.finisseurs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun finisseur</p>
                ) : (
                  groupedEmployes.finisseurs.map((e) => {
                    const status = getEmployeStatus(e.id);
                    const isInTeam = status.type === "added" || status.type === "partiel" || status.type === "complet";
                    const isDisabled = status.type === "chef";
                    
                    return (
                      <div 
                        key={e.id}
                        className={`flex items-center justify-between gap-2 p-2 border rounded-md text-sm ${isDisabled ? 'opacity-50' : 'hover:bg-muted/50'}`}
                      >
                        <span className="truncate font-medium">{e.prenom} {e.nom}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                            {status.label}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant={isInTeam ? "secondary" : "default"}
                            className="h-6 px-2 text-xs"
                            disabled={isInTeam || isDisabled}
                            onClick={() => handleAddEmploye(e.id)}
                          >
                            {isInTeam ? "✓" : "+"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Réinitialiser filtres */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {!searchQuery ? (
                <>
                  Mon équipe (semaine {semaine}) : <strong>{mesEmployesActuels.length}</strong>
                  {statusFilter !== "tous" && ` • Filtrés : ${filteredEmployes.length}`}
                </>
              ) : (
                <>
                  Résultats de recherche : <strong>{filteredEmployes.length}</strong>
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
          {!searchQuery && filteredEmployes.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aucun employé trouvé</AlertTitle>
              <AlertDescription>
                Vous n'avez encore affecté aucun employé cette semaine (semaine {semaine}).
                <br />
                <strong>💡 Utilisez la recherche ci-dessus</strong> pour ajouter vos premiers employés.
              </AlertDescription>
            </Alert>
          ) : searchQuery && filteredEmployes.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun employé ne correspond à votre recherche "{searchQuery}".
              </AlertDescription>
            </Alert>
          ) : (
            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-2"
            >
              {filteredEmployes.map((employe) => {
                const affectedCount = getAffectedDaysCount(employe.id);
                const statut = getFinisseurStatut(employe.id);

                return (
                  <AccordionItem
                    key={employe.id}
                    value={employe.id}
                    id={`finisseur-${employe.id}`}
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {employe.prenom} {employe.nom}
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
                          {statut === "partiel" && days.some(day => isFinisseurAffectedElsewhere(employe.id, day.date)) && " (partagé)"}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4">
                      {/* Actions rapides */}
                      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/20 rounded-md border">
                        <span className="text-sm font-medium text-muted-foreground">Actions rapides :</span>
                        
                        <Select
                          value={quickChantiers[employe.id] || ""}
                          onValueChange={(v) =>
                            setQuickChantiers((prev) => ({ ...prev, [employe.id]: v }))
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
                                onClick={() => handleAssignAllWeek(employe.id)}
                                disabled={!quickChantiers[employe.id]}
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
                                    employe.id,
                                    `${employe.prenom} ${employe.nom}`
                                  )
                                }
                                disabled={deleteMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Retirer de l'équipe
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Retirer cet employé de votre équipe et supprimer toutes ses affectations pour cette semaine
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="space-y-3 pt-2">
                        {days.map((day) => {
                          const isBlocked = isFinisseurAffectedElsewhere(employe.id, day.date);
                          const isAffectedByChef = isFinisseurAffectedByChef(employe.id);
                          const cellState = localState[employe.id]?.[day.date] || {
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
                                          handleCheckboxChange(employe.id, day.date, !!checked)
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
                                      <p>🔒 Cet employé fait partie de l'équipe d'un chef</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>

                              {cellState.checked ? (
                                <Select
                                  value={cellState.chantierId}
                                  onValueChange={(value) =>
                                    handleChantierChange(employe.id, day.date, value)
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
                {filteredEmployes.map((employe) => (
                  <tr key={employe.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium sticky left-0 bg-background z-10">
                      {employe.prenom} {employe.nom}
                    </td>
                    {days.map((day) => {
                      const isBlocked = isFinisseurAffectedElsewhere(employe.id, day.date);
                      const cellState = localState[employe.id]?.[day.date] || {
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
                                        handleCheckboxChange(employe.id, day.date, !!checked)
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
                                  handleChantierChange(employe.id, day.date, value)
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
                                  employe.id,
                                  `${employe.prenom} ${employe.nom}`
                                )
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Retirer cet employé de votre équipe
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
      
      {/* Dialog création intérimaire */}
      <InterimaireFormDialog
        open={showCreateInterimaireDialog}
        onOpenChange={setShowCreateInterimaireDialog}
        onSuccess={(newId) => {
          if (newId) {
            handleAddEmploye(newId);
          }
        }}
      />
    </div>
  );
};
