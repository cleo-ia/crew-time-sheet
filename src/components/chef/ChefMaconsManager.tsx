import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Loader2, X, Crown, AlertTriangle } from "lucide-react";
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

interface ChefMaconsManagerProps {
  chefId: string;
  chantierId: string;
  semaine: string;
}

export const ChefMaconsManager = ({ chefId, chantierId, semaine }: ChefMaconsManagerProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [maconToRemove, setMaconToRemove] = useState<{id: string, nom: string, prenom: string, role: string} | null>(null);
  const [searchValue, setSearchValue] = useState<string>("all");
  const [showCreateInterimaireDialog, setShowCreateInterimaireDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer tous les maçons, grutiers et intérimaires du système
  const { data: allMacons, isLoading: loadingMacons } = useUtilisateursByRole("macon");
  const { data: allGrutiers, isLoading: loadingGrutiers } = useUtilisateursByRole("grutier");
  const { data: allInterimaires, isLoading: loadingInterimaires } = useUtilisateursByRole("interimaire");
  
  // Filtre défensif : garantir qu'on n'affiche que des maçons purs (role_metier = 'macon')
  const maconsPurs = (allMacons || []).filter(u => u.role_metier === 'macon');
  
  // Récupérer les maçons déjà dans l'équipe
  const { data: currentTeam, refetch: refetchTeam } = useMaconsByChantier(chantierId, semaine, chefId);
  
  // Récupérer toutes les affectations pour connaître le statut
  const { data: allAffectations, refetch: refetchAffectations } = useAffectations();
  
  // Hook pour créer une affectation
  const createAffectation = useCreateAffectation();
  
  // Hook pour mettre à jour une affectation
  const updateAffectation = useUpdateAffectation();
  
  // Hook pour supprimer les fiches lors du retrait
  const deleteFichesByMacon = useDeleteFichesByMacon();

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

  // Récupérer le statut d'un maçon (affectation active)
  const getMaconStatus = (maconId: string) => {
    // Vérifier si le maçon a une affectation active sur un autre chantier
    if (allAffectations) {
      const hasOtherAssignment = allAffectations.some(
        (aff: any) => 
          aff.macon_id === maconId && 
          aff.chantier_id !== chantierId && 
          aff.date_fin === null
      );
      
      if (hasOtherAssignment) {
        return { type: "assigned", label: "Déjà affecté" };
      }
    }
    
    return { type: "available", label: "Disponible" };
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

  // Déterminer quelles sections afficher
  const showMaconsSection = searchValue === "all" || 
    (searchValue !== "all" && maconsPurs?.some(m => m.id === searchValue));

  const showGrutiersSection = searchValue === "all" ||
    (searchValue !== "all" && allGrutiers?.some(g => g.id === searchValue));

  const showInterimairesSection = searchValue === "all" || 
    (searchValue !== "all" && allInterimaires?.some(i => i.id === searchValue));

  // Fonction utilitaire pour obtenir le label du rôle
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case "grutier":
        return "Grutier";
      case "interimaire":
        return "Intérimaire";
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

      if (existingAffectation) {
        // Réactiver l'affectation existante
        await updateAffectation.mutateAsync({
          id: existingAffectation.id,
          date_fin: null, // Retirer la date de fin pour réactiver
        });
      } else {
        // Créer une nouvelle affectation
        await createAffectation.mutateAsync({
          macon_id: maconId,
          chantier_id: chantierId,
          date_debut: today,
          date_fin: null,
        });
      }

      // Rafraîchir les données pour mettre à jour l'UI immédiatement
      await Promise.all([
        refetchAffectations(),
        refetchTeam(),
        queryClient.invalidateQueries({ queryKey: ["macons-chantier"] })
      ]);

      const roleLabel = getRoleLabel(role);
      toast({
        title: `${roleLabel} ajouté`,
        description: `${maconPrenom} ${maconNom} a été ajouté à votre équipe.`,
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
                isLoading={loadingMacons || loadingGrutiers || loadingInterimaires}
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
                            ) : (
                              <Badge 
                                variant="secondary" 
                                className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                              >
                                Maçon
                              </Badge>
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

              {(showMaconsSection || showGrutiersSection || showInterimairesSection) && (
                <>
                  <Separator className="my-6" />

                  {/* Grille 3 colonnes pour afficher maçons, grutiers et intérimaires côte à côte */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
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
                                !inTeam && !isAdding ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!inTeam && !isAdding) {
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
                                        : status.type === "assigned"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-warning/10 text-warning border-warning/20"
                                    }`}
                                  >
                                    {status.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={inTeam || isAdding}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(macon.id, macon.nom || "", macon.prenom || "", "macon");
                                  }}
                                  title={inTeam ? "Déjà dans votre équipe" : "Ajouter à l'équipe"}
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
                                !inTeam && !isAdding ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!inTeam && !isAdding) {
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
                                        : status.type === "assigned"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-warning/10 text-warning border-warning/20"
                                    }`}
                                  >
                                    {status.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={inTeam || isAdding}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(grutier.id, grutier.nom || "", grutier.prenom || "", "grutier");
                                  }}
                                  title={inTeam ? "Déjà dans votre équipe" : "Ajouter à l'équipe"}
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
                                !inTeam && !isAdding ? "hover:bg-muted/50 cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (!inTeam && !isAdding) {
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
                                        : status.type === "assigned"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-warning/10 text-warning border-warning/20"
                                    }`}
                                  >
                                    {status.label}
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  disabled={inTeam || isAdding}
                                  className="whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMacon(interimaire.id, interimaire.nom || "", interimaire.prenom || "", "interimaire");
                                  }}
                                  title={inTeam ? "Déjà dans votre équipe" : "Ajouter à l'équipe"}
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
    </>
  );
};
