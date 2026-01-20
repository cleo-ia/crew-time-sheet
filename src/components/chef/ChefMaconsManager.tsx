import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Loader2, X, Crown, AlertTriangle, Users, ArrowRightLeft, CalendarDays } from "lucide-react";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { useAffectations, useCreateAffectation, useUpdateAffectation } from "@/hooks/useAffectations";
import { useDeleteFichesByMacon } from "@/hooks/useFiches";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { TeamMemberCombobox } from "./TeamMemberCombobox";
import { InterimaireFormDialog } from "@/components/shared/InterimaireFormDialog";
import { useAffectationsFinisseursJours } from "@/hooks/useAffectationsFinisseursJours";
import { useChantiers } from "@/hooks/useChantiers";
import { useDissoudreEquipe } from "@/hooks/useDissoudreEquipe";
import { useTransfererEquipe } from "@/hooks/useTransfererEquipe";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DaysSelectionDialog } from "./DaysSelectionDialog";
import { useAffectationsJoursChef, useAffectationsJoursByChef, useCreateDefaultAffectationsJours, useUpdateJoursForMember, getDayNamesFromDates } from "@/hooks/useAffectationsJoursChef";
import { format, addDays } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";

interface ChefMaconsManagerProps {
  chefId: string;
  chantierId: string;
  semaine: string;
  disabled?: boolean;
}

