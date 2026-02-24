import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, FileText, CheckCircle2, AlertTriangle, Truck, ChevronDown, Loader2, BarChart3, RefreshCw, CalendarDays, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RatioGlobalSheet } from "@/components/ratio/RatioGlobalSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekSelectorChef } from "@/components/timesheet/WeekSelectorChef";
import { ChantierSelector } from "@/components/timesheet/ChantierSelector";
import { TimeEntryTable } from "@/components/timesheet/TimeEntryTable";
import { AppNav } from "@/components/navigation/AppNav";
import { UserSelector } from "@/components/timesheet/UserSelector";
import { useAutoSaveFiche } from "@/hooks/useAutoSaveFiche";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { useMaconsAllChantiersByChef } from "@/hooks/useMaconsAllChantiersByChef";

import { addDays, format, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChefMaconsManager } from "@/components/chef/ChefMaconsManager";
import { ChefHistorique } from "@/components/chef/ChefHistorique";
import { ChefFicheDetailDialog } from "@/components/chef/ChefFicheDetailDialog";
import { TransportSheetV2 } from "@/components/transport/TransportSheetV2";
import { useFicheId } from "@/hooks/useFicheId";
import { parseISOWeek, getNextWeek } from "@/lib/weekUtils";
import { isAfterFriday12hParis, isCurrentWeek } from "@/lib/date";
import { useFeatureEnabled } from "@/hooks/useEnterpriseConfig";
import { PageLayout } from "@/components/layout/PageLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock } from "lucide-react";
import { useTransportValidation } from "@/hooks/useTransportValidation";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useFicheModifiable } from "@/hooks/useFicheModifiable";
import { useInitialWeek } from "@/hooks/useInitialWeek";
import { WeatherButton } from "@/components/weather/WeatherButton";
import { clearCacheAndReload } from "@/hooks/useClearCache";
import { ConversationButton } from "@/components/chat/ConversationButton";
import { ConversationSheet } from "@/components/chat/ConversationSheet";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/contexts/AuthProvider";
import { OfflineOverlay } from "@/components/ui/OfflineOverlay";
import { CongesButton } from "@/components/conges/CongesButton";
import { CongesSheet } from "@/components/conges/CongesSheet";
import { useDemandesTraiteesNonLues } from "@/hooks/useDemandesTraiteesNonLues";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline } = useAuth();
  const { data: currentRole } = useCurrentUserRole();
  const isChefRole = currentRole === "chef";
  const isContrainteVendredi12h = useFeatureEnabled('contrainteVendredi12h');
  const isRatioGlobalEnabled = useFeatureEnabled('ratioGlobal');
  const isPointsMeteoEnabled = useFeatureEnabled('pointsMeteo');
  
  const [selectedChantier, setSelectedChantier] = useState<string>(
    sessionStorage.getItem('timesheet_selectedChantier') || ""
  );
  const [selectedChef, setSelectedChef] = useState<string>(
    sessionStorage.getItem('timesheet_selectedChef') || ""
  );
  
  // Hook intelligent qui détermine la bonne semaine (courante ou suivante si transmise)
  const { data: initialWeek, isLoading: isLoadingWeek } = useInitialWeek(
    searchParams.get("semaine"),
    selectedChef || null,
    selectedChantier || null
  );
  
  const [selectedWeek, setSelectedWeek] = useState<string>(initialWeek || format(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }), "RRRR-'S'II"));
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [previousChef, setPreviousChef] = useState<string>(
    sessionStorage.getItem('timesheet_selectedChef') || ""
  );
  const [isTransportOpen, setIsTransportOpen] = useState(false);
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("saisie");
  const [selectedFicheId, setSelectedFicheId] = useState<string | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [showConges, setShowConges] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [weekInitialized, setWeekInitialized] = useState(false);
  const autoSaveFiche = useAutoSaveFiche();
  const queryClient = useQueryClient();
  
  // Récupérer les messages non lus pour ce chantier (utiliser auth.uid() pour cohérence avec RLS)
  const { data: unreadData } = useUnreadMessages(authUserId, selectedChantier ? [selectedChantier] : undefined);

  // Mettre à jour selectedWeek UNIQUEMENT au premier chargement (pas à chaque changement de chantier)
  useEffect(() => {
    if (initialWeek && !weekInitialized) {
      setSelectedWeek(initialWeek);
      setWeekInitialized(true);
    }
  }, [initialWeek, weekInitialized]);

  // Auto-sélection du chef connecté au chargement + validation multi-tenant
  useEffect(() => {
    const fetchConnectedChef = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Sauvegarder auth.uid() pour le système de messages (cohérence avec RLS)
      if (user) setAuthUserId(user.id);
      if (!user) return;

      const entrepriseId = localStorage.getItem("current_entreprise_id");
      if (!entrepriseId) return;

      // Vérifier si cet utilisateur est un chef
      const { data: utilisateur } = await supabase
        .from("utilisateurs")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (!utilisateur) return;

      // Vérifier si cet utilisateur a le rôle "chef" dans cette entreprise
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (userRole?.role === "chef") {
        setSelectedChef(utilisateur.id);

        // Validation multi-tenant : vérifier que le chantier en session est dans le planning
        const semaineCourante = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "RRRR-'S'II");
        
        if (selectedChantier) {
          // 1. Vérifier dans planning_affectations
          const { data: planningValid } = await supabase
            .from("planning_affectations")
            .select("chantier_id")
            .eq("employe_id", utilisateur.id)
            .eq("entreprise_id", entrepriseId)
            .eq("semaine", semaineCourante)
            .eq("chantier_id", selectedChantier)
            .limit(1);

          if (planningValid && planningValid.length > 0) {
            return; // chantier valide dans le planning
          }

          // 2. Fallback : vérifier dans affectations_jours_chef
          const { data: ajcValid } = await supabase
            .from("affectations_jours_chef")
            .select("chantier_id")
            .eq("chef_id", utilisateur.id)
            .eq("semaine", semaineCourante)
            .eq("chantier_id", selectedChantier)
            .limit(1);

          if (ajcValid && ajcValid.length > 0) {
            return; // chantier valide dans les affectations jours
          }

          // Le chantier n'est dans aucune source → reset
          setSelectedChantier("");
          sessionStorage.removeItem('timesheet_selectedChantier');
        }

        // Choisir le premier chantier du planning pour la semaine courante
        const { data: planningChantiers } = await supabase
          .from("planning_affectations")
          .select("chantier_id")
          .eq("employe_id", utilisateur.id)
          .eq("entreprise_id", entrepriseId)
          .eq("semaine", semaineCourante)
          .limit(1);

        if (planningChantiers && planningChantiers.length > 0) {
          setSelectedChantier(planningChantiers[0].chantier_id);
        } else {
          // Fallback : affectations_jours_chef
          const { data: ajcChantiers } = await supabase
            .from("affectations_jours_chef")
            .select("chantier_id")
            .eq("chef_id", utilisateur.id)
            .eq("semaine", semaineCourante)
            .limit(1);

          if (ajcChantiers && ajcChantiers.length > 0) {
            setSelectedChantier(ajcChantiers[0].chantier_id);
          }
        }
      }
    };

    // Toujours vérifier l'utilisateur connecté au chargement
    fetchConnectedChef();
  }, []);
  
  // Récupérer les maçons affectés au chantier sélectionné (+ le chef)
  const { data: macons = [] } = useMaconsByChantier(
    selectedChantier,
    selectedWeek,
    selectedChef
  );

  // Détecter si le chef est multi-chantier pour afficher le bandeau info
  const { isMultiChantier: isChefMultiChantier } = useMaconsAllChantiersByChef(
    selectedChef || undefined,
    selectedWeek
  );

  // Récupérer la ville et le nom du chantier sélectionné + conducteur
  const { data: chantierInfo } = useQuery({
    queryKey: ["chantier-info-chat", selectedChantier],
    queryFn: async () => {
      if (!selectedChantier) return null;
      const { data } = await supabase
        .from("chantiers")
        .select(`
          ville, 
          nom,
          conducteur:utilisateurs!chantiers_conducteur_id_fkey(nom, prenom)
        `)
        .eq("id", selectedChantier)
        .single();
      return data || null;
    },
    enabled: !!selectedChantier,
  });
  const chantierVille = chantierInfo?.ville || null;
  const chantierNom = chantierInfo?.nom || "Chantier";
  const conducteurNom = chantierInfo?.conducteur 
    ? `${chantierInfo.conducteur.prenom || ""} ${chantierInfo.conducteur.nom || ""}`.trim()
    : undefined;

  // Récupérer les infos du chef sélectionné (pour le formulaire de congés)
  const { data: chefInfo } = useQuery({
    queryKey: ["chef-info-conges", selectedChef],
    queryFn: async () => {
      if (!selectedChef) return null;
      const { data } = await supabase
        .from("utilisateurs")
        .select("nom, prenom")
        .eq("id", selectedChef)
        .single();
      return data || null;
    },
    enabled: !!selectedChef,
  });

  // Calculer les IDs de l'équipe pour les notifications de congés
  const allTeamIds = useMemo(() => {
    const ids = macons.map(m => m.id);
    if (selectedChef && !ids.includes(selectedChef)) {
      ids.push(selectedChef);
    }
    return ids;
  }, [macons, selectedChef]);

  // Compter les demandes de congés traitées non lues par le demandeur
  const { data: nbDemandesTraitees = 0 } = useDemandesTraiteesNonLues(allTeamIds);

  // Récupérer l'ID de la fiche pour la fiche transport
  const { data: ficheId } = useFicheId(selectedWeek, selectedChef, selectedChantier);

  // Calculer les jours où TOUTE l'équipe est absente OU en intempérie complète
  const allAbsentDays = useMemo(() => {
    if (timeEntries.length === 0) return [];
    
    const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const absentDays: string[] = [];
    const monday = parseISOWeek(selectedWeek);
    
    weekDays.forEach((dayName, index) => {
      // Vérifier si TOUS les employés sont absents OU en intempérie complète ce jour
      const allAbsentOrIntemperie = timeEntries.every(entry => {
        const dayData = entry.days[dayName];
        // Absent classique
        if (dayData?.absent === true) return true;
        // Intempérie complète : hours = 0 ET heuresIntemperie > 0
        if ((dayData?.hours ?? 0) === 0 && (dayData?.heuresIntemperie ?? 0) > 0) return true;
        return false;
      });
      
      if (allAbsentOrIntemperie) {
        const dayDate = addDays(monday, index);
        absentDays.push(format(dayDate, "yyyy-MM-dd"));
      }
    });
    
    return absentDays;
  }, [timeEntries, selectedWeek]);

  // Identifier les jours d'intempérie complète (pour l'indicateur visuel distinct)
  const allIntempDays = useMemo(() => {
    if (timeEntries.length === 0) return [];
    
    const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const intempDays: string[] = [];
    const monday = parseISOWeek(selectedWeek);
    
    weekDays.forEach((dayName, index) => {
      // Vérifier si TOUS les employés sont en intempérie complète (pas absent classique)
      const allIntemp = timeEntries.every(entry => {
        const dayData = entry.days[dayName];
        // Intempérie complète : hours = 0 ET heuresIntemperie > 0
        return (dayData?.hours ?? 0) === 0 && (dayData?.heuresIntemperie ?? 0) > 0;
      });
      
      if (allIntemp) {
        const dayDate = addDays(monday, index);
        intempDays.push(format(dayDate, "yyyy-MM-dd"));
      }
    });
    
    return intempDays;
  }, [timeEntries, selectedWeek]);

  // Validation de la fiche transport (en tenant compte des jours d'absence totale)
  const { isTransportComplete } = useTransportValidation(ficheId, undefined, allAbsentDays);
  const { toast } = useToast();
  
  // La logique de filtrage par jours autorisés est maintenant centralisée dans useAutoSaveFiche

  // Validation des codes trajets
  

  // Vérifier si la fiche est modifiable (pas encore transmise au conducteur ou RH)
  const { data: ficheModifiableData } = useFicheModifiable(
    selectedWeek,
    selectedChantier,
    selectedChef
  );
  const isFicheModifiable = ficheModifiableData?.isModifiable ?? true;
  const raisonBlocage = ficheModifiableData?.raison;

  // Persister les sélections dans sessionStorage
  useEffect(() => {
    sessionStorage.setItem('timesheet_selectedWeek', selectedWeek);
  }, [selectedWeek]);

  useEffect(() => {
    sessionStorage.setItem('timesheet_selectedChantier', selectedChantier);
  }, [selectedChantier]);

  useEffect(() => {
    sessionStorage.setItem('timesheet_selectedChef', selectedChef);
  }, [selectedChef]);

  // Réinitialiser le chantier et les entrées seulement si le chef change vraiment
  useEffect(() => {
    if (selectedChef !== previousChef && previousChef !== "") {
      setSelectedChantier("");
      setTimeEntries([]);
      setWeekInitialized(false); // Permettre une nouvelle initialisation de semaine
    }
    setPreviousChef(selectedChef);
  }, [selectedChef, previousChef]);

  // Auto-save et chargement des données gérés directement dans TimeEntryTable.tsx


  const handleSaveAndSign = async () => {
    if (!selectedChantier || !selectedWeek || !selectedChef) return;
    
    // 🔥 Protection contre les double-clics
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Vérification obligatoire : Fiche transport complète
    if (!isTransportComplete) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "❌ Fiche de trajet incomplète",
        description: "Vous devez remplir les 15 champs obligatoires de la fiche de trajet (5 jours × 3 informations : conducteur aller, conducteur retour et immatriculation) avant de passer à l'étape de signature.",
        duration: 5000,
      });
      return;
    }

    // Contrainte transmission : pas de transmission avant vendredi 12h pour la semaine en cours
    if (isContrainteVendredi12h) {
      if (isCurrentWeek(selectedWeek) && !isAfterFriday12hParis()) {
        setIsSubmitting(false);
        toast({
          variant: "destructive",
          title: "⏰ Transmission non autorisée",
          description: "Pour la semaine en cours, la transmission n'est possible qu'à partir de vendredi 12h00 (heure de Paris).",
          duration: 5000,
        });
        return;
      }
    }

    try {
      // ✅ UNIFICATION: Utiliser autoSaveFiche (moteur unique avec nettoyage jours fantômes)
      await autoSaveFiche.mutateAsync({
        timeEntries,
        weekId: selectedWeek,
        chantierId: selectedChantier,
        chefId: selectedChef,
      });

      // 2. Invalider manuellement le cache React Query pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });

      // 3. Délai de sécurité pour laisser les triggers DB s'exécuter
      await new Promise(resolve => setTimeout(resolve, 200));

      // 4. Redirection avec les données fraîches garanties
      navigate(`/signature-macons?chantierId=${selectedChantier}&semaine=${selectedWeek}&chefId=${selectedChef}`);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <PageLayout>
      <div className="bg-gradient-to-br from-background to-muted/30">
        <AppNav />
      
      <PageHeader
        title="Saisie hebdomadaire"
        subtitle="Chef de chantier"
        icon={FileText}
        theme="saisie-chef"
        showNetworkBadge={true}
        actions={
          <>
            <CongesButton onClick={() => setShowConges(true)} pendingCount={nbDemandesTraitees} />
            {selectedChantier && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate(`/chantiers/${selectedChantier}?from=chef`)}
              >
                <CalendarDays className="h-4 w-4" />
                Planning tâches
              </Button>
            )}
            {selectedChantier && (
              <ConversationButton
                onClick={() => setShowConversation(true)}
                unreadCount={unreadData?.byChantier.get(selectedChantier) || 0}
              />
            )}
            {isPointsMeteoEnabled && <WeatherButton ville={chantierVille} />}
          </>
        }
      />
      
      {/* Conversation Sheet */}
      <ConversationSheet
        open={showConversation}
        onOpenChange={setShowConversation}
        chantierId={selectedChantier || null}
        chantierNom={chantierNom}
        currentUserId={authUserId || ""}
      />

      {/* Congés Sheet */}
      {showConges && selectedChef && selectedChantier && (
        <CongesSheet
          open={showConges}
          onOpenChange={setShowConges}
          chefId={selectedChef}
          chantierId={selectedChantier}
          semaine={selectedWeek}
          entrepriseId={localStorage.getItem("current_entreprise_id") || ""}
        />
      )}
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="saisie">Saisie hebdomadaire</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="saisie" className="space-y-6">
            {/* Selection Controls */}
            <Card className="p-6 shadow-md border-border/50">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Chef de chantier
                </label>
                {isChefRole ? (
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted/50 rounded-md text-sm text-muted-foreground">
                    {chefInfo ? `${chefInfo.prenom} ${chefInfo.nom}` : "Chargement..."}
                  </div>
                ) : (
                  <UserSelector role="chef" value={selectedChef} onChange={setSelectedChef} />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Semaine sélectionnée
                </label>
                <WeekSelectorChef value={selectedWeek} onChange={setSelectedWeek} chefId={selectedChef} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Choisir un chantier
                </label>
                <ChantierSelector value={selectedChantier} onChange={setSelectedChantier} chefId={selectedChef} semaine={selectedWeek} />
              </div>
            </div>

            {selectedWeek && selectedChantier && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-foreground">
                  <span className="font-medium">📝 Processus de validation :</span>
                  <br />
                  1. Composez votre équipe (affectation des maçons au chantier)
                  <br />
                  2. Saisissez les heures et les informations de transport puis validez la fiche
                  <br />
                  3. Collectez les signatures (redirection automatique vers la page signatures)
                  <br />
                  4. Soumettez au service RH pour validation finale
                </p>
              </div>
            )}

            {/* Gestion d'équipe intégrée */}
            {selectedWeek && selectedChantier && selectedChef && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <ChefMaconsManager 
                  chefId={selectedChef}
                  chantierId={selectedChantier}
                  semaine={selectedWeek}
                  disabled={!isFicheModifiable}
                />
              </div>
            )}
          </Card>

          {/* Bandeau info chef multi-chantier */}
          {isChefMultiChantier && selectedChef && selectedChantier && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-300 space-y-2">
                <p><strong>Chef multi-chantier : nouveau fonctionnement de la saisie</strong></p>
                <p>
                  Vous êtes affecté sur plusieurs chantiers. Vos heures sur le chantier secondaire
                  sont désormais initialisées à 0h par défaut (panier et trajet décochés).
                  Vous pouvez les modifier librement.
                </p>
                <p><strong>⚠️ Attention à ne pas compter vos heures en double !</strong></p>
                <p>
                  Si vous saisissez des heures sur votre chantier secondaire un jour donné,
                  pensez à ajuster le même jour sur votre chantier principal :
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Exemple :</strong> Vous travaillez 4h sur le chantier A (principal) et 4h sur le
                    chantier B (secondaire) le lundi → saisissez bien 4h sur A et 4h sur B,
                    pas 8h sur les deux.
                  </li>
                  <li>
                    <strong>Même principe pour les paniers et trajets :</strong> ne cochez le panier ou le trajet
                    que sur un seul des deux chantiers pour ce jour-là.
                  </li>
                </ul>
                <p>
                  <strong>En résumé :</strong> le total de vos heures par jour, tous chantiers confondus,
                  doit correspondre à votre journée réelle de travail.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Avertissement contrainte vendredi 12h */}
          {isContrainteVendredi12h && 
           isCurrentWeek(selectedWeek) && 
           !isAfterFriday12hParis() && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                La transmission pour cette semaine sera possible à partir de <strong>vendredi 12h00</strong> (heure de Paris).
              </AlertDescription>
            </Alert>
          )}

          {!isFicheModifiable && raisonBlocage && (
            <Card className="p-4 mb-4 border-destructive bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Modification impossible</p>
                  <p className="text-sm">{raisonBlocage}</p>
                  {ficheModifiableData?.statutBloquant === "VALIDE_CHEF" && (
                    <p className="text-xs mt-1">
                      Passez à la semaine suivante pour continuer la saisie.
                    </p>
                  )}
                  {ficheModifiableData?.statutBloquant === "VALIDE_CONDUCTEUR" && (
                    <p className="text-xs mt-1">
                      Cette fiche a été transmise au conducteur. Pour la modifier, contactez le conducteur.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Time Entry Table */}
          {selectedWeek && selectedChantier ? (
            <>
              <OfflineOverlay message="La saisie des heures est désactivée jusqu'au retour de la connexion">
                <TimeEntryTable 
                  chantierId={selectedChantier}
                  weekId={selectedWeek}
                  chefId={selectedChef}
                  onEntriesChange={setTimeEntries}
                  readOnly={!isFicheModifiable || !isOnline}
                />
              </OfflineOverlay>

              {/* Bouton "Enregistrer maintenant" */}
              {selectedChef && selectedWeek && timeEntries.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      autoSaveFiche.mutate({
                        timeEntries,
                        weekId: selectedWeek,
                        chantierId: selectedChantier || null,
                        chefId: selectedChef,
                      });
                    }}
                    disabled={!selectedChef || !selectedWeek || timeEntries.length === 0 || autoSaveFiche.isPending || !isFicheModifiable || !isOnline}
                  >
                    {autoSaveFiche.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Enregistrer maintenant
                      </>
                    )}
                  </Button>
                  {autoSaveFiche.isSuccess && (
                    <Badge variant="default" className="bg-green-600">
                      ✓ Enregistré
                    </Badge>
                  )}
                </div>
              )}

              {/* Transport Sheet - Accordéon */}
              {selectedWeek && (
                <OfflineOverlay message="La saisie des transports est désactivée jusqu'au retour de la connexion">
                  <Card className="p-4 shadow-md border-border/50">
                    <Collapsible open={isTransportOpen} onOpenChange={setIsTransportOpen}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <h3 className="text-lg font-semibold">Fiche de Trajet</h3>
                            <p className="text-xs text-muted-foreground">
                              Gérer les conducteurs et véhicules de la semaine
                            </p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            isTransportOpen ? "transform rotate-180" : ""
                          }`}
                        />
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4">
                        <TransportSheetV2
                          selectedWeek={parseISOWeek(selectedWeek)}
                          selectedWeekString={selectedWeek}
                          chantierId={selectedChantier}
                          chefId={selectedChef}
                          ficheId={ficheId}
                          isReadOnly={!isFicheModifiable || !isOnline}
                          allAbsentDays={allAbsentDays}
                          allIntempDays={allIntempDays}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </OfflineOverlay>
              )}

              {/* Ratio Global Sheet - Limoge Revillon uniquement */}
              {selectedWeek && isRatioGlobalEnabled && (
                <Card className="p-4 shadow-md border-border/50">
                  <Collapsible open={isRatioOpen} onOpenChange={setIsRatioOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <h3 className="text-lg font-semibold">Ratio Global</h3>
                          <p className="text-xs text-muted-foreground">
                            M³ béton, ML voile, M² coffrage, météo et observations
                          </p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          isRatioOpen ? "transform rotate-180" : ""
                        }`}
                      />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="pt-4">
                      <RatioGlobalSheet
                        selectedWeek={selectedWeek}
                        chantierId={selectedChantier}
                        ficheId={ficheId}
                        isReadOnly={!isFicheModifiable}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}

              {/* Action Button */}
              <Card className="p-6 shadow-md border-border/50">
                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg"
                    className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-primary w-full"
                    onClick={handleSaveAndSign}
                    disabled={autoSaveFiche.isPending || isSubmitting || !selectedChef || timeEntries.length === 0 || !isTransportComplete || !isFicheModifiable || !isOnline}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Enregistrer et collecter les signatures
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Les maçons devront signer individuellement sur la tablette
                  </p>
                  {!isOnline && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                      <p className="text-sm text-amber-800 dark:text-amber-200 font-medium text-center">
                        📵 Connexion perdue — Transmission impossible
                      </p>
                    </div>
                  )}
                  {!isTransportComplete && selectedWeek && selectedChantier && isOnline && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium text-center">
                        ⚠️ La fiche de trajet doit être complétée avant de collecter les signatures
                      </p>
                    </div>
                   )}
                  
                  {/* Bouton discret de purge cache */}
                  <div className="flex justify-center mt-4">
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
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 shadow-md border-border/50">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Sélectionnez une semaine et un chantier</p>
                <p className="text-sm mt-2">Pour commencer la saisie des heures</p>
              </div>
            </Card>
          )}
          </TabsContent>

          <TabsContent value="historique" className="space-y-6">
            <Card className="p-6 shadow-md border-border/50">
              <ChefHistorique 
                chefId={selectedChef}
                onSelectFiche={(ficheId) => setSelectedFicheId(ficheId)}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      </div>

      {/* Dialog pour afficher le détail de la fiche */}
      <ChefFicheDetailDialog 
        ficheId={selectedFicheId}
        onClose={() => setSelectedFicheId(null)}
      />
    </PageLayout>
  );
};

export default Index;
