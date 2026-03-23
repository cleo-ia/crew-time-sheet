import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Copy, Users, Loader2, FileSpreadsheet, ChevronsUpDown, ChevronsDownUp, ArrowLeft, CheckCircle, Edit, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { clearCacheAndReload } from "@/hooks/useClearCache";
import { cn } from "@/lib/utils";
import { getNextWeek, getCurrentWeek, calculatePreviousWeek } from "@/lib/weekUtils";
import { isFridayOrWeekendParis, isCurrentWeek as isCurrentWeekCheck } from "@/lib/date";
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
import { useSyncPlanningToTeams } from "@/hooks/useSyncPlanningToTeams";
import { useAbsencesLongueDureePlanning } from "@/hooks/useAbsencesLongueDureePlanning";
import { useLogModification } from "@/hooks/useLogModification";
import { useCurrentUserInfo } from "@/hooks/useCurrentUserInfo";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { DemandeCongeDetailDialog } from "@/components/conges/DemandeCongeDetailDialog";
import { AbsenceLDDetailDialog } from "@/components/conges/AbsenceLDDetailDialog";
import type { DemandeConge } from "@/hooks/useDemandesConges";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Hook pour récupérer les chefs avec leur chantier principal
const useChefsWithPrincipal = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["chefs-chantier-principal", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return new Map<string, string>();
      
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, chantier_principal_id")
        .eq("entreprise_id", entrepriseId)
        .not("chantier_principal_id", "is", null);
      
      if (error) throw error;
      
      // Créer une Map chef_id -> chantier_principal_id
      const map = new Map<string, string>();
      (data || []).forEach((chef) => {
        if (chef.chantier_principal_id) {
          map.set(chef.id, chef.chantier_principal_id);
        }
      });
      
      return map;
    },
    enabled: !!entrepriseId,
  });
};

// Hook pour recalculer le chantier principal des chefs en fonction des affectations réelles de la semaine
// Corrige le cas où chantier_principal_id pointe vers un chantier où le chef n'est plus affecté
const useChefsWithPrincipalResolved = (
  chefsWithPrincipal: Map<string, string>,
  affectations: any[],
) => {
  return useMemo(() => {
    if (!affectations.length) return chefsWithPrincipal;

    // Construire une map: chefId -> { chantierId -> nbJours }
    const chefChantierDays = new Map<string, Map<string, number>>();
    for (const aff of affectations) {
      if (aff.employe?.role_metier !== "chef") continue;
      const empId = aff.employe_id;
      if (!chefChantierDays.has(empId)) {
        chefChantierDays.set(empId, new Map());
      }
      const chantierMap = chefChantierDays.get(empId)!;
      chantierMap.set(aff.chantier_id, (chantierMap.get(aff.chantier_id) || 0) + 1);
    }

    // Pour chaque chef multi-chantier, vérifier la cohérence
    const resolved = new Map(chefsWithPrincipal);
    for (const [chefId, chantierMap] of chefChantierDays) {
      if (chantierMap.size < 2) continue; // mono-chantier → pas de problème
      
      const currentPrincipal = resolved.get(chefId);
      const chantierIds = [...chantierMap.keys()];
      
      // Si le principal actuel ne fait pas partie des chantiers de la semaine → recalculer
      if (!currentPrincipal || !chantierIds.includes(currentPrincipal)) {
        // Prendre le chantier avec le plus de jours
        let bestChantier = chantierIds[0];
        let maxDays = chantierMap.get(bestChantier) || 0;
        for (const [cId, days] of chantierMap) {
          if (days > maxDays) {
            bestChantier = cId;
            maxDays = days;
          }
        }
        resolved.set(chefId, bestChantier);
      }
    }

    return resolved;
  }, [chefsWithPrincipal, affectations]);
};