export const ChefMaconsManager = ({ chefId, chantierId, semaine, disabled }: ChefMaconsManagerProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [maconToRemove, setMaconToRemove] = useState<{id: string, nom: string, prenom: string, role: string} | null>(null);
  const [searchValue, setSearchValue] = useState<string>("all");
  const [showCreateInterimaireDialog, setShowCreateInterimaireDialog] = useState(false);
  const [showDissolutionDialog, setShowDissolutionDialog] = useState(false);
  const [showTransfertDialog, setShowTransfertDialog] = useState(false);
  const [destinationChantierId, setDestinationChantierId] = useState<string>("");
  const [memberToEditDays, setMemberToEditDays] = useState<{id: string, nom: string, prenom: string, role: string, affectationId: string | null} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: entrepriseId, isLoading: isLoadingEntrepriseId } = useCurrentEntrepriseId();

  // Récupérer tous les maçons, grutiers, intérimaires et finisseurs du système
  const { data: allMacons, isLoading: loadingMacons } = useUtilisateursByRole("macon");
  const { data: allGrutiers, isLoading: loadingGrutiers } = useUtilisateursByRole("grutier");
  const { data: allInterimaires, isLoading: loadingInterimaires } = useUtilisateursByRole("interimaire");
  const { data: allFinisseurs, isLoading: loadingFinisseurs } = useUtilisateursByRole("finisseur");
  
  // Filtre défensif : garantir qu'on n'affiche que des maçons purs (role_metier = 'macon')
  const maconsPurs = (allMacons || []).filter(u => u.role_metier === 'macon');
  
  // Récupérer les maçons déjà dans l'équipe
  const { data: currentTeam, refetch: refetchTeam } = useMaconsByChantier(chantierId, semaine, chefId);
  
  // Récupérer toutes les affectations pour connaître le statut
  const { data: allAffectations, refetch: refetchAffectations } = useAffectations();
  
  // Récupérer les affectations finisseurs conducteur pour cette semaine
  const { data: affectationsFinisseursJours } = useAffectationsFinisseursJours(semaine);
  
  // Récupérer les affectations jours pour ce chef et cette semaine
  const { data: affectationsJoursChef, refetch: refetchAffectationsJours } = useAffectationsJoursByChef(chefId, semaine);
  
  // Récupérer TOUTES les affectations jours de la semaine (tous les chefs)
  const { data: allAffectationsJoursWeek } = useAffectationsJoursChef(semaine);
  
  // Hook pour créer une affectation
  const createAffectation = useCreateAffectation();
  
  // Hook pour mettre à jour une affectation
  const updateAffectation = useUpdateAffectation();
  
  // Hook pour supprimer les fiches lors du retrait
  const deleteFichesByMacon = useDeleteFichesByMacon();
  
  // Hook pour créer les affectations jours par défaut
  const createDefaultAffectationsJours = useCreateDefaultAffectationsJours();
  
  // Hook pour créer les affectations jours partielles
  const updateJoursForMember = useUpdateJoursForMember();

  // Hooks pour dissolution et transfert
  const dissoudreEquipe = useDissoudreEquipe();
  const transfererEquipe = useTransfererEquipe();

  // Récupérer les chantiers pour le transfert
  const { data: allChantiers } = useChantiers();
  const otherActiveChantiers = (allChantiers || []).filter(
    c => c.actif && c.id !== chantierId
  );

  // Vérifier si un maçon est dans l'équipe actuelle (check currentTeam + affectations actives)
  const isMaconInTeam = (maconId: string): boolean => {
    // Vérifier dans currentTeam
    if (currentTeam?.some(m => m.id === maconId)) return true;
    
    // Vérifier si une affectation active existe pour ce maçon et ce chantier
    if (allAffectations) {
      const hasActiveAffectation = allAffectations.some(
        (aff: any) => aff.macon_id === maconId && aff.chantier_id === chantierId && aff.date_fin === null
      );
      if (hasActiveAffectation) return true;
    }
    
    return false;
  };

  // Récupérer le statut d'un maçon basé sur les jours disponibles cette semaine
  const getMaconStatus = (maconId: string): { type: "available" | "partial" | "unavailable"; label: string; availableDays?: string[] } => {
    // Récupérer les jours déjà pris par un AUTRE chef cette semaine
    const daysTakenByOthers = allAffectationsJoursWeek?.filter(
      aff => aff.macon_id === maconId && aff.chef_id !== chefId
    ) || [];
    
    const allDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const takenDayNames = getDayNamesFromDates(daysTakenByOthers.map(a => a.jour), semaine);
    const availableDays = allDays.filter(d => !takenDayNames.includes(d));
    
    // Si les 5 jours sont pris → Indisponible
    if (availableDays.length === 0) {
      return { type: "unavailable", label: "Indisponible" };
    }
    
    // Si certains jours sont pris → Partiellement disponible
    if (availableDays.length < 5) {
      return { 
        type: "partial", 
        label: `${availableDays.length} jour(s) dispo`,
        availableDays 
      };
    }
    
    // Tous les jours sont libres
    return { type: "available", label: "Disponible", availableDays };
  };

  // Vérifier si un finisseur est déjà géré par un conducteur pour cette semaine
  const isFinisseurManagedByConducteur = (finisseurId: string): boolean => {
    if (!affectationsFinisseursJours) return false;
    return affectationsFinisseursJours.some(aff => aff.finisseur_id === finisseurId);
  };

  // Filtrer les maçons, grutiers et intérimaires selon la recherche
  const filteredMacons = searchValue === "all" 
    ? maconsPurs 
    : maconsPurs?.filter(m => m.id === searchValue);

  const filteredGrutiers = searchValue === "all"
    ? allGrutiers
    : allGrutiers?.filter(g => g.id === searchValue);

  const filteredInterimaires = searchValue === "all"
    ? allInterimaires
    : allInterimaires?.filter(i => i.id === searchValue);

  const filteredFinisseurs = searchValue === "all"
    ? allFinisseurs
    : allFinisseurs?.filter(f => f.id === searchValue);

  // Déterminer quelles sections afficher
  const showMaconsSection = searchValue === "all" || 
    (searchValue !== "all" && maconsPurs?.some(m => m.id === searchValue));

  const showGrutiersSection = searchValue === "all" ||
    (searchValue !== "all" && allGrutiers?.some(g => g.id === searchValue));

  const showInterimairesSection = searchValue === "all" || 
    (searchValue !== "all" && allInterimaires?.some(i => i.id === searchValue));

  const showFinisseursSection = searchValue === "all" ||
    (searchValue !== "all" && allFinisseurs?.some(f => f.id === searchValue));

  // Fonction utilitaire pour obtenir le label du rôle
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case "grutier":
        return "Grutier";
      case "interimaire":
        return "Intérimaire";
      case "finisseur":
        return "Finisseur";
      case "macon":
      default:
        return "Maçon";
    }
  };

  // Ajouter un maçon à l'équipe
  const handleAddMacon = async (maconId: string, maconNom: string, maconPrenom: string, role: string = "macon") => {
    // Vérifier si déjà dans l'équipe
    if (isMaconInTeam(maconId)) {
      const roleLabel = getRoleLabel(role);
      toast({
        title: "Déjà dans l'équipe",
        description: `${maconPrenom} ${maconNom} fait déjà partie de votre équipe.`,
      });
      return;
    }

    // Vérifier les jours disponibles pour cet employé
    const status = getMaconStatus(maconId);
    if (status.type === "unavailable") {
      toast({
        title: "Employé indisponible",
        description: `${maconPrenom} ${maconNom} est indisponible cette semaine (tous les jours sont pris).`,
        variant: "destructive",
      });
      return;
    }

    // Vérifier que l'entreprise est chargée avant de continuer
    if (!entrepriseId) {
      console.error("[ChefMaconsManager] entrepriseId non disponible, impossible de créer les jours");
      toast({
        title: "Erreur",
        description: "L'entreprise n'est pas encore chargée. Veuillez réessayer.",
        variant: "destructive",
      });
      return;
    }

    // Ajouter à la liste des IDs en cours d'ajout
    setAddingIds(prev => new Set(prev).add(maconId));

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Vérifier si une affectation fermée existe déjà pour aujourd'hui
      const existingAffectation = allAffectations?.find(
        (aff: any) => 
          aff.macon_id === maconId && 
          aff.chantier_id === chantierId && 
          aff.date_debut === today &&
          aff.date_fin !== null // Affectation fermée
      );

      let affectationId: string | null = null;
      
      if (existingAffectation) {
        // Réactiver l'affectation existante
        await updateAffectation.mutateAsync({
          id: existingAffectation.id,
          date_fin: null, // Retirer la date de fin pour réactiver
        });
        affectationId = existingAffectation.id;
      } else {
        // Créer une nouvelle affectation
        const newAffectation = await createAffectation.mutateAsync({
          macon_id: maconId,
          chantier_id: chantierId,
          date_debut: today,
          date_fin: null,
        });
        affectationId = newAffectation?.id || null;
      }

      // Créer les affectations jours (entrepriseId garanti présent par la vérification au début)
      if (status.type === "partial" && status.availableDays) {
        // Cas partiel : créer uniquement les jours disponibles
        console.log("[ChefMaconsManager] Création jours partiels pour", { maconId, availableDays: status.availableDays });
        await updateJoursForMember.mutateAsync({
          maconId,
          chefId,
          chantierId,
          semaine,
          affectationId,
          entrepriseId,
          selectedDays: status.availableDays,
        });
      } else {
        // Cas complet : créer tous les jours par défaut (Lun-Ven)
        console.log("[ChefMaconsManager] Création jours complets (Lun-Ven) pour", { maconId, chefId, semaine, entrepriseId });
        await createDefaultAffectationsJours.mutateAsync({
          maconId,
          chefId,
          chantierId,
          semaine,
          affectationId,
          entrepriseId,
        });
      }

      // Rafraîchir les données pour mettre à jour l'UI immédiatement
      await Promise.all([
        refetchAffectations(),
        refetchTeam(),
        refetchAffectationsJours(),
        queryClient.invalidateQueries({ queryKey: ["macons-chantier"] }),
        queryClient.invalidateQueries({ queryKey: ["affectations-jours-chef"] })
      ]);

      const roleLabel = getRoleLabel(role);
      const daysMessage = status.type === "partial" && status.availableDays
        ? `pour ${status.availableDays.length} jour(s) (${status.availableDays.join(", ")})`
        : "pour toute la semaine";
      toast({
        title: `${roleLabel} ajouté`,
        description: `${maconPrenom} ${maconNom} a été ajouté à votre équipe ${daysMessage}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || `Impossible d'ajouter ${maconPrenom} ${maconNom}.`,
        variant: "destructive",
      });
    } finally {
      // Retirer de la liste des IDs en cours d'ajout
      setAddingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(maconId);
        return newSet;
      });
    }
  };

  // Retirer un maçon de l'équipe
  const handleRemoveMacon = async (maconId: string, maconNom: string, maconPrenom: string, role: string = "macon") => {
    // Fermer la dialog de confirmation
    setMaconToRemove(null);
    
    // Trouver l'affectation active
    const activeAffectation = allAffectations?.find(
      (aff: any) => aff.macon_id === maconId && aff.chantier_id === chantierId && aff.date_fin === null
    );

    if (!activeAffectation) {
      toast({
        title: "Erreur",
        description: "Aucune affectation active trouvée pour ce maçon.",
        variant: "destructive",
      });
      return;
    }

    setRemovingIds(prev => new Set(prev).add(maconId));

    try {
      // ✅ COUCHE 1 : Supprimer d'abord les fiches non finalisées
      await deleteFichesByMacon.mutateAsync({
        maconId,
        chantierId,
        semaine
      });

      // Ensuite mettre la date_fin sur l'affectation
      await updateAffectation.mutateAsync({
        id: activeAffectation.id,
        date_fin: new Date().toISOString().split('T')[0],
      });

      await Promise.all([
        refetchAffectations(),
        refetchTeam(),
        queryClient.invalidateQueries({ queryKey: ["macons-chantier"] }),
        queryClient.invalidateQueries({ queryKey: ["fiches"] }),
        queryClient.invalidateQueries({ queryKey: ["fiches-by-status"] })
      ]);

      const roleLabel = getRoleLabel(role);
      toast({
        title: `${roleLabel} retiré`,
        description: `${maconPrenom} ${maconNom} a été retiré de votre équipe. Ses fiches en cours ont été supprimées.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || `Impossible de retirer ${maconPrenom} ${maconNom}.`,
        variant: "destructive",
      });
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(maconId);
        return newSet;
      });
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowDialog(true)}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Gérer mon équipe
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Gérer mon équipe</DialogTitle>
            
            {/* Champ de recherche */}
            <div className="pt-4">
              <TeamMemberCombobox
                value={searchValue}
                onChange={setSearchValue}
                allMacons={maconsPurs || []}
                allGrutiers={allGrutiers || []}
                allInterimaires={allInterimaires || []}
                allFinisseurs={allFinisseurs || []}
                isLoading={loadingMacons || loadingGrutiers || loadingInterimaires || loadingFinisseurs}
              />
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {/* Section 1 : Maçons actuellement dans l'équipe */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  MON ÉQUIPE ACTUELLE
                </h3>
                {currentTeam && currentTeam.length > 0 ? (
                  <div className="space-y-2">
                    {[...currentTeam].sort((a, b) => {
                      // Tri : Chef d'équipe > Maçons > Intérimaires
                      const getPriority = (member: typeof a) => {
                        if (member.isChef) return 0;        // Chef en premier
                        if (member.role === "interimaire") return 2; // Intérimaires en dernier
                        return 1;                            // Maçons au milieu
                      };
                      
                      const priorityDiff = getPriority(a) - getPriority(b);
                      if (priorityDiff !== 0) return priorityDiff;
                      
                      // Tri alphabétique par Prénom (à priorité égale)
                      const prenomCompare = (a.prenom || "").localeCompare(b.prenom || "", 'fr');
                      if (prenomCompare !== 0) return prenomCompare;
                      
                      // Tri par Nom si Prénoms identiques
                      return (a.nom || "").localeCompare(b.nom || "", 'fr');
                    }).map((macon) => {
                      const isRemoving = removingIds.has(macon.id);
                      
                      // Calculer les jours affectés pour ce membre
                      const memberDaysAffected = affectationsJoursChef
                        ?.filter(a => a.macon_id === macon.id)
                        .map(a => getDayNamesFromDates([a.jour], semaine)[0])
                        .filter(Boolean) || [];
                      
                      // Trouver l'affectation_id pour ce membre
                      const memberAffectation = allAffectations?.find(
                        (aff: any) => aff.macon_id === macon.id && aff.chantier_id === chantierId && aff.date_fin === null
                      );
                      
                      // Afficher les jours sous forme de badges courts
                      const getDayBadges = () => {
                        if (memberDaysAffected.length === 0 || memberDaysAffected.length === 5) {
                          return <Badge variant="outline" className="text-xs">Lun→Ven</Badge>;
                        }
                        const shortDays = memberDaysAffected.map(d => d.substring(0, 3));
                        return (
                          <Badge variant="outline" className="text-xs">
                            {shortDays.join(" ")}
                          </Badge>
                        );
                      };
                      
                      return (
                        <div 
                          key={macon.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            {macon.role === "interimaire" ? (
                              <span className="text-lg">🔄</span>
                            ) : macon.role === "grutier" ? (
                              <span className="text-lg">🏗️</span>
                            ) : !macon.isChef && (
                              <span className="text-lg">👷‍♂️</span>
                            )}
                            <div>
                              <p className="font-medium">
                                {macon.prenom} {macon.nom}
                              </p>
                              {/* Afficher les jours d'affectation sous le nom (sauf chef) */}
                              {!macon.isChef && (
                                <div className="mt-1">
                                  {getDayBadges()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {macon.isChef ? (
                              <Badge 
                                variant="default" 
                                className="bg-primary text-primary-foreground"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                Chef de chantier
                              </Badge>
                            ) : macon.role === "interimaire" ? (
                              <Badge 
                                variant="secondary" 
                                className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                              >
                                Intérimaire
                              </Badge>
                             ) : macon.role === "grutier" ? (
                              <Badge 
                                variant="secondary" 
                                className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              >
                                Grutier
                              </Badge>
                            ) : macon.role === "finisseur" ? (
                              <Badge 
                                variant="secondary" 
                                className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
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
                            {/* Bouton pour modifier les jours d'affectation (sauf chef) */}
                            {!macon.isChef && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMemberToEditDays({
                                  id: macon.id,
                                  nom: macon.nom || "",
                                  prenom: macon.prenom || "",
                                  role: macon.role || "macon",
                                  affectationId: memberAffectation?.id || null,
                                })}
                                title="Modifier les jours d'affectation"
                              >
                                <CalendarDays className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isRemoving}
                              onClick={() => setMaconToRemove({ id: macon.id, nom: macon.nom || "", prenom: macon.prenom || "", role: macon.role || "macon" })}
                              title="Retirer de l'équipe"
                            >
                              {isRemoving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg">
                    Aucun maçon dans votre équipe pour cette semaine
                  </p>
                )}
              </div>

              {/* Section Actions sur l'équipe - visible seulement si équipe non vide */}
              {currentTeam && currentTeam.filter(m => m.id !== chefId).length > 0 && (
                <div className="mt-4 p-4 border border-border rounded-lg bg-muted/20">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                    ACTIONS SUR L'ÉQUIPE
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDissolutionDialog(true)}
                      disabled={dissoudreEquipe.isPending}
                    >
                      {dissoudreEquipe.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      Dissoudre l'équipe
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDestinationChantierId("");
                        setShowTransfertDialog(true);
                      }}
                      disabled={transfererEquipe.isPending || otherActiveChantiers.length === 0}
                    >
                      {transfererEquipe.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                      )}
                      Transférer vers un autre chantier
                    </Button>
                  </div>
                  {otherActiveChantiers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Aucun autre chantier actif disponible pour le transfert.
                    </p>
                  )}
                </div>
              )}

              {(showMaconsSection || showGrutiersSection || showInterimairesSection || showFinisseursSection) && (
                <>
                  <Separator className="my-6" />

                  {/* Grille 4 colonnes pour afficher maçons, grutiers, intérimaires et finisseurs côte à côte */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* Colonne gauche : AJOUTER DES MAÇONS */}
                    {showMaconsSection && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                          AJOUTER DES MAÇONS
                        </h3>
                        {loadingMacons ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredMacons && filteredMacons.length > 0 ? (
                          <div className="space-y-2">
                            {[...filteredMacons].sort((a, b) => {
                              const prenomCompare = (a.prenom || "").localeCompare(b.prenom || "", 'fr');
                              if (prenomCompare !== 0) return prenomCompare;
                              return (a.nom || "").localeCompare(b.nom || "", 'fr');
                            }).map((macon) => {
                          const inTeam = isMaconInTeam(macon.id);
                          const status = getMaconStatus(macon.id);
                          const isAdding = addingIds.has(macon.id);

                          return (
                            <div 
                              key={macon.id}
                              className={`flex items-center justify-between gap-2 p-3 border border-border rounded-lg transition-colors ${
                                !inTeam && !isAdding && status.type !== "unavailable" ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!inTeam && !isAdding && status.type !== "unavailable") {
                                  handleAddMacon(macon.id, macon.nom || "", macon.prenom || "", "macon");
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-lg flex-shrink-0">👷‍♂️</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">
                                    {macon.prenom} {macon.nom}
                                  </p>
                                  {macon.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {macon.email}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {status && !inTeam && (
                                  <Badge 
                                    variant="outline"
                                    className={`whitespace-nowrap ${
                                      status.type === "available" 
                                        ? "bg-success/10 text-success border-success/20" 
                                        : status.type === "partial"
                                        ? "bg-warning/10 text-warning border-warning/20"
                                        : "bg-muted text-muted-foreground border-muted"
                                    }`}
                                  >
                                    {status.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={inTeam || isAdding || status.type === "unavailable"}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(macon.id, macon.nom || "", macon.prenom || "", "macon");
                                  }}
                                  title={
                                    inTeam 
                                      ? "Déjà dans votre équipe" 
                                      : status.type === "unavailable"
                                      ? "Indisponible cette semaine"
                                      : status.type === "partial"
                                      ? `${status.availableDays?.length || 0} jour(s) disponible(s)`
                                      : "Ajouter à l'équipe"
                                  }
                                >
                                  {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : inTeam ? (
                                    "✓ Ajouté"
                                  ) : (
                                    "+ Ajouter"
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg">
                            Aucun maçon disponible dans le système
                          </p>
                        )}
                      </div>
                    )}

                    {/* Colonne centrale : AJOUTER DES GRUTIERS */}
                    {showGrutiersSection && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                          AJOUTER DES GRUTIERS
                        </h3>
                        {loadingGrutiers ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredGrutiers && filteredGrutiers.length > 0 ? (
                          <div className="space-y-2">
                            {[...filteredGrutiers].sort((a, b) => {
                              const prenomCompare = (a.prenom || "").localeCompare(b.prenom || "", 'fr');
                              if (prenomCompare !== 0) return prenomCompare;
                              return (a.nom || "").localeCompare(b.nom || "", 'fr');
                            }).map((grutier) => {
                          const inTeam = isMaconInTeam(grutier.id);
                          const status = getMaconStatus(grutier.id);
                          const isAdding = addingIds.has(grutier.id);

                          return (
                            <div 
                              key={grutier.id}
                              className={`flex items-center justify-between gap-2 p-3 border border-border rounded-lg transition-colors ${
                                !inTeam && !isAdding && status.type !== "unavailable" ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!inTeam && !isAdding && status.type !== "unavailable") {
                                  handleAddMacon(grutier.id, grutier.nom || "", grutier.prenom || "", "grutier");
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-lg flex-shrink-0">🏗️</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">
                                    {grutier.prenom} {grutier.nom}
                                  </p>
                                  {grutier.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {grutier.email}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {status && !inTeam && (
                                  <Badge 
                                    variant="outline"
                                    className={`whitespace-nowrap ${
                                      status.type === "available" 
                                        ? "bg-success/10 text-success border-success/20" 
                                        : status.type === "partial"
                                        ? "bg-warning/10 text-warning border-warning/20"
                                        : "bg-muted text-muted-foreground border-muted"
                                    }`}
                                  >
                                    {status.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={inTeam || isAdding || status.type === "unavailable"}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(grutier.id, grutier.nom || "", grutier.prenom || "", "grutier");
                                  }}
                                  title={
                                    inTeam 
                                      ? "Déjà dans votre équipe" 
                                      : status.type === "unavailable"
                                      ? "Indisponible cette semaine"
                                      : status.type === "partial"
                                      ? `${status.availableDays?.length || 0} jour(s) disponible(s)`
                                      : "Ajouter à l'équipe"
                                  }
                                >
                                  {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : inTeam ? (
                                    "✓ Ajouté"
                                  ) : (
                                    "+ Ajouter"
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg">
                            Aucun grutier disponible dans le système
                          </p>
                        )}
                      </div>
                    )}

                    {/* Colonne droite : AJOUTER DES INTÉRIMAIRES */}
                    {showInterimairesSection && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                          AJOUTER DES INTÉRIMAIRES
                        </h3>
                        
                        {/* Bouton création d'urgence */}
                        <div className="mb-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowCreateInterimaireDialog(true)}
                            className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 dark:text-amber-400"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Créer intérimaire d'urgence
                          </Button>
                        </div>

                        {loadingInterimaires ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredInterimaires && filteredInterimaires.length > 0 ? (
                          <div className="space-y-2">
                            {[...filteredInterimaires].sort((a, b) => {
                              const prenomCompare = (a.prenom || "").localeCompare(b.prenom || "", 'fr');
                              if (prenomCompare !== 0) return prenomCompare;
                              return (a.nom || "").localeCompare(b.nom || "", 'fr');
                            }).map((interimaire) => {
                          const inTeam = isMaconInTeam(interimaire.id);
                          const status = getMaconStatus(interimaire.id);
                          const isAdding = addingIds.has(interimaire.id);

                          return (
                            <div 
                              key={interimaire.id}
                              className={`flex items-center justify-between gap-2 p-3 border border-border rounded-lg transition-colors ${
                                !inTeam && !isAdding && status.type !== "unavailable" ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!inTeam && !isAdding && status.type !== "unavailable") {
                                  handleAddMacon(interimaire.id, interimaire.nom || "", interimaire.prenom || "", "interimaire");
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-lg flex-shrink-0">🔄</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">
                                    {interimaire.prenom} {interimaire.nom}
                                  </p>
                                  {interimaire.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {interimaire.email}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {status && !inTeam && (
                                  <Badge 
                                    variant="outline"
                                    className={`whitespace-nowrap ${
                                      status.type === "available" 
                                        ? "bg-success/10 text-success border-success/20" 
                                        : status.type === "partial"
                                        ? "bg-warning/10 text-warning border-warning/20"
                                        : "bg-muted text-muted-foreground border-muted"
                                    }`}
                                  >
                                    {status.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={inTeam || isAdding || status.type === "unavailable"}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(interimaire.id, interimaire.nom || "", interimaire.prenom || "", "interimaire");
                                  }}
                                  title={
                                    inTeam 
                                      ? "Déjà dans votre équipe" 
                                      : status.type === "unavailable"
                                      ? "Indisponible cette semaine"
                                      : status.type === "partial"
                                      ? `${status.availableDays?.length || 0} jour(s) disponible(s)`
                                      : "Ajouter à l'équipe"
                                  }
                                >
                                  {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : inTeam ? (
                                    "✓ Ajouté"
                                  ) : (
                                    "+ Ajouter"
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg">
                        Aucun intérimaire disponible dans le système
                      </p>
                    )}
                  </div>
                )}

                    {/* Colonne 4 : AJOUTER DES FINISSEURS */}
                    {showFinisseursSection && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                          AJOUTER DES FINISSEURS
                        </h3>
                        {loadingFinisseurs ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredFinisseurs && filteredFinisseurs.length > 0 ? (
                          <div className="space-y-2">
                            {[...filteredFinisseurs].sort((a, b) => {
                              const prenomCompare = (a.prenom || "").localeCompare(b.prenom || "", 'fr');
                              if (prenomCompare !== 0) return prenomCompare;
                              return (a.nom || "").localeCompare(b.nom || "", 'fr');
                            }).map((finisseur) => {
                          const inTeam = isMaconInTeam(finisseur.id);
                          const status = getMaconStatus(finisseur.id);
                          const isAdding = addingIds.has(finisseur.id);
                          
                          // Vérifier si géré par un conducteur
                          const isManagedByConducteur = isFinisseurManagedByConducteur(finisseur.id);
                          
                          // Calculer le statut à afficher
                          const displayStatus = isManagedByConducteur 
                            ? { type: "managed-conducteur" as const, label: "Géré par conducteur" }
                            : status;
                          
                          // Bloquer si géré par conducteur ou indisponible
                          const isBlocked = inTeam || isAdding || status.type === "unavailable" || isManagedByConducteur;

                          return (
                            <div 
                              key={finisseur.id}
                              className={`flex items-center justify-between gap-2 p-3 border border-border rounded-lg transition-colors ${
                                !isBlocked ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!isBlocked) {
                                  handleAddMacon(finisseur.id, finisseur.nom || "", finisseur.prenom || "", "finisseur");
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-lg flex-shrink-0">🔨</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">
                                    {finisseur.prenom} {finisseur.nom}
                                  </p>
                                  {finisseur.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {finisseur.email}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {displayStatus && !inTeam && (
                                  <Badge 
                                    variant="outline"
                                    className={`whitespace-nowrap ${
                                      displayStatus.type === "available" 
                                        ? "bg-success/10 text-success border-success/20" 
                                        : displayStatus.type === "managed-conducteur"
                                        ? "bg-accent/50 text-accent-foreground border-accent"
                                        : displayStatus.type === "partial"
                                        ? "bg-warning/10 text-warning border-warning/20"
                                        : "bg-muted text-muted-foreground border-muted"
                                    }`}
                                  >
                                    {displayStatus.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={isBlocked}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(finisseur.id, finisseur.nom || "", finisseur.prenom || "", "finisseur");
                                  }}
                                  title={
                                    inTeam 
                                      ? "Déjà dans votre équipe" 
                                      : isManagedByConducteur
                                      ? "Ce finisseur est géré par un conducteur cette semaine"
                                      : status.type === "unavailable"
                                      ? "Indisponible cette semaine"
                                      : status.type === "partial"
                                      ? `${status.availableDays?.length || 0} jour(s) disponible(s)`
                                      : "Ajouter à l'équipe"
                                  }
                                >
                                  {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : inTeam ? (
                                    "✓ Ajouté"
                                  ) : (
                                    "+ Ajouter"
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg">
                        Aucun finisseur disponible dans le système
                      </p>
                    )}
                  </div>
                )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!maconToRemove} onOpenChange={() => setMaconToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {maconToRemove 
                ? `Retirer ${maconToRemove.role === 'interimaire' ? 'cet' : 'ce'} ${getRoleLabel(maconToRemove.role).toLowerCase()} de l'équipe ?`
                : 'Retirer de l\'équipe ?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {maconToRemove && (
                <>
                  <strong>{maconToRemove.prenom} {maconToRemove.nom}</strong> sera retiré de votre équipe.
                  <br /><br />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Ses fiches en cours de validation (non envoyées au RH) seront supprimées.
                  </span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Les fiches déjà validées par le conducteur seront conservées.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => maconToRemove && handleRemoveMacon(maconToRemove.id, maconToRemove.nom, maconToRemove.prenom, maconToRemove.role)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de création d'urgence d'intérimaire */}
      <InterimaireFormDialog
        open={showCreateInterimaireDialog}
        onOpenChange={setShowCreateInterimaireDialog}
        onSuccess={async (createdInterimaire) => {
          // Rafraîchir la liste des intérimaires
          await queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
          
          // Toast de succès avec option d'ajout immédiat
          toast({
            title: "✅ Intérimaire créé !",
            description: `${createdInterimaire?.prenom || ""} ${createdInterimaire?.nom || ""} a été créé et est maintenant disponible dans la liste.`,
          });

          // Réinitialiser la recherche pour afficher tous les intérimaires
          setSearchValue("all");
        }}
      />

      {/* Dialog de confirmation de dissolution */}
      <AlertDialog open={showDissolutionDialog} onOpenChange={setShowDissolutionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Dissoudre l'équipe ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Cette action va libérer <strong>{currentTeam?.filter(m => m.id !== chefId).length || 0} membre(s)</strong> de votre équipe.
                </p>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Membres concernés :</p>
                  <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                    {currentTeam?.filter(m => m.id !== chefId).map(m => (
                      <li key={m.id}>{m.prenom} {m.nom}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Leurs fiches en cours (non envoyées au RH) seront supprimées.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await dissoudreEquipe.mutateAsync({ chantierId, semaine, chefId });
                setShowDissolutionDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer la dissolution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de transfert d'équipe */}
      <Dialog open={showTransfertDialog} onOpenChange={setShowTransfertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transférer l'équipe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>{currentTeam?.filter(m => m.id !== chefId).length || 0} membre(s)</strong> seront transférés vers le nouveau chantier.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="destination-chantier">Chantier de destination</Label>
              <Select value={destinationChantierId} onValueChange={setDestinationChantierId}>
                <SelectTrigger id="destination-chantier">
                  <SelectValue placeholder="Sélectionner un chantier..." />
                </SelectTrigger>
                <SelectContent>
                  {otherActiveChantiers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code_chantier ? `${c.code_chantier} - ` : ""}{c.nom}
                      {c.ville ? ` (${c.ville})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
              ⚠️ Les fiches en cours (non envoyées au RH) seront supprimées.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfertDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!destinationChantierId) return;
                await transfererEquipe.mutateAsync({
                  sourceChantierId: chantierId,
                  destinationChantierId,
                  semaine,
                  chefId,
                });
                setShowTransfertDialog(false);
              }}
              disabled={!destinationChantierId || transfererEquipe.isPending}
            >
              {transfererEquipe.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmer le transfert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de sélection des jours d'affectation */}
      <DaysSelectionDialog
        open={!!memberToEditDays}
        onOpenChange={(open) => !open && setMemberToEditDays(null)}
        member={memberToEditDays}
        chefId={chefId}
        chantierId={chantierId}
        semaine={semaine}
        affectationId={memberToEditDays?.affectationId || null}
        entrepriseId={entrepriseId || ""}
        onSuccess={() => {
          refetchTeam();
          refetchAffectationsJours();
        }}
      />
    </>
  );
};
