import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Search, Copy, Users, Loader2, FileSpreadsheet, ChevronsUpDown, ChevronsDownUp, ArrowLeft, CheckCircle, Edit } from "lucide-react";
import { getNextWeek, getCurrentWeek, calculatePreviousWeek } from "@/lib/weekUtils";
import { useChantiers, useUpdateChantier } from "@/hooks/useChantiers";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
import { 
  usePlanningAffectations,
  useUpsertPlanningAffectation,
  useDeletePlanningAffectation,
  useRemoveEmployeFromChantier,
  useUpdatePlanningVehicule,
  useCopyPlanningWeek,
  getWeekDays,
} from "@/hooks/usePlanningAffectations";
import { PlanningWeekSelector } from "@/components/planning/PlanningWeekSelector";
import { PlanningChantierAccordion } from "@/components/planning/PlanningChantierAccordion";
import { generatePlanningExcel, preparePlanningData } from "@/lib/planningExcelExport";
import { useToast } from "@/hooks/use-toast";
import { usePlanningValidation } from "@/hooks/usePlanningValidation";

const PlanningMainOeuvre = () => {
  const currentWeek = getCurrentWeek();
  const [semaine, setSemaine] = useState(getNextWeek(currentWeek)); // Par défaut S+1
  const [searchQuery, setSearchQuery] = useState("");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  const entrepriseId = localStorage.getItem("current_entreprise_id") || "";
  const enterpriseConfig = useEnterpriseConfig();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Hook de validation du planning
  const { 
    isValidated, 
    isLoading: isLoadingValidation,
    validatePlanning, 
    invalidatePlanning,
    isValidating,
    isInvalidating
  } = usePlanningValidation(semaine);

  // Données
  const { data: chantiers = [], isLoading: loadingChantiers } = useChantiers();
  const { data: affectations = [], isLoading: loadingAffectations } = usePlanningAffectations(semaine);
  
  // Mutations
  const upsertAffectation = useUpsertPlanningAffectation();
  const deleteAffectation = useDeletePlanningAffectation();
  const removeEmploye = useRemoveEmployeFromChantier();
  const updateVehicule = useUpdatePlanningVehicule();
  const copyPlanning = useCopyPlanningWeek();
  const updateChantier = useUpdateChantier();

  const isLoading = loadingChantiers || loadingAffectations;
  const isMutating = upsertAffectation.isPending || deleteAffectation.isPending || 
                     removeEmploye.isPending || updateVehicule.isPending || copyPlanning.isPending ||
                     updateChantier.isPending;

  // Jours de la semaine
  const weekDays = useMemo(() => getWeekDays(semaine), [semaine]);

  // Chantiers actifs filtrés
  const filteredChantiers = useMemo(() => {
    let result = chantiers.filter(c => c.actif);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.nom.toLowerCase().includes(query) ||
        c.code_chantier?.toLowerCase().includes(query) ||
        c.ville?.toLowerCase().includes(query)
      );
    }

    // Trier par code chantier
    return result.sort((a, b) => 
      (a.code_chantier || "").localeCompare(b.code_chantier || "")
    );
  }, [chantiers, searchQuery]);

  // Affectations groupées par chantier
  const affectationsByChantier = useMemo(() => {
    const map: Record<string, typeof affectations> = {};
    affectations.forEach(aff => {
      if (!map[aff.chantier_id]) {
        map[aff.chantier_id] = [];
      }
      map[aff.chantier_id].push(aff);
    });
    return map;
  }, [affectations]);

  // Handlers
  const handleDayToggle = async (
    employeId: string, 
    chantierId: string, 
    date: string, 
    checked: boolean
  ) => {
    if (checked) {
      await upsertAffectation.mutateAsync({
        employe_id: employeId,
        chantier_id: chantierId,
        jour: date,
        semaine,
        entreprise_id: entrepriseId,
      });
    } else {
      await deleteAffectation.mutateAsync({
        employe_id: employeId,
        jour: date,
        semaine,
        entreprise_id: entrepriseId,
      });
    }
  };

  const handleVehiculeChange = async (
    employeId: string, 
    chantierId: string, 
    vehiculeId: string | null
  ) => {
    await updateVehicule.mutateAsync({
      employe_id: employeId,
      chantier_id: chantierId,
      semaine,
      vehicule_id: vehiculeId,
    });
  };

  const handleRemoveEmploye = async (employeId: string, chantierId: string) => {
    await removeEmploye.mutateAsync({
      employe_id: employeId,
      chantier_id: chantierId,
      semaine,
      entreprise_id: entrepriseId,
    });
  };

  const handleAddEmploye = async (
    employeId: string, 
    chantierId: string, 
    days: string[]
  ) => {
    // Créer une affectation pour chaque jour sélectionné
    for (const date of days) {
      await upsertAffectation.mutateAsync({
        employe_id: employeId,
        chantier_id: chantierId,
        jour: date,
        semaine,
        entreprise_id: entrepriseId,
      });
    }
  };

  const handleCopyFromPreviousWeek = async () => {
    const previousWeek = calculatePreviousWeek(semaine);
    await copyPlanning.mutateAsync({
      sourceWeek: previousWeek,
      targetWeek: semaine,
      entreprise_id: entrepriseId,
    });
    setCopyDialogOpen(false);
  };

  const handleHeuresChange = async (chantierId: string, heures: string) => {
    await updateChantier.mutateAsync({
      id: chantierId,
      heures_hebdo_prevues: heures,
    });
  };

  const handleInsertionChange = async (
    chantierId: string, 
    data: {
      statut_insertion: string;
      insertion_date_debut: string | null;
      insertion_heures_requises: number | null;
    }
  ) => {
    await updateChantier.mutateAsync({
      id: chantierId,
      statut_insertion: data.statut_insertion,
      insertion_date_debut: data.insertion_date_debut,
      insertion_heures_requises: data.insertion_heures_requises,
    });
    toast({
      title: "Insertion mise à jour",
      description: "Le statut d'insertion a été modifié.",
    });
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const planningData = preparePlanningData(filteredChantiers, affectationsByChantier, weekDays);
      await generatePlanningExcel(planningData, weekDays, semaine, enterpriseConfig.nom);
      toast({
        title: "Export réussi",
        description: `Le fichier Excel a été téléchargé.`,
      });
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageLayout>
      {/* Header avec nom entreprise et semaine */}
      <div className="border-b border-border/50 backdrop-blur-sm bg-primary/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/validation-conducteur')}
                className="h-9 w-9 bg-background hover:bg-muted border-primary/30"
              >
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
                  <Users className="h-6 w-6" />
                  {enterpriseConfig.nom} - Planning Main d'Oeuvre
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Planification hebdomadaire des effectifs sur les chantiers
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning text-lg px-3 py-1 font-bold">
              {semaine}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Affectations
          </CardTitle>

          <div className="flex items-center gap-4">
            <PlanningWeekSelector
              semaine={semaine}
              onSemaineChange={setSemaine}
              affectationsCount={affectations.length}
            />

            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isMutating || isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Export Excel
            </Button>

            <Button
              variant="outline"
              onClick={() => setCopyDialogOpen(true)}
              disabled={isMutating}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier S-1
            </Button>

            <Button
              variant="outline"
              onClick={() => setAllExpanded(!allExpanded)}
            >
              {allExpanded ? (
                <ChevronsDownUp className="h-4 w-4 mr-2" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 mr-2" />
              )}
              {allExpanded ? "Tout replier" : "Tout déplier"}
            </Button>

            {/* Bouton de validation du planning */}
            {isLoadingValidation ? (
              <Button variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </Button>
            ) : isValidated ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1.5">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Planning validé
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => invalidatePlanning()}
                  disabled={isInvalidating}
                >
                  {isInvalidating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4 mr-1" />
                  )}
                  Modifier
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                onClick={() => setValidateDialogOpen(true)}
                disabled={isValidating || affectations.length === 0}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Valider le planning
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chantier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Liste des chantiers */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredChantiers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun chantier actif trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChantiers.map(chantier => (
                <PlanningChantierAccordion
                  key={chantier.id}
                  chantier={chantier}
                  affectations={affectationsByChantier[chantier.id] || []}
                  allAffectations={affectations}
                  weekDays={weekDays}
                  semaine={semaine}
                  onDayToggle={handleDayToggle}
                  onVehiculeChange={handleVehiculeChange}
                  onRemoveEmploye={handleRemoveEmploye}
                  onAddEmploye={handleAddEmploye}
                  onHeuresChange={handleHeuresChange}
                  onInsertionChange={handleInsertionChange}
                  isLoading={isMutating}
                  forceOpen={allExpanded}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog confirmation copie */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copier le planning ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va copier toutes les affectations de la semaine {calculatePreviousWeek(semaine)} vers {semaine}.
              Les affectations existantes pour {semaine} seront remplacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCopyFromPreviousWeek}
              disabled={copyPlanning.isPending}
            >
              {copyPlanning.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog confirmation validation */}
      <AlertDialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider le planning {semaine} ?</AlertDialogTitle>
            <AlertDialogDescription>
              En validant ce planning, il sera pris en compte par la synchronisation automatique du lundi à 5h.
              <br /><br />
              <strong>{affectations.length}</strong> affectation(s) seront synchronisées vers les équipes.
              <br /><br />
              Vous pourrez modifier le planning après validation en cliquant sur "Modifier".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                validatePlanning();
                setValidateDialogOpen(false);
              }}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Valider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default PlanningMainOeuvre;
