import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, FileText, CheckCircle2, AlertTriangle, Truck, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekSelector } from "@/components/timesheet/WeekSelector";
import { ChantierSelector } from "@/components/timesheet/ChantierSelector";
import { TimeEntryTable } from "@/components/timesheet/TimeEntryTable";
import { AppNav } from "@/components/navigation/AppNav";
import { UserSelector } from "@/components/timesheet/UserSelector";
import { useSaveFiche, type EmployeeData } from "@/hooks/useSaveFiche";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { addDays, format, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChefMaconsManager } from "@/components/chef/ChefMaconsManager";
import { ChefHistorique } from "@/components/chef/ChefHistorique";
import { ChefFicheDetailDialog } from "@/components/chef/ChefFicheDetailDialog";
import { TransportSheetV2 } from "@/components/transport/TransportSheetV2";
import { useFicheId } from "@/hooks/useFicheId";
import { parseISOWeek, getNextWeek } from "@/lib/weekUtils";
import { PageLayout } from "@/components/layout/PageLayout";
import { useTransportValidation } from "@/hooks/useTransportValidation";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useFicheModifiable } from "@/hooks/useFicheModifiable";
import { useInitialWeek } from "@/hooks/useInitialWeek";
import { useCodeTrajetValidation } from "@/hooks/useCodeTrajetValidation";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("saisie");
  const [selectedFicheId, setSelectedFicheId] = useState<string | null>(null);
  const saveFiche = useSaveFiche();
  const queryClient = useQueryClient();

  // Mettre à jour selectedWeek quand initialWeek change
  useEffect(() => {
    if (initialWeek) {
      setSelectedWeek(initialWeek);
    }
  }, [initialWeek]);

  // Auto-sélection du chef connecté au chargement
  useEffect(() => {
    const fetchConnectedChef = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Vérifier si cet utilisateur est un chef
      const { data: utilisateur } = await supabase
        .from("utilisateurs")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!utilisateur) return;

      // Vérifier si cet utilisateur a le rôle "chef"
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userRole?.role === "chef") {
        setSelectedChef(utilisateur.id);

        // Conserver un chantier déjà choisi s'il est valide pour ce chef
        if (selectedChantier) {
          const { data: chantierValide } = await supabase
            .from("chantiers")
            .select("id")
            .eq("id", selectedChantier)
            .eq("chef_id", utilisateur.id)
            .eq("actif", true)
            .maybeSingle();

          if (chantierValide) {
            // Le chantier en session est valide, on le garde
            return;
          }
        }

        // Sinon, choisir le plus récent parmi les chantiers actifs du chef
        const { data: chantiers } = await supabase
          .from("chantiers")
          .select("id")
          .eq("chef_id", utilisateur.id)
          .eq("actif", true)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (chantiers && chantiers.length > 0) {
          setSelectedChantier(chantiers[0].id);
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

  // Récupérer l'ID de la fiche pour la fiche transport
  const { data: ficheId } = useFicheId(selectedWeek, selectedChef, selectedChantier);

  // Validation de la fiche transport
  const { isTransportComplete } = useTransportValidation(ficheId);
  const { toast } = useToast();

  // Validation des codes trajets
  const { isValid: areCodeTrajetsComplete, missingCount } = useCodeTrajetValidation(timeEntries);

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
    }
    setPreviousChef(selectedChef);
  }, [selectedChef, previousChef]);


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

    // Vérification obligatoire : Codes trajets renseignés
    if (!areCodeTrajetsComplete) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "❌ Codes trajets manquants",
        description: `${missingCount} code(s) trajet manquant(s). Tous les jours travaillés doivent avoir un code trajet renseigné (ou "Trajet perso" coché).`,
        duration: 5000,
      });
      return;
    }

    const monday = parseISOWeek(selectedWeek);
    const days = [0,1,2,3,4].map((d) => format(addDays(monday, d), "yyyy-MM-dd"));

    // Construire employeesData à partir des entrées saisies
    const employeesData: EmployeeData[] = timeEntries.map((entry) => ({
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      dailyHours: [
        { 
          date: days[0], 
          heures: entry.days.Lundi.absent ? 0 : (entry.days.Lundi.hours ?? 0), 
          pause_minutes: 0,
          HNORM: entry.days.Lundi.absent ? 0 : (entry.days.Lundi.hours ?? 0),
          HI: entry.days.Lundi.heuresIntemperie ?? 0,
          T: entry.days.Lundi.trajet ? 1 : 0,
          PA: entry.days.Lundi.panierRepas ?? false,
          trajet_perso: entry.days.Lundi.trajetPerso ?? false,
          code_chantier_du_jour: entry.days.Lundi.chantierCode,
          ville_du_jour: entry.days.Lundi.chantierVille,
          code_trajet: entry.days.Lundi.codeTrajet || null,
          commentaire: entry.days.Lundi.commentaire || null
        },
        { 
          date: days[1], 
          heures: entry.days.Mardi.absent ? 0 : (entry.days.Mardi.hours ?? 0), 
          pause_minutes: 0,
          HNORM: entry.days.Mardi.absent ? 0 : (entry.days.Mardi.hours ?? 0),
          HI: entry.days.Mardi.heuresIntemperie ?? 0,
          T: entry.days.Mardi.trajet ? 1 : 0,
          PA: entry.days.Mardi.panierRepas ?? false,
          trajet_perso: entry.days.Mardi.trajetPerso ?? false,
          code_chantier_du_jour: entry.days.Mardi.chantierCode,
          ville_du_jour: entry.days.Mardi.chantierVille,
          code_trajet: entry.days.Mardi.codeTrajet || null,
          commentaire: entry.days.Mardi.commentaire || null
        },
        { 
          date: days[2], 
          heures: entry.days.Mercredi.absent ? 0 : (entry.days.Mercredi.hours ?? 0), 
          pause_minutes: 0,
          HNORM: entry.days.Mercredi.absent ? 0 : (entry.days.Mercredi.hours ?? 0),
          HI: entry.days.Mercredi.heuresIntemperie ?? 0,
          T: entry.days.Mercredi.trajet ? 1 : 0,
          PA: entry.days.Mercredi.panierRepas ?? false,
          trajet_perso: entry.days.Mercredi.trajetPerso ?? false,
          code_chantier_du_jour: entry.days.Mercredi.chantierCode,
          ville_du_jour: entry.days.Mercredi.chantierVille,
          code_trajet: entry.days.Mercredi.codeTrajet || null,
          commentaire: entry.days.Mercredi.commentaire || null
        },
        { 
          date: days[3], 
          heures: entry.days.Jeudi.absent ? 0 : (entry.days.Jeudi.hours ?? 0), 
          pause_minutes: 0,
          HNORM: entry.days.Jeudi.absent ? 0 : (entry.days.Jeudi.hours ?? 0),
          HI: entry.days.Jeudi.heuresIntemperie ?? 0,
          T: entry.days.Jeudi.trajet ? 1 : 0,
          PA: entry.days.Jeudi.panierRepas ?? false,
          trajet_perso: entry.days.Jeudi.trajetPerso ?? false,
          code_chantier_du_jour: entry.days.Jeudi.chantierCode,
          ville_du_jour: entry.days.Jeudi.chantierVille,
          code_trajet: entry.days.Jeudi.codeTrajet || null,
          commentaire: entry.days.Jeudi.commentaire || null
        },
        { 
          date: days[4], 
          heures: entry.days.Vendredi.absent ? 0 : (entry.days.Vendredi.hours ?? 0), 
          pause_minutes: 0,
          HNORM: entry.days.Vendredi.absent ? 0 : (entry.days.Vendredi.hours ?? 0),
          HI: entry.days.Vendredi.heuresIntemperie ?? 0,
          T: entry.days.Vendredi.trajet ? 1 : 0,
          PA: entry.days.Vendredi.panierRepas ?? false,
          trajet_perso: entry.days.Vendredi.trajetPerso ?? false,
          code_chantier_du_jour: entry.days.Vendredi.chantierCode,
          ville_du_jour: entry.days.Vendredi.chantierVille,
          code_trajet: entry.days.Vendredi.codeTrajet || null,
          commentaire: entry.days.Vendredi.commentaire || null
        },
      ],
    }));

    if (employeesData.length === 0) return;

    try {
      // 1. Attendre la sauvegarde complète
      await saveFiche.mutateAsync({
        semaine: selectedWeek,
        chantierId: selectedChantier,
        employeesData,
        statut: "BROUILLON",
        userId: selectedChef,
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
      // Le toast d'erreur est déjà géré par useSaveFiche
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <PageLayout>
      <div className="bg-gradient-to-br from-background to-muted/30">
        <AppNav />
      
      {/* Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-2">
        <div className="container mx-auto px-4">
          <p className="text-xs text-amber-700 dark:text-amber-300 text-center flex items-center justify-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Mode développement : Authentification désactivée. Sélectionnez manuellement le chef d'équipe.
          </p>
        </div>
      </div>

      <PageHeader
        title="Saisie hebdomadaire"
        subtitle="Chef d'équipe"
        icon={FileText}
        theme="saisie-chef"
      />

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
                  Chef d'équipe
                </label>
                <UserSelector role="chef" value={selectedChef} onChange={setSelectedChef} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Semaine sélectionnée
                </label>
                <WeekSelector value={selectedWeek} onChange={setSelectedWeek} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Choisir un chantier
                </label>
                <ChantierSelector value={selectedChantier} onChange={setSelectedChantier} chefId={selectedChef} disabled={!isFicheModifiable} />
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
                />
              </div>
            )}
          </Card>

          {/* Avertissement si la fiche n'est pas modifiable */}
          {!isFicheModifiable && raisonBlocage && (
            <Card className="p-4 mb-4 border-destructive bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Modification impossible</p>
                  <p className="text-sm">{raisonBlocage}</p>
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
              <TimeEntryTable 
                chantierId={selectedChantier}
                weekId={selectedWeek}
                chefId={selectedChef}
                onEntriesChange={setTimeEntries}
                readOnly={!isFicheModifiable}
              />

              {/* Transport Sheet - Accordéon */}
              {selectedWeek && (
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
                    disabled={saveFiche.isPending || isSubmitting || !selectedChef || timeEntries.length === 0 || !isTransportComplete || !areCodeTrajetsComplete || !isFicheModifiable}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Enregistrer et collecter les signatures
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Les maçons devront signer individuellement sur la tablette
                  </p>
                  {!isTransportComplete && selectedWeek && selectedChantier && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium text-center">
                        ⚠️ La fiche de trajet doit être complétée avant de collecter les signatures
                      </p>
                    </div>
                  )}
                  {!areCodeTrajetsComplete && selectedWeek && selectedChantier && timeEntries.length > 0 && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="text-sm text-orange-800 dark:text-orange-200 font-medium text-center">
                        ⚠️ {missingCount} code(s) trajet manquant(s)
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 text-center">
                        Tous les jours travaillés doivent avoir un code trajet
                      </p>
                    </div>
                  )}
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
