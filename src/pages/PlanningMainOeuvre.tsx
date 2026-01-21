import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Copy, Users, Loader2 } from "lucide-react";
import { getNextWeek, getCurrentWeek, calculatePreviousWeek } from "@/lib/weekUtils";
import { useChantiers } from "@/hooks/useChantiers";
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

const PlanningMainOeuvre = () => {
  const currentWeek = getCurrentWeek();
  const [semaine, setSemaine] = useState(getNextWeek(currentWeek)); // Par défaut S+1
  const [searchQuery, setSearchQuery] = useState("");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const entrepriseId = localStorage.getItem("current_entreprise_id") || "";

  // Données
  const { data: chantiers = [], isLoading: loadingChantiers } = useChantiers();
  const { data: affectations = [], isLoading: loadingAffectations } = usePlanningAffectations(semaine);
  
  // Mutations
  const upsertAffectation = useUpsertPlanningAffectation();
  const deleteAffectation = useDeletePlanningAffectation();
  const removeEmploye = useRemoveEmployeFromChantier();
  const updateVehicule = useUpdatePlanningVehicule();
  const copyPlanning = useCopyPlanningWeek();

  const isLoading = loadingChantiers || loadingAffectations;
  const isMutating = upsertAffectation.isPending || deleteAffectation.isPending || 
                     removeEmploye.isPending || updateVehicule.isPending || copyPlanning.isPending;

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

  return (
    <PageLayout>
      {/* Header simple sans PageHeader car celui-ci nécessite des props spécifiques */}
      <div className="border-b border-border/50 backdrop-blur-sm bg-primary/10 sticky top-[48px] z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Users className="h-6 w-6" />
            Planning Main d'Oeuvre
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planification hebdomadaire des effectifs sur les chantiers
          </p>
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
              onClick={() => setCopyDialogOpen(true)}
              disabled={isMutating}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier S-1
            </Button>
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
                  isLoading={isMutating}
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
    </PageLayout>
  );
};

export default PlanningMainOeuvre;
