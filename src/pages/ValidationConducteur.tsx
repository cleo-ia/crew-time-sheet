import { useState, useEffect, useMemo, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useInitialWeek } from "@/hooks/useInitialWeek";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConducteurHistorique } from "@/components/conducteur/ConducteurHistorique";
import { Calendar, FileText, FileCheck, CheckCircle2, Clock, Cloud, AlertTriangle, RefreshCw, ShieldCheck, Package, Save, Loader2 } from "lucide-react";
import { clearCacheAndReload } from "@/hooks/useClearCache";
import { WeekSelector } from "@/components/timesheet/WeekSelector";
import { TimeEntryTable } from "@/components/timesheet/TimeEntryTable";
import { FichesFilters } from "@/components/validation/FichesFilters";
import { FichesList } from "@/components/validation/FichesList";
import { FicheDetail } from "@/components/validation/FicheDetail";
import { FinisseursDispatchWeekly } from "@/components/conducteur/FinisseursDispatchWeekly";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TransportSheetV2 } from "@/components/transport/TransportSheetV2";
import { useSaveFiche, type EmployeeData } from "@/hooks/useSaveFiche";
import { useSaveChantierManuel } from "@/hooks/useSaveChantierManuel";
import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { parseISOWeek } from "@/lib/weekUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useFinisseursByConducteur } from "@/hooks/useFinisseursByConducteur";
import { useAffectationsByConducteur, useAffectationsFinisseursJours } from "@/hooks/useAffectationsFinisseursJours";
import { useChantiers } from "@/hooks/useChantiers";
import { WeeklyForecastDialog } from "@/components/weather/WeeklyForecastDialog";
import { useFichesEnAttentePourConducteur } from "@/hooks/useFichesEnAttentePourConducteur";
import { ConversationButton } from "@/components/chat/ConversationButton";
import { ConversationListSheet } from "@/components/chat/ConversationListSheet";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWeekTransmissionStatus } from "@/hooks/useWeekTransmissionStatus";
import { CongesButton } from "@/components/conges/CongesButton";
import { CongesListSheet } from "@/components/conges/CongesListSheet";
import { useDemandesEnAttente } from "@/hooks/useDemandesConges";
import { useDemandesTraiteesNonLues } from "@/hooks/useDemandesTraiteesNonLues";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransportMateriauxButton } from "@/components/conducteur/TransportMateriauxButton";
import { useFicheId } from "@/hooks/useFicheId";
import { InventoryDashboard } from "@/components/conducteur/InventoryDashboard";
import { useFeatureEnabled } from "@/hooks/useEnterpriseConfig";

// Wrapper pour appeler useFicheId dans une boucle (règle des hooks React)
const TransportSheetWithFicheInner = ({ 
  selectedWeek, 
  selectedWeekString, 
  chantierId, 
  conducteurId,
  isReadOnly,
  finisseursEquipe,
  assignedDates
}: {
  selectedWeek: Date;
  selectedWeekString: string;
  chantierId: string | null;
  conducteurId: string;
  isReadOnly: boolean | undefined;
  finisseursEquipe: { id: string; nom: string; prenom: string; ficheJours?: Array<{ date: string; heures?: number; trajet_perso?: boolean; code_trajet?: string | null }> }[];
  assignedDates?: string[];
}) => {
  const { data: ficheId, isLoading } = useFicheId(
    selectedWeekString, 
    conducteurId, 
    chantierId
  );

  // Guard de chargement pour éviter les re-renders instables qui ferment les Popovers
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Chargement de la fiche de trajet...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <TransportSheetV2
      selectedWeek={selectedWeek}
      selectedWeekString={selectedWeekString}
      chantierId={chantierId}
      chefId={conducteurId}
      conducteurId={conducteurId}
      ficheId={ficheId}
      isReadOnly={isReadOnly}
      mode="conducteur"
      finisseursEquipe={finisseursEquipe}
      assignedDates={assignedDates}
    />
  );
};

// Wrapper mémoïsé pour éviter les re-renders qui ferment les Popovers
const TransportSheetWithFiche = memo(TransportSheetWithFicheInner, (prevProps, nextProps) => {
  // Comparer uniquement les valeurs importantes (pas les références d'objets)
  return (
    prevProps.selectedWeekString === nextProps.selectedWeekString &&
    prevProps.chantierId === nextProps.chantierId &&
    prevProps.conducteurId === nextProps.conducteurId &&
    prevProps.isReadOnly === nextProps.isReadOnly &&
    // Comparer les finisseurs par leurs IDs
    prevProps.finisseursEquipe.length === nextProps.finisseursEquipe.length &&
    prevProps.finisseursEquipe.every((f, i) => f.id === nextProps.finisseursEquipe[i]?.id) &&
    // Comparer les dates assignées
    JSON.stringify(prevProps.assignedDates) === JSON.stringify(nextProps.assignedDates)
  );
});