const PlanningMainOeuvre = () => {
  const currentWeek = getCurrentWeek();
  const [semaine, setSemaine] = useState(getNextWeek(currentWeek)); // Par défaut S+1
  const [searchQuery, setSearchQuery] = useState("");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [selectedConge, setSelectedConge] = useState<DemandeConge | null>(null);
  const [selectedAbsenceLD, setSelectedAbsenceLD] = useState<{
    id: string;
    type_absence: string;
    date_debut: string;
    date_fin: string | null;
    motif: string | null;
    salarie_nom: string;
  } | null>(null);

  const entrepriseId = localStorage.getItem("current_entreprise_id") || "";
  const enterpriseConfig = useEnterpriseConfig();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Hook de validation du planning
  const { 
    isValidated, 
    isLoading: isLoadingValidation,
    validatePlanning, 
    invalidatePlanning,
    isValidating,
    isInvalidating
  } = usePlanningValidation(semaine);

  // Hook de synchronisation manuelle
  const { syncPlanningToTeams, isSyncing } = useSyncPlanningToTeams();
  const logModification = useLogModification();
  const userInfo = useCurrentUserInfo();
  const { data: userRole } = useCurrentUserRole();

  // Données
  const { data: chantiers = [], isLoading: loadingChantiers } = useChantiers();
  const { data: affectations = [], isLoading: loadingAffectations } = usePlanningAffectations(semaine);
  const { data: chefsWithPrincipalRaw = new Map() } = useChefsWithPrincipal();
  const chefsWithPrincipal = useChefsWithPrincipalResolved(chefsWithPrincipalRaw, affectations);
  const { data: absencesLDByEmploye = new Map() } = useAbsencesLongueDureePlanning(semaine);
  
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

  // Verrouillage du planning : semaine courante + vendredi/samedi/dimanche
  const isPlanningLocked = isCurrentWeekCheck(semaine) && isFridayOrWeekendParis();

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
    // Bloquer le toggle des jours pour les chefs (5/5 obligatoire)
    const empAff = affectations.find(a => a.employe_id === employeId);
    if (empAff?.employe?.role_metier === "chef" && !checked) {
      toast({
        title: "Jours verrouillés",
        description: "Un chef doit être affecté 5/5 jours sur chaque chantier pour pouvoir répartir ses heures.",
      });
      return;
    }

    // Bloquer si absence longue durée
    const absenceLD = absencesLDByEmploye.get(employeId);
    if (checked && absenceLD?.dates.has(date)) {
      toast({
        title: "Jour bloqué",
        description: `Ce salarié est en absence longue durée (${absenceLD.type}) ce jour-là.`,
        variant: "destructive",
      });
      return;
    }

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

    // ✅ CORRECTIF: Si on retire un chef et qu'il ne reste qu'un seul chef sur ce chantier,
    // auto-set is_chef_responsable = true pour le chef restant
    const { data: empData } = await supabase
      .from("utilisateurs")
      .select("role_metier")
      .eq("id", employeId)
      .maybeSingle();

    if (empData?.role_metier === "chef") {
      // Récupérer les chefs restants sur ce chantier pour cette semaine
      const { data: remainingAffs } = await supabase
        .from("planning_affectations")
        .select("employe_id, utilisateurs!planning_affectations_employe_id_fkey(role_metier)")
        .eq("chantier_id", chantierId)
        .eq("semaine", semaine)
        .eq("entreprise_id", entrepriseId);

      const remainingChefIds = [...new Set(
        (remainingAffs || [])
          .filter((a: any) => a.utilisateurs?.role_metier === "chef")
          .map((a: any) => a.employe_id)
      )];

      // S'il ne reste qu'un seul chef, le marquer automatiquement comme responsable
      if (remainingChefIds.length === 1) {
        await supabase
          .from("planning_affectations")
          .update({ is_chef_responsable: true })
          .eq("employe_id", remainingChefIds[0])
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine)
          .eq("entreprise_id", entrepriseId);

        queryClient.invalidateQueries({ queryKey: ["planning-affectations", semaine] });
      }

      // ✅ Vérifier si le chantier_principal_id du chef retiré est toujours valide
      const currentPrincipal = chefsWithPrincipal.get(employeId);
      if (currentPrincipal === chantierId) {
        // Le chef est retiré du chantier qui était son principal → recalculer
        // Chercher les autres chantiers du chef cette semaine
        const { data: chefOtherAffs } = await supabase
          .from("planning_affectations")
          .select("chantier_id")
          .eq("employe_id", employeId)
          .eq("semaine", semaine)
          .eq("entreprise_id", entrepriseId);

        const otherChantierIds = [...new Set((chefOtherAffs || []).map((a: any) => a.chantier_id))];
        
        if (otherChantierIds.length > 0) {
          // Mettre à jour vers le premier chantier restant
          await supabase
            .from("utilisateurs")
            .update({ chantier_principal_id: otherChantierIds[0] })
            .eq("id", employeId);
          queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });
        }
      }
    }
  };

  const handleAddEmploye = async (
    employeId: string, 
    chantierId: string, 
    days: string[]
  ) => {
    // Filtrer les jours en absence longue durée
    const absenceLD = absencesLDByEmploye.get(employeId);
    const filteredDays = absenceLD 
      ? days.filter(d => !absenceLD.dates.has(d))
      : days;

    // Créer une affectation pour chaque jour sélectionné
    for (const date of filteredDays) {
      await upsertAffectation.mutateAsync({
        employe_id: employeId,
        chantier_id: chantierId,
        jour: date,
        semaine,
        entreprise_id: entrepriseId,
      });
    }

    // Logger l'affectation
    if (userInfo && filteredDays.length > 0) {
      const { data: empInfo } = await supabase
        .from("utilisateurs")
        .select("nom, prenom")
        .eq("id", employeId)
        .maybeSingle();
      const chantierInfo = chantiers.find(c => c.id === chantierId);
      const nomSalarie = empInfo ? `${empInfo.prenom} ${empInfo.nom}`.trim() : employeId;
      const nomChantier = chantierInfo?.nom || chantierId;

      logModification.mutate({
        entrepriseId: userInfo.entrepriseId,
        userId: userInfo.userId,
        userName: userInfo.userName,
        action: "affectation_planning",
        details: {
          message: `Affectation : ${nomSalarie} affecté au chantier ${nomChantier} (${filteredDays.length} jour${filteredDays.length > 1 ? "s" : ""})`,
          salarie: nomSalarie,
          chantier: nomChantier,
          semaine,
        },
        userRole: userRole || null,
      });
    }

    // Vérifier si c'est un chef (via une requête)
    const { data: empData } = await supabase
      .from("utilisateurs")
      .select("role_metier")
      .eq("id", employeId)
      .maybeSingle();

    if (empData?.role_metier === "chef") {
      // 1. TOUJOURS associer le chef au chantier si pas de chef_id existant
      const { data: chantierData } = await supabase
        .from("chantiers")
        .select("chef_id")
        .eq("id", chantierId)
        .single();

      if (!chantierData?.chef_id) {
        await supabase
          .from("chantiers")
          .update({ chef_id: employeId })
          .eq("id", chantierId);
        
        queryClient.invalidateQueries({ queryKey: ["chantiers"] });
        
        toast({
          title: "Chef associé au chantier",
          description: "Ce chef est désormais responsable de ce chantier.",
        });
      }

      // 2. Vérifier la cohérence du chantier_principal_id
      // Si le chef a déjà un principal qui n'est plus dans ses chantiers de la semaine, le recalculer
      const currentPrincipal = chefsWithPrincipal.get(employeId);
      const chefChantierIds = [...new Set(
        affectations
          .filter(a => a.employe_id === employeId)
          .map(a => a.chantier_id)
      ), chantierId]; // inclure le nouveau chantier
      
      if (!currentPrincipal || !chefChantierIds.includes(currentPrincipal)) {
        // Définir le chantier principal (premier chantier ou le nouveau)
        const newPrincipal = currentPrincipal && chefChantierIds.includes(currentPrincipal) 
          ? currentPrincipal 
          : chantierId;
        
        await supabase
          .from("utilisateurs")
          .update({ chantier_principal_id: newPrincipal })
          .eq("id", employeId);

        queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });

        if (!currentPrincipal) {
          toast({
            title: "Chantier principal défini",
            description: "Les heures du chef seront comptées sur ce chantier.",
          });
        }
      }

      // 3. Auto-marquer comme chef responsable si aucun autre chef n'est responsable sur ce chantier
      const chantierAffs = affectations.filter(a => a.chantier_id === chantierId);
      const hasExistingResponsable = chantierAffs.some(a => a.is_chef_responsable);
      if (!hasExistingResponsable) {
        // Marquer toutes les affectations de ce chef sur ce chantier comme responsable
        await supabase
          .from("planning_affectations")
          .update({ is_chef_responsable: true })
          .eq("employe_id", employeId)
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine)
          .eq("entreprise_id", entrepriseId);
        
        queryClient.invalidateQueries({ queryKey: ["planning-affectations", semaine] });
      }
    }
  };

  const handleSetChefResponsable = async (employeId: string, chantierId: string) => {
    // 1. Retirer is_chef_responsable de tous les chefs sur ce chantier/semaine
    const chefIds = affectations
      .filter(a => a.chantier_id === chantierId && a.is_chef_responsable)
      .map(a => a.employe_id);
    
    const uniqueChefIds = [...new Set(chefIds)];
    for (const chefId of uniqueChefIds) {
      await supabase
        .from("planning_affectations")
        .update({ is_chef_responsable: false })
        .eq("employe_id", chefId)
        .eq("chantier_id", chantierId)
        .eq("semaine", semaine)
        .eq("entreprise_id", entrepriseId);
    }

    // 2. Marquer le nouveau chef responsable
    await supabase
      .from("planning_affectations")
      .update({ is_chef_responsable: true })
      .eq("employe_id", employeId)
      .eq("chantier_id", chantierId)
      .eq("semaine", semaine)
      .eq("entreprise_id", entrepriseId);

    queryClient.invalidateQueries({ queryKey: ["planning-affectations", semaine] });
    
    toast({
      title: "Chef responsable modifié",
      description: "Ce chef gère désormais la saisie des heures de l'équipe sur ce chantier.",
    });
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

  const handleAbsenceClick = useCallback(async (employeId: string, date: string) => {
    const absenceData = absencesLDByEmploye.get(employeId);
    if (!absenceData?.details) return;
    
    const detail = absenceData.details.get(date);
    if (!detail) return;

    if (detail.source === "conge") {
      // Fetch le congé complet
      const { data: conge } = await supabase
        .from("demandes_conges")
        .select("*, demandeur:utilisateurs!demandes_conges_demandeur_id_fkey(nom, prenom)")
        .eq("id", detail.id)
        .maybeSingle();
      
      if (conge) {
        setSelectedConge(conge as any);
      }
    } else {
      // Fetch l'absence longue durée
      const { data: ald } = await supabase
        .from("absences_longue_duree")
        .select("*, salarie:utilisateurs!absences_longue_duree_salarie_id_fkey(nom, prenom)")
        .eq("id", detail.id)
        .maybeSingle();
      
      if (ald) {
        const salarie = ald.salarie as any;
        setSelectedAbsenceLD({
          id: ald.id,
          type_absence: ald.type_absence,
          date_debut: ald.date_debut,
          date_fin: ald.date_fin,
          motif: ald.motif,
          salarie_nom: salarie ? `${salarie.prenom} ${salarie.nom}`.trim() : "",
        });
      }
    }
  }, [absencesLDByEmploye]);

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

      {/* Bandeau de verrouillage planning */}
      {isPlanningLocked && (
        <div className="container mx-auto px-4 mt-4">
          <div className="px-4 py-3 rounded-lg border-2 bg-amber-50 border-amber-400 dark:bg-amber-950/40 dark:border-amber-700 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              Planning verrouillé le vendredi — les modifications sont bloquées pour la semaine en cours
            </span>
          </div>
        </div>
      )}

      {/* Bandeau de statut de validation - très visible */}
      {!isLoadingValidation && (
        <div className={cn(
          "container mx-auto px-4 mt-4",
        )}>
          <div className={cn(
            "px-4 py-3 rounded-lg border-2 flex items-center justify-between",
            isValidated 
              ? "bg-green-50 border-green-400 dark:bg-green-950/40 dark:border-green-700"
              : "bg-amber-50 border-amber-400 dark:bg-amber-950/40 dark:border-amber-700"
          )}>
            <div className="flex items-center gap-3">
              {isValidated ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="font-semibold text-green-800 dark:text-green-200 text-lg">
                      Planning validé ✓
                    </span>
                    <span className="text-green-700 dark:text-green-300 ml-2">
                      — Synchronisation prévue lundi 5h00
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold text-amber-800 dark:text-amber-200 text-lg">
                      Planning non validé
                    </span>
                    <span className="text-amber-700 dark:text-amber-300 ml-2">
                      — Ne sera pas synchronisé lundi
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {isValidated ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await syncPlanningToTeams(semaine);
                    if (userInfo) {
                      logModification.mutate({
                        entrepriseId: userInfo.entrepriseId,
                        userId: userInfo.userId,
                        userName: userInfo.userName,
                        action: "sync_planning",
                        details: { message: `Synchronisation du planning envoyée aux chefs (Semaine ${semaine})`, semaine },
                        userRole: userRole || null,
                      });
                    }
                  }}
                  disabled={isSyncing || isPlanningLocked}
                  className="border-green-400 hover:bg-green-100 dark:border-green-600 dark:hover:bg-green-900/50"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Synchroniser maintenant
                </Button>
                <Button
                  variant="outline"
                  onClick={() => invalidatePlanning()}
                  disabled={isInvalidating}
                  className="border-green-400 hover:bg-green-100 dark:border-green-600 dark:hover:bg-green-900/50"
                >
                  {isInvalidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  Modifier
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setValidateDialogOpen(true)}
                disabled={isValidating || affectations.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
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
        </div>
      )}

      <div className="container mx-auto px-4 mt-3 flex justify-center">
        <div className="inline-flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-xl leading-none mt-0.5">💡</span>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            <strong>Pour info :</strong> un chantier tampon <strong>« ÉCOLE »</strong> a été créé. Il sert à affecter les employés en apprentissage qui ne sont sur aucun chantier réel.
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
                  chefsWithPrincipal={chefsWithPrincipal}
                  onSetChefResponsable={handleSetChefResponsable}
                  absencesLDByEmploye={absencesLDByEmploye}
                  onAbsenceClick={handleAbsenceClick}
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

      {/* Bouton vider le cache */}
      <div className="flex justify-center py-6">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground text-xs gap-2"
          onClick={() => {
            if (confirm("Vider le cache et recharger l'application ?")) {
              clearCacheAndReload();
            }
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Problème d'affichage ? Vider le cache
        </Button>
      </div>

      {/* Dialog détail congé */}
      <DemandeCongeDetailDialog
        demande={selectedConge}
        open={!!selectedConge}
        onOpenChange={(open) => { if (!open) setSelectedConge(null); }}
      />

      <AbsenceLDDetailDialog
        absence={selectedAbsenceLD}
        open={!!selectedAbsenceLD}
        onOpenChange={(open) => { if (!open) setSelectedAbsenceLD(null); }}
      />
    </PageLayout>
  );
};

export default PlanningMainOeuvre;