const ValidationConducteur = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Initialiser l'onglet selon le paramètre "tab" dans l'URL
  const initialTabFromUrl = (() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "mes-heures" || tabParam === "validation" || tabParam === "inventaire") return tabParam;
    
    // Si pas de "tab" mais qu'il y a des deep links (chantier/semaine), ouvrir validation
    const hasDeepLink = !!(searchParams.get("chantier") || searchParams.get("semaine"));
    return hasDeepLink ? "validation" : "mes-heures";
  })();
  
  const [activeMainTab, setActiveMainTab] = useState(initialTabFromUrl);
  
  // Détection Super Admin
  const { data: userRole } = useCurrentUserRole();
  const isSuperAdmin = userRole === "super_admin";
  const inventaireEnabled = useFeatureEnabled("inventaireChantier");
  
  // Liste des conducteurs (pour super admin)
  const { data: conducteursList = [] } = useUtilisateursByRole(isSuperAdmin ? "conducteur" : undefined);
  const [selectedConducteurIdAdmin, setSelectedConducteurIdAdmin] = useState<string | null>(null);
  
  // États pour l'onglet "Mes heures"
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conducteurId, setConducteurId] = useState<string | null>(null);
  const [affectationsLocal, setAffectationsLocal] = useState<Array<{ finisseur_id: string; date: string; chantier_id: string }> | null>(null);
  const [showWeatherDialog, setShowWeatherDialog] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [showConges, setShowConges] = useState(false);
  
  // Hook pour la sauvegarde manuelle par chantier
  const { saveChantier, savingChantier } = useSaveChantierManuel();
  
  // ID effectif du conducteur (super admin peut sélectionner un autre conducteur)
  const effectiveConducteurId = isSuperAdmin ? selectedConducteurIdAdmin : conducteurId;
  
  // Hook pour compter les fiches en attente de validation pour CE conducteur
  const { data: nbFichesEnAttente = 0 } = useFichesEnAttentePourConducteur(effectiveConducteurId);
  const { data: unreadData } = useUnreadMessages(effectiveConducteurId);
  const { data: nbCongesEnAttente = 0 } = useDemandesEnAttente(effectiveConducteurId);
  
  const fromSignature = sessionStorage.getItem('fromSignature') === 'true';
  const urlWeek = searchParams.get("semaine");
  
  // Hook intelligent qui détermine la bonne semaine (courante ou suivante si transmise)
  // DÉSACTIVÉ si on vient de signer (l'URL est la source de vérité)
  const { data: initialWeek, isLoading: isLoadingWeek } = useInitialWeek(
    fromSignature ? null : urlWeek, // Ne pas utiliser useInitialWeek si on vient de signer
    fromSignature ? null : (effectiveConducteurId || null),
    null // null car conducteur n'a pas de chantier fixe
  );
  
  // Si on vient de signer, utiliser UNIQUEMENT la semaine de l'URL
  const defaultWeek = fromSignature && urlWeek 
    ? urlWeek 
    : (initialWeek || format(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }), "RRRR-'S'II"));
  
  const [selectedWeek, setSelectedWeek] = useState<string>(defaultWeek);
  
  // État pour tracker si l'utilisateur a manuellement sélectionné une semaine
  const [userHasManuallySelectedWeek, setUserHasManuallySelectedWeek] = useState(false);
  
  // Wrapper pour préserver la sélection manuelle de l'utilisateur
  const handleWeekChange = (week: string) => {
    setUserHasManuallySelectedWeek(true);
    setSelectedWeek(week);
  };
  
  // Mettre à jour selectedWeek quand initialWeek change (sauf si on vient de signer OU sélection manuelle)
  useEffect(() => {
    const isFromSignature = sessionStorage.getItem('fromSignature') === 'true';
    
    // Ne JAMAIS écraser si on vient de signer OU si l'utilisateur a sélectionné manuellement
    if (isFromSignature || userHasManuallySelectedWeek) return;
    
    // Sinon, suivre la logique normale de useInitialWeek
    if (initialWeek) {
      setSelectedWeek(initialWeek);
    }
  }, [initialWeek, userHasManuallySelectedWeek]);

  // Synchroniser l'URL avec la semaine et l'onglet actif
  useEffect(() => {
    if (!selectedWeek) return;
    const params = new URLSearchParams(searchParams);
    params.set("tab", activeMainTab);
    params.set("semaine", selectedWeek);
    navigate(`/validation-conducteur?${params.toString()}`, { replace: true });
  }, [selectedWeek, activeMainTab]);
  
  // États pour l'onglet "Validation"
  const [selectedFiche, setSelectedFiche] = useState<string | null>(null);
  const [validationTab, setValidationTab] = useState("a-valider");
  const [filters, setFilters] = useState({
    semaine: "",
    chantier: "",
    chef: "",
  });

  const saveFiche = useSaveFiche();
  const { toast } = useToast();

  // Récupérer l'ID du conducteur connecté via utilisateurs.id (pas auth.user.id)
  useEffect(() => {
    const fetchConducteurId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Chercher l'entrée utilisateur correspondant à cet auth.user.id
      const { data: utilisateur } = await supabase
        .from("utilisateurs")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      
      if (utilisateur) {
        // Utiliser utilisateurs.id (clé étrangère valide pour affectations_finisseurs_jours)
        setConducteurId(utilisateur.id);
      } else {
        // Fallback pour compatibilité (anciens comptes où id = auth_user_id)
        setConducteurId(user.id);
      }
    };
    fetchConducteurId();
  }, []);
  
  // Vérifier si la semaine a déjà été transmise
  const { data: transmissionStatus } = useWeekTransmissionStatus(selectedWeek, effectiveConducteurId);
  
  // Charger les finisseurs
  const { data: allFinisseurs = [] } = useFinisseursByConducteur(effectiveConducteurId, selectedWeek);

  // Filtrer pour ne garder que ceux avec au moins 1 jour affecté cette semaine
  const finisseurs = useMemo(() => {
    return allFinisseurs.filter(f => f.affectedDays && f.affectedDays.length > 0);
  }, [allFinisseurs]);
  
  // Charger les chantiers pour afficher les noms
  const { data: chantiers = [] } = useChantiers();
  const chantiersMap = useMemo(() => {
    const map = new Map<string, { nom: string; code: string | null }>();
    chantiers.forEach(ch => {
      map.set(ch.id, { nom: ch.nom, code: ch.code_chantier });
    });
    return map;
  }, [chantiers]);

  // Grouper les finisseurs par chantier pour l'affichage
  const finisseursByChantier = useMemo(() => {
    const grouped = new Map<string, typeof finisseurs>();
    
    finisseurs.forEach(f => {
      // Collecter tous les chantier_id uniques depuis affectedDays
      const chantierIds = new Set<string>();
      (f.affectedDays || []).forEach(ad => chantierIds.add(ad.chantier_id));
      
      if (chantierIds.size === 0) {
        // Pas de chantier connu
        if (!grouped.has("sans-chantier")) grouped.set("sans-chantier", []);
        grouped.get("sans-chantier")!.push(f);
        return;
      }
      
      // Créer une entrée par chantier avec affectedDays et ficheJours filtrés
      chantierIds.forEach(chantierId => {
        const filteredDays = (f.affectedDays || []).filter(ad => ad.chantier_id === chantierId);
        const filteredDates = new Set(filteredDays.map(d => d.date));
        // Filtrer par source_chantier_id (fiable), fallback sur dates si pas dispo
        const filteredFicheJours = (f.ficheJours || []).filter(fj => 
          fj.source_chantier_id ? fj.source_chantier_id === chantierId : filteredDates.has(fj.date)
        );
        const filteredTotalHeures = filteredFicheJours.reduce((sum, fj) => sum + (fj.HNORM || 0) + (fj.HI || 0), 0);
        
        if (!grouped.has(chantierId)) grouped.set(chantierId, []);
        grouped.get(chantierId)!.push({
          ...f,
          affectedDays: filteredDays,
          ficheJours: filteredFicheJours,
          totalHeures: filteredTotalHeures,
          paniers: filteredFicheJours.filter(fj => fj.PA).length,
          trajets: filteredFicheJours.reduce((sum, fj) => sum + (fj.T || 0), 0),
          intemperie: filteredFicheJours.reduce((sum, fj) => sum + (fj.HI || 0), 0),
        });
      });
    });
    
    return grouped;
  }, [finisseurs]);

  // ★ Mémoïser la Date de la semaine sélectionnée pour éviter les re-renders
  const selectedWeekDate = useMemo(() => parseISOWeek(selectedWeek), [selectedWeek]);

  // ★ Mémoïser les finisseursEquipe formatés par chantier pour TransportSheetWithFiche
  const finisseursEquipeByChantier = useMemo(() => {
    const map = new Map<string, Array<{ id: string; nom: string; prenom: string; ficheJours: Array<{ date: string; heures?: number; trajet_perso?: boolean; code_trajet?: string | null }> }>>();
    
    finisseursByChantier.forEach((chantierFinisseurs, chantierId) => {
      map.set(chantierId, chantierFinisseurs.map(f => ({
        id: f.id,
        nom: f.nom,
        prenom: f.prenom,
        ficheJours: f.ficheJours || []
      })));
    });
    
    return map;
  }, [finisseursByChantier]);

  // Calculer les IDs gérés par ce conducteur (pour les notifications de congés)
  const allManagedIds = useMemo(() => {
    const ids = finisseurs.map(f => f.id);
    if (effectiveConducteurId && !ids.includes(effectiveConducteurId)) {
      ids.push(effectiveConducteurId);
    }
    return ids;
  }, [finisseurs, effectiveConducteurId]);

  // Compter les demandes de congés traitées non lues par le demandeur
  const { data: nbDemandesTraitees = 0 } = useDemandesTraiteesNonLues(allManagedIds);

  // Source serveur directe pour affectations
  const { data: affByCond = [] } = useAffectationsByConducteur(effectiveConducteurId || "", selectedWeek);
  
  // Charger TOUTES les affectations de la semaine (pour protection contre modifications d'autres conducteurs)
  const { data: allAffectations = [] } = useAffectationsFinisseursJours(selectedWeek);
  
  // Construire la liste des affectations: priorité à la source locale, sinon serveur
  const affectationsFromHook = useMemo(() => 
    affByCond.map(a => ({ 
      finisseur_id: a.finisseur_id, 
      date: a.date, 
      chantier_id: a.chantier_id,
      conducteur_id: a.conducteur_id
    })), 
    [affByCond]
  );
  
  // Enrichir toutes les affectations avec les infos nécessaires
  const allAffectationsEnriched = useMemo(() => 
    allAffectations.map(a => ({
      finisseur_id: a.finisseur_id,
      date: a.date,
      chantier_id: a.chantier_id,
      conducteur_id: a.conducteur_id
    })),
    [allAffectations]
  );
  
  const affectationsJours = affectationsLocal ?? affectationsFromHook;

  // Lecture des query params pour lien profond (emails n8n) et gestion des redirections
  useEffect(() => {
    const chantierQP = searchParams.get("chantier");
    const semaineQP = searchParams.get("semaine");
    const tabQP = searchParams.get("tab");

    if (tabQP === "validation") {
      // Redirection explicite vers l'onglet validation (depuis validation des fiches)
      setActiveMainTab("validation");
      setFilters(prev => ({
        ...prev,
        ...(chantierQP && { chantier: chantierQP.trim() }),
        ...(semaineQP && { semaine: decodeURIComponent(semaineQP).trim() })
      }));
    } else if (tabQP === "mes-heures") {
      // Redirection explicite vers l'onglet mes heures (depuis signature finisseurs)
      setActiveMainTab("mes-heures");
      if (semaineQP) {
        setSelectedWeek(decodeURIComponent(semaineQP).trim());
      }
    } else if (chantierQP || semaineQP) {
      // Compatibilité avec les anciens liens sans "tab" -> ouvrir validation par défaut
      setActiveMainTab("validation");
      setFilters(prev => ({
        ...prev,
        ...(chantierQP && { chantier: chantierQP.trim() }),
        ...(semaineQP && { semaine: decodeURIComponent(semaineQP).trim() })
      }));
    }
  }, [searchParams]);

  // Basculer automatiquement sur la semaine suivante au retour de la signature
  useEffect(() => {
    const fromSignature = sessionStorage.getItem('fromSignature');
    
    if (fromSignature === 'true' && activeMainTab === 'mes-heures') {
      sessionStorage.removeItem('fromSignature');
      
      const weekNumber = selectedWeek.split('-S')[1];
      toast({
        title: "✅ Signatures validées",
        description: `Les fiches ont été transmises au service RH. Vous pouvez maintenant saisir la semaine ${weekNumber}`,
      });
    }
  }, [activeMainTab, selectedWeek, toast]);

  const handleSaveAndSign = async () => {
    if (!selectedWeek || !effectiveConducteurId) return;
    
    if (isSubmitting) return;

    // Bloquer la transmission de la semaine en cours avant vendredi (contrainte entreprise)
    const entrepriseSlugForContrainte = localStorage.getItem("entreprise_slug");
    const { isCurrentWeek } = await import("@/lib/date");
    const { isFridayOrWeekendParis } = await import("@/lib/date");
    const { getEnterpriseConfig } = await import("@/config/enterprises");
    const configContrainte = getEnterpriseConfig(entrepriseSlugForContrainte);
    
    if (configContrainte.features.contrainteVendredi12h && isCurrentWeek(selectedWeek) && !isFridayOrWeekendParis()) {
      toast({
        title: "⏳ Transmission bloquée",
        description: "La transmission de la semaine en cours n'est possible qu'à partir du vendredi.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    // Vérifier que tous les finisseurs ont une fiche trajet complète (sauf SDER)
    const entrepriseSlug = localStorage.getItem("entreprise_slug");
    if (entrepriseSlug !== "sder") {
      const { ok, errors } = await checkAllFinisseursTransportComplete();
      
      if (!ok) {
        setIsSubmitting(false);
        toast({
          variant: "destructive",
          title: "❌ Fiches de trajet incomplètes",
          description: errors.slice(0, 5).join(" • "),
          duration: 6000,
        });
        return;
      }
    }

    const monday = parseISOWeek(selectedWeek);
    const days = [0,1,2,3,4].map((d) => format(addDays(monday, d), "yyyy-MM-dd"));
    const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;

    // Filtrer les jours selon les affectations réelles pour éviter les "heures fantômes"
    const employeesData: EmployeeData[] = timeEntries.map((entry) => {
      // ✅ FIX MULTI-CHANTIER: utiliser affectationsFromHook (scopé au conducteur connecté)
      // au lieu de affectationsJours (qui contient TOUS les conducteurs)
      const employeeAffectedDates = new Set(
        affectationsFromHook
          ?.filter(aff => aff.finisseur_id === entry.employeeId)
          ?.map(aff => aff.date) || []
      );
      
      // Construire dailyHours uniquement pour les jours affectés
      const dailyHours = days
        .map((date, index) => {
          // Si pas d'affectation pour ce jour, ne pas l'inclure
          if (employeeAffectedDates.size > 0 && !employeeAffectedDates.has(date)) {
            return null;
          }
          
          const dayName = dayNames[index];
          const dayData = entry.days[dayName];
          
          return {
            date,
            heures: dayData.absent ? 0 : (dayData.hours ?? 0),
            pause_minutes: 0,
            HNORM: dayData.absent ? 0 : (dayData.hours ?? 0),
            HI: dayData.heuresIntemperie ?? 0,
            T: (dayData.codeTrajet === 'GD' || dayData.codeTrajet === 'T_PERSO') ? 0 : (dayData.trajet ? 1 : 0),
            PA: dayData.panierRepas ?? false,
            trajet_perso: dayData.trajetPerso ?? false,
            code_trajet: dayData.codeTrajet || (dayData.trajet ? "A_COMPLETER" : null),
            code_chantier_du_jour: dayData.chantierCode || null,
            ville_du_jour: dayData.chantierVille || null,
            commentaire: dayData.commentaire || null,
            repas_type: dayData.repasType ?? (dayData.panierRepas ? "PANIER" : null),
          };
        })
        .filter((day): day is NonNullable<typeof day> => day !== null);
      
      return {
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        dailyHours,
      };
    });

    if (employeesData.length === 0) return;

    try {
      // Grouper les employés par chantier pour utiliser les fiches existantes (créées par sync)
      const employeesByChantier = new Map<string | null, EmployeeData[]>();

      for (const entry of employeesData) {
        // ✅ FIX MULTI-CHANTIER: utiliser affectationsFromHook (scopé au conducteur connecté)
        // pour résoudre le bon chantier_id (évite de prendre NUANCE au lieu de CHEVIGNY)
        const employeeAffectations = affectationsFromHook?.filter(
          aff => aff.finisseur_id === entry.employeeId
        );
        const chantierId = employeeAffectations?.[0]?.chantier_id || null;
        
        if (!employeesByChantier.has(chantierId)) {
          employeesByChantier.set(chantierId, []);
        }
        employeesByChantier.get(chantierId)!.push(entry);
      }

      // Sauvegarder par groupe de chantier pour éviter les doublons
      for (const [chantierId, employees] of employeesByChantier) {
        await saveFiche.mutateAsync({
          semaine: selectedWeek,
          chantierId,  // ✅ Chantier correct depuis affectations
          employeesData: employees,
          statut: "BROUILLON",
          userId: effectiveConducteurId,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      await new Promise(resolve => setTimeout(resolve, 200));

      navigate(`/signature-finisseurs?semaine=${selectedWeek}&conducteurId=${effectiveConducteurId}`);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Vérifier que la fiche de trajet équipe est complète (au moins 1 véhicule par jour travaillé)
  const checkAllFinisseursTransportComplete = async (): Promise<{ ok: boolean; errors: string[] }> => {
    if (!effectiveConducteurId || !selectedWeek || finisseurs.length === 0) return { ok: false, errors: ["Données manquantes"] };
    
    const errors: string[] = [];
    
    // ✅ FIX MULTI-CHANTIER: utiliser affectationsFromHook (scopé au conducteur connecté)
    const chantierIds = [...new Set(
      affectationsFromHook?.map(a => a.chantier_id).filter(Boolean) || []
    )];
    
    if (chantierIds.length === 0) {
      errors.push("Aucune affectation trouvée pour cette semaine");
      return { ok: false, errors };
    }
    
    // Pour chaque chantier, vérifier la fiche de trajet équipe
    for (const chantierId of chantierIds) {
      const chantierInfo = chantiersMap.get(chantierId);
      const chantierLabel = chantierInfo 
        ? `${chantierInfo.code || ""} ${chantierInfo.nom}`.trim()
        : chantierId;
      
      // Récupérer les finisseurs affectés à ce chantier
      const chantierFinisseursIds = new Set(
        affectationsFromHook
          ?.filter(a => a.chantier_id === chantierId)
          ?.map(a => a.finisseur_id) || []
      );
      
      // Dates d'affectation réelles pour CE chantier (au lieu des 5 jours fixes)
      const chantierDates = [...new Set(
        affectationsFromHook
          ?.filter(a => a.chantier_id === chantierId)
          ?.map(a => a.date) || []
      )];
      
      // Calculer les jours travaillés (au moins 1 finisseur non absent)
      const workedDays: string[] = [];
      
      for (const date of chantierDates) {
        // Vérifier si au moins un finisseur travaille ce jour (pas absent, pas trajet perso)
        let hasWorker = false;
        
        for (const finisseur of finisseurs) {
          if (!chantierFinisseursIds.has(finisseur.id)) continue;
          
          const ficheJour = finisseur.ficheJours?.find(j => j.date === date);
          // Si pas de fiche ou heures > 0, on considère que c'est un jour travaillé
          const isAbsent = ficheJour && (ficheJour.HNORM || 0) === 0 && (ficheJour.HI || 0) === 0;
          
          if (!isAbsent) {
            hasWorker = true;
            break;
          }
        }
        
        if (hasWorker) {
          workedDays.push(date);
        }
      }
      
      if (workedDays.length === 0) {
        // Tous absents ce chantier, pas besoin de fiche trajet
        continue;
      }
      
      // Chercher la fiche transport du chantier (modèle chef unifié)
      const { data: ficheTransport } = await supabase
        .from("fiches_transport")
        .select("id")
        .eq("chantier_id", chantierId)
        .eq("semaine", selectedWeek)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!ficheTransport) {
        errors.push(`${chantierLabel}: aucune fiche de trajet trouvée`);
        continue;
      }
      
      // Récupérer les jours de transport
      const { data: transportJours } = await supabase
        .from("fiches_transport_jours")
        .select("date, conducteur_aller_id, conducteur_retour_id, immatriculation, periode")
        .eq("fiche_transport_id", ficheTransport.id);
      
      // Grouper par date et vérifier qu'il y a au moins 1 véhicule complet par jour travaillé
      const joursByDate = new Map<string, any[]>();
      (transportJours || []).forEach((j: any) => {
        if (!joursByDate.has(j.date)) {
          joursByDate.set(j.date, []);
        }
        joursByDate.get(j.date)!.push(j);
      });
      
      for (const date of workedDays) {
        const dayEntries = joursByDate.get(date) || [];
        
        if (dayEntries.length === 0) {
          errors.push(`${chantierLabel} – ${date}: aucun véhicule renseigné`);
          continue;
        }
        
        // Vérifier qu'il y a au moins une paire MATIN + SOIR avec immatriculation
        const hasCompleteMatin = dayEntries.some(e => 
          e.periode === "MATIN" && e.immatriculation && e.conducteur_aller_id
        );
        const hasCompleteSoir = dayEntries.some(e => 
          e.periode === "SOIR" && e.immatriculation && e.conducteur_retour_id
        );
        
        if (!hasCompleteMatin || !hasCompleteSoir) {
          errors.push(`${chantierLabel} – ${date}: véhicule ou conducteur manquant`);
        }
      }
    }
    
    return { ok: errors.length === 0, errors };
  };

  return (
    <PageLayout>
      <div className="bg-gradient-to-br from-background to-muted/30">
        <AppNav />

        <PageHeader
          title="Espace Conducteur"
          subtitle="Gestion des heures et validation"
          icon={FileCheck}
          theme="validation-conducteur"
          actions={
            <>
              {effectiveConducteurId && (
                <TransportMateriauxButton conducteurId={effectiveConducteurId} />
              )}
              <CongesButton
                onClick={() => setShowConges(true)}
                pendingCount={nbCongesEnAttente + nbDemandesTraitees}
              />
              <ConversationButton
                onClick={() => setShowConversation(true)}
                unreadCount={unreadData?.total || 0}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeatherDialog(true)}
                className="flex items-center gap-2"
              >
                <Cloud className="h-4 w-4" />
                Météo Semaine
              </Button>
            </>
          }
        />

        <ConversationListSheet
          open={showConversation}
          onOpenChange={setShowConversation}
          currentUserId={effectiveConducteurId || ""}
        />

        <WeeklyForecastDialog
          open={showWeatherDialog}
          onOpenChange={setShowWeatherDialog}
        />

        {effectiveConducteurId && (
          <CongesListSheet
            open={showConges}
            onOpenChange={setShowConges}
            conducteurId={effectiveConducteurId}
          />
        )}

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Sélecteur Super Admin */}
          {isSuperAdmin && (
            <Card className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Vue Super Admin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Conducteur :
                  </span>
                  <Select 
                    value={selectedConducteurIdAdmin || ""} 
                    onValueChange={(value) => setSelectedConducteurIdAdmin(value || null)}
                  >
                    <SelectTrigger className="w-[250px] bg-background">
                      <SelectValue placeholder="Choisir un conducteur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {conducteursList.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.prenom} {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selectedConducteurIdAdmin && (
                  <span className="text-sm text-amber-600 dark:text-amber-400 italic">
                    ↑ Sélectionnez un conducteur pour voir son équipe
                  </span>
                )}
              </div>
            </Card>
          )}
          <Tabs 
            value={activeMainTab} 
            onValueChange={(v) => {
              setActiveMainTab(v);
              // Synchroniser l'URL avec l'onglet actif
              const params = new URLSearchParams(searchParams);
              params.set("tab", v);
              navigate(`/validation-conducteur?${params.toString()}`, { replace: true });
            }}
          >
            <TabsList className={`grid w-full mb-6 h-16 bg-muted/30 p-2 gap-2 ${inventaireEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger 
                value="mes-heures"
                className="h-full text-lg font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground transition-all duration-200"
              >
                <FileText className="h-5 w-5 mr-2" />
                Mes heures
              </TabsTrigger>
              <TabsTrigger 
                value="validation"
                className="h-full text-lg font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground transition-all duration-200 relative"
              >
                <FileCheck className="h-5 w-5 mr-2" />
                Validation
                {nbFichesEnAttente > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1 shadow-md">
                    {nbFichesEnAttente > 99 ? "99+" : nbFichesEnAttente}
                  </span>
                )}
              </TabsTrigger>
              {inventaireEnabled && (
                <TabsTrigger 
                  value="inventaire"
                  className="h-full text-lg font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground transition-all duration-200"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Inventaire
                </TabsTrigger>
              )}
            </TabsList>

            {/* ONGLET 1: Mes heures avec sous-onglets */}
            <TabsContent value="mes-heures" className="space-y-6">
              <Tabs defaultValue="saisie">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="saisie">
                    <FileText className="h-4 w-4 mr-2" />
                    Saisie
                  </TabsTrigger>
                  <TabsTrigger value="historique">
                    <Clock className="h-4 w-4 mr-2" />
                    Historique
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="saisie" className="space-y-6">
                  <Card className="p-6 shadow-md border-border/50">
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          Semaine sélectionnée
                        </label>
                        <WeekSelector value={selectedWeek} onChange={handleWeekChange} />
                        
                        {/* Alerte rouge si semaine déjà transmise */}
                        {transmissionStatus?.isTransmitted && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="font-medium">
                              ⚠️ Cette semaine a déjà été transmise au service RH. 
                              Passez à la semaine suivante pour une nouvelle saisie.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {selectedWeek && effectiveConducteurId && (
                        <div className="pt-4 border-t border-border/30">
                          <FinisseursDispatchWeekly 
                            conducteurId={effectiveConducteurId}
                            semaine={selectedWeek}
                            onAffectationsChange={setAffectationsLocal}
                          />
                        </div>
                      )}

                      {selectedWeek && (
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">📝 Processus de validation :</span>
                            <br />
                            1. Saisissez les heures de votre équipe de finisseurs
                            <br />
                            2. Remplissez la fiche de trajet équipe (véhicules + conducteurs)
                            <br />
                            3. Collectez les signatures (finisseurs + vous)
                            <br />
                            4. Transmission automatique au service RH
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {selectedWeek && effectiveConducteurId ? (
                    finisseurs.length > 0 ? (
                      <>
                        {Array.from(finisseursByChantier.entries()).map(([chantierId, chantierFinisseurs]) => {
                          const chantierInfo = chantiersMap.get(chantierId);
                          const chantierLabel = chantierInfo 
                            ? `${chantierInfo.code || ""} ${chantierInfo.nom}`.trim()
                            : "Équipe sans chantier";
                          
                          return (
                            <div key={chantierId} className="space-y-4">
                              {finisseursByChantier.size > 1 && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                                  <Package className="h-5 w-5 text-primary" />
                                  <h3 className="font-semibold text-primary">{chantierLabel}</h3>
                                  <span className="text-sm text-muted-foreground">
                                    ({chantierFinisseurs.length} finisseur{chantierFinisseurs.length > 1 ? "s" : ""})
                                  </span>
                                </div>
                              )}
                              <TimeEntryTable 
                                chantierId={chantierId !== "sans-chantier" ? chantierId : null}
                                weekId={selectedWeek}
                                chefId={effectiveConducteurId}
                                onEntriesChange={(entries) => {
                                  setTimeEntries(prev => {
                                    const otherEntries = prev.filter(e => 
                                      !chantierFinisseurs.some(f => f.id === e.employeeId)
                                    );
                                    return [...otherEntries, ...entries];
                                  });
                                }}
                                mode="conducteur"
                                affectationsJours={affectationsJours?.filter(a => 
                                  chantierFinisseurs.some(f => f.id === a.finisseur_id) &&
                                  (chantierId === "sans-chantier" || a.chantier_id === chantierId)
                                )}
                                allAffectations={allAffectationsEnriched}
                              />
                              
                              {/* Fiche de trajet équipe (modèle chef unifié) */}
                              <TransportSheetWithFiche
                                selectedWeek={selectedWeekDate}
                                selectedWeekString={selectedWeek}
                                chantierId={chantierId !== "sans-chantier" ? chantierId : null}
                                conducteurId={effectiveConducteurId!}
                                isReadOnly={transmissionStatus?.isTransmitted}
                                finisseursEquipe={finisseursEquipeByChantier.get(chantierId) || []}
                                assignedDates={chantierId !== "sans-chantier" ? [...new Set(
                                  (affectationsJours || [])
                                    .filter(a => a.chantier_id === chantierId)
                                    .map(a => a.date)
                                )].sort() : undefined}
                              />
                              
                              {/* ✅ Bouton Enregistrer par chantier */}
                              <div className="flex justify-end px-2">
                                <Button
                                  onClick={async () => {
                                    // Forcer le blur pour capturer la dernière modification
                                    if (document.activeElement instanceof HTMLElement) {
                                      document.activeElement.blur();
                                    }
                                    // Attendre que React ait mis à jour le state
                                    await new Promise(resolve => requestAnimationFrame(resolve));
                                    
                                    // Filtrer les affectations par chantier_id
                                    const scopedAffectations = affectationsJours?.filter(a => 
                                      chantierFinisseurs.some(f => f.id === a.finisseur_id) &&
                                      (chantierId === "sans-chantier" || a.chantier_id === chantierId)
                                    );
                                    
                                    saveChantier({
                                      chantierId,
                                      selectedWeek,
                                      conducteurId: effectiveConducteurId!,
                                      chantierFinisseurs,
                                      timeEntries,
                                      affectationsJours: scopedAffectations,
                                    });
                                  }}
                                  disabled={savingChantier === chantierId || transmissionStatus?.isTransmitted}
                                  className="bg-primary hover:bg-primary/90"
                                >
                                  {savingChantier === chantierId ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                  )}
                                  Enregistrer ce chantier
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        <Card className="p-6 shadow-md border-border/50">
                          <div className="flex flex-col gap-3">
                            <Button 
                              size="lg"
                              className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-primary w-full"
                              onClick={handleSaveAndSign}
                              disabled={saveFiche.isPending || isSubmitting || timeEntries.length === 0 || transmissionStatus?.isTransmitted}
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Collecter les signatures
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Collectez les signatures des finisseurs et la vôtre avant la transmission au RH
                            </p>
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                              <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                                ℹ️ Vérifiez que la fiche de trajet équipe est complète avant de collecter les signatures
                              </p>
                            </div>
                          </div>
                        </Card>
                      </>
                    ) : (
                      <Card className="p-12 shadow-md border-border/50">
                        <div className="text-center text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">Aucun finisseur affecté cette semaine</p>
                          <p className="text-sm mt-2">
                            Le planning de votre équipe est géré depuis la page <strong className="text-primary">Planning</strong>. La synchronisation automatique du lundi matin initialise votre semaine.
                          </p>
                          <p className="text-xs mt-2 text-muted-foreground/70">
                            Ou utilisez la section "Planifier la semaine" pour gérer manuellement vos affectations.
                          </p>
                        </div>
                      </Card>
                    )
                  ) : (
                    <Card className="p-12 shadow-md border-border/50">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Sélectionnez une semaine</p>
                        <p className="text-sm mt-2">Pour commencer la saisie des heures de votre équipe</p>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="historique">
                  <ConducteurHistorique conducteurId={effectiveConducteurId} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ONGLET 2: Validation des fiches */}
            <TabsContent value="validation" className="space-y-6">
              {!selectedFiche ? (
                <div className="space-y-6">
                  <FichesFilters filters={filters} onFiltersChange={setFilters} />

                  <Card className="shadow-md border-border/50 overflow-hidden">
                    <Tabs value={validationTab} onValueChange={setValidationTab}>
                      <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                        <TabsTrigger value="a-valider" className="rounded-none">
                          À valider
                        </TabsTrigger>
                        <TabsTrigger value="historique" className="rounded-none">
                          Historique
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="a-valider" className="p-6">
                        <FichesList
                          status="VALIDE_CHEF"
                          filters={{ ...filters, conducteur: effectiveConducteurId || undefined }}
                          onSelectFiche={setSelectedFiche}
                        />
                      </TabsContent>

                      <TabsContent value="historique" className="p-6">
                        <FichesList
                          status="ENVOYE_RH"
                          filters={{ ...filters, conducteur: effectiveConducteurId || undefined }}
                          onSelectFiche={setSelectedFiche}
                        />
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>
              ) : (
                <FicheDetail ficheId={selectedFiche} onBack={() => setSelectedFiche(null)} />
              )}
            </TabsContent>

            {/* ONGLET 3: Inventaire */}
            {inventaireEnabled && (
              <TabsContent value="inventaire" className="space-y-6">
                <InventoryDashboard />
              </TabsContent>
            )}
          </Tabs>

          {/* Bouton discret de purge cache */}
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Vider le cache peut résoudre les problèmes d'affichage. Voulez-vous continuer ?")) {
                  clearCacheAndReload();
                }
              }}
              className="text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Problème d'affichage ? Vider le cache
            </Button>
          </div>
        </main>
      </div>
    </PageLayout>
  );
};

export default ValidationConducteur;
