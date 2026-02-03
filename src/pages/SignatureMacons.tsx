import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle, FileText, ArrowLeft, Loader2, Clock, Truck, AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMaconsByChantier, type MaconWithFiche } from "@/hooks/useMaconsByChantier";
import { useSaveSignature } from "@/hooks/useSaveSignature";
import { useUpdateFicheStatus } from "@/hooks/useFiches";
import { useTransportByChantier } from "@/hooks/useTransportByChantier";
import { useAffectationsJoursByChefAndChantier } from "@/hooks/useAffectationsJoursChef";
import { usePlanningMode } from "@/hooks/usePlanningMode";
import { TransportSummaryV2 } from "@/components/transport/TransportSummaryV2";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getNextWeek } from "@/lib/weekUtils";
// La copie S→S+1 est désormais gérée par la sync Planning (lundi 5h)
import { useQuery } from "@tanstack/react-query";

const SignatureMacons = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chantierId = searchParams.get("chantierId");
  const semaine = searchParams.get("semaine");
  const chefId = searchParams.get("chefId");

  const { data: maconsData, isLoading } = useMaconsByChantier(chantierId || "", semaine || "", chefId || undefined);
  const { data: transportData } = useTransportByChantier(chantierId, semaine);
  // Vérifier si le planning est actif (validé par un conducteur)
  const { isActive: isPlanningActive } = usePlanningMode(semaine || "");
  
  // Ne charger les affectations jours QUE si le planning est actif - filtré par chantier
  const { data: affectationsJoursChef = [] } = useAffectationsJoursByChefAndChantier(
    isPlanningActive ? (chefId || null) : null,
    isPlanningActive ? chantierId : null,
    semaine || ""
  );
  const saveSignature = useSaveSignature();
  const updateStatus = useUpdateFicheStatus();
  // La copie S→S+1 est désormais gérée par la sync Planning (lundi 5h)

  // Récupérer le chantier principal du chef pour afficher l'indicateur chantier secondaire
  const { data: chefChantierPrincipal } = useQuery({
    queryKey: ["chef-chantier-principal-signature", chefId],
    queryFn: async () => {
      if (!chefId) return null;
      
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("chantier_principal_id")
        .eq("id", chefId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.chantier_principal_id || null;
    },
    enabled: !!chefId,
  });

  // Calculer si on est sur un chantier secondaire (chef présent mais pas son chantier principal)
  const isChantierSecondaire = !!(chefChantierPrincipal && chantierId && chefChantierPrincipal !== chantierId);

  const [macons, setMacons] = useState<MaconWithFiche[]>([]);
  const [selectedMacon, setSelectedMacon] = useState<MaconWithFiche | null>(null);

  // Fonction pour filtrer les données d'un maçon selon ses jours affectés
  const getFilteredMaconData = useMemo(() => {
    return (macon: MaconWithFiche): MaconWithFiche => {
      // 🔥 MODE LEGACY : Si le planning n'est pas validé, ne pas filtrer
      if (!isPlanningActive) {
        return macon;
      }
      
      // Le chef n'est jamais filtré
      if (macon.isChef) {
        return macon;
      }

      // ✅ FIX: En planning actif, pas de fallback qui afficherait 39h
      // Si pas d'affectations configurées, retourner 0h pour éviter les heures fantômes
      if (!affectationsJoursChef || affectationsJoursChef.length === 0) {
        return {
          ...macon,
          ficheJours: [],
          totalHeures: 0,
          paniers: 0,
          trajets: 0,
          intemperie: 0,
        };
      }

      // Récupérer les jours autorisés pour ce maçon
      const joursAutorises = affectationsJoursChef
        .filter(aff => aff.macon_id === macon.id)
        .map(aff => aff.jour);

      // ✅ FIX: Si aucune affectation spécifique pour ce maçon, afficher 0h
      if (joursAutorises.length === 0) {
        return {
          ...macon,
          ficheJours: [],
          totalHeures: 0,
          paniers: 0,
          trajets: 0,
          intemperie: 0,
        };
      }

      // Filtrer les ficheJours
      const filteredJours = macon.ficheJours?.filter(j => joursAutorises.includes(j.date)) || [];

      // Recalculer les totaux basés sur les jours filtrés
      return {
        ...macon,
        ficheJours: filteredJours,
        totalHeures: filteredJours.reduce((sum, j) => sum + Number(j.heures || 0), 0),
        paniers: filteredJours.filter(j => j.PA).length,
        trajets: filteredJours.filter(j => j.trajet_perso || (j.code_trajet && j.code_trajet !== '')).length,
        intemperie: filteredJours.reduce((sum, j) => sum + Number(j.HI || 0), 0),
      };
    };
  }, [isPlanningActive, affectationsJoursChef]);

  // Update local state when data loads and sort: non-temporary workers first, then temporary workers
  useEffect(() => {
    if (maconsData) {
      const sorted = [...maconsData].sort((a, b) => {
        const aIsInterim = a.role === "interimaire";
        const bIsInterim = b.role === "interimaire";
        
        if (aIsInterim && !bIsInterim) return 1;
        if (!aIsInterim && bIsInterim) return -1;
        return 0;
      });
      
      setMacons(sorted);
    }
  }, [maconsData]);

  // Auto-select first unsigned mason - priorité au chef
  useEffect(() => {
    if (macons.length > 0 && !selectedMacon) {
      // Priorité 1 : Le chef non-signé (premier de la liste triée)
      const chefUnsigned = macons.find((m) => m.isChef && !m.signed);
      // Priorité 2 : Premier employé non-signé
      const firstUnsigned = macons.find((m) => !m.signed);
      setSelectedMacon(chefUnsigned || firstUnsigned || macons[0]);
    }
  }, [macons, selectedMacon]);

  const handleSaveSignature = async (signatureData: string) => {
    if (!selectedMacon) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Aucun employé sélectionné",
      });
      return;
    }
    
    if (!selectedMacon.ficheId) {
      toast({
        variant: "destructive",
        title: "Fiche introuvable",
        description: "La fiche de pointage n'existe pas pour cet employé. Essayez de rafraîchir la page.",
      });
      return;
    }

    try {
      await saveSignature.mutateAsync({
        ficheId: selectedMacon.ficheId,
        userId: selectedMacon.id,
        role: selectedMacon.isChef ? "chef" : undefined,
        signatureData,
      });

      // Update local state
      const updatedMacons = macons.map((m) =>
        m.id === selectedMacon.id ? { ...m, signed: true } : m
      );
      setMacons(updatedMacons);

      // Auto-select next unsigned mason
      const nextUnsigned = updatedMacons.find((m) => !m.signed);
      setSelectedMacon(nextUnsigned || null);
    } catch (error) {
      console.error("Error saving signature:", error);
    }
  };

  const allSigned = macons.every((m) => m.signed);
  const signedCount = macons.filter((m) => m.signed).length;

  const handleFinish = async () => {
    if (!chantierId || !semaine || !chefId) return;

    try {
      // 1. Mettre à jour le statut → VALIDE_CHEF
      await updateStatus.mutateAsync({
        chantierId,
        semaine,
        status: "VALIDE_CHEF",
      });

      // 2. Calculer la semaine suivante
      const nextWeek = getNextWeek(semaine);

      // La copie S→S+1 est désormais gérée par la sync Planning (lundi 5h)
      // Le transport peut être copié manuellement via le bouton "Copier S-1" dans la fiche trajet

      // 3. Notification au conducteur - Mode ciblé
      try {
        const { error: notifError } = await supabase.functions.invoke("notify-conducteur", {
          body: { chantierId, semaine }
        });
        if (notifError) {
          console.error("Erreur notification conducteur:", notifError);
          toast({
            variant: "default",
            title: "⚠️ Avertissement",
            description: "La fiche est transmise mais le conducteur n'a pas été notifié par email.",
          });
        }
      } catch (e) {
        console.error("Exception notification conducteur:", e);
        toast({
          variant: "default",
          title: "⚠️ Avertissement",
          description: "La fiche est transmise mais le conducteur n'a pas été notifié par email.",
        });
      }

      // 5. Mettre à jour sessionStorage pour la prochaine page
      sessionStorage.setItem('timesheet_selectedWeek', nextWeek);
      sessionStorage.setItem('timesheet_selectedChantier', chantierId);
      sessionStorage.setItem('timesheet_selectedChef', chefId);

      // 6. Afficher message de confirmation
      toast({
        title: "✅ Fiche soumise au conducteur",
        description: "Bascule automatique vers la semaine suivante dans 3 secondes...",
        duration: 3000,
      });

      // 7. Redirection différée vers la page de saisie avec semaine suivante
      setTimeout(() => {
        navigate(`/?semaine=${nextWeek}`);
      }, 3000);

    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: "Impossible de soumettre la fiche",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chantierId || !semaine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Paramètres manquants</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Signatures des maçons
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Collecte des signatures avant soumission au conducteur
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          {/* Progress */}
          <Card className="p-6 shadow-md border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Progression des signatures</h2>
              <Badge
                variant="outline"
                className={
                  allSigned
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-warning/10 text-warning border-warning/30"
                }
              >
                {signedCount} / {macons.length} signées
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${(signedCount / macons.length) * 100}%` }}
              />
            </div>
          </Card>

          {/* Layout 2 colonnes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche : Liste des maçons */}
            <div className="lg:col-span-1">
              <Card className="p-4 shadow-md border-border/50 lg:sticky lg:top-24">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Maçons ({signedCount}/{macons.length})
                </h2>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {macons.map((macon) => (
                      <div
                        key={macon.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedMacon?.id === macon.id
                            ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                            : macon.signed
                            ? "bg-success/5 border-success/30 hover:bg-success/10"
                            : "bg-muted/30 border-border/30 hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedMacon(macon)}
                      >
                        {macon.signed ? (
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className={`text-sm font-medium truncate ${
                            selectedMacon?.id === macon.id ? "text-primary" : "text-foreground"
                          }`}>
                            {macon.prenom} {macon.nom}
                          </span>
                          {macon.isChef ? (
                            <RoleBadge role="chef" size="sm" />
                          ) : macon.role ? (
                            <RoleBadge role={macon.role as any} size="sm" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>

            {/* Colonne droite : Récapitulatif + SignaturePad */}
            <div className="lg:col-span-2 space-y-6">
              {selectedMacon ? (
                selectedMacon.signed ? (
                  // Afficher un message "Déjà signé" au lieu du pad
                  <Card className="p-12 shadow-md border-border/50 flex items-center justify-center min-h-[500px]">
                    <div className="text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-success" />
                      <p className="text-lg font-semibold text-foreground">Signature déjà collectée</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedMacon.prenom} {selectedMacon.nom} a déjà signé cette semaine
                      </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Récapitulatif de transport (accordéon) */}
                    {transportData && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="transport" className="border-none">
                          <Card className="shadow-md border-border/50">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                              <div className="flex items-center gap-2 text-lg font-semibold">
                                <Truck className="h-5 w-5 text-primary" />
                                Récapitulatif Trajet
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-4">
                              <TransportSummaryV2 transportData={transportData} />
                            </AccordionContent>
                          </Card>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Récapitulatif des heures */}
                    {(() => {
                      const filteredMacon = getFilteredMaconData(selectedMacon);
                      return filteredMacon.ficheJours && filteredMacon.ficheJours.length > 0 && (
                        <Card className="shadow-md border-border/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                              <Clock className="h-5 w-5 text-primary" />
                              Récapitulatif de vos heures - Semaine {semaine}
                              {selectedMacon.isChef && (
                                <RoleBadge role="chef" size="sm" />
                              )}
                              {selectedMacon.isChef && isChantierSecondaire && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700">
                                  Indicatif
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedMacon.isChef && isChantierSecondaire 
                                ? "Heures de ce chantier secondaire (non comptabilisées)"
                                : "Vérifiez vos heures avant de signer"
                              }
                            </p>
                          </CardHeader>
                          
                          {/* Bandeau d'avertissement pour chef sur chantier secondaire */}
                          {selectedMacon.isChef && isChantierSecondaire && (
                            <div className="mx-6 mb-4 flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                  Chantier secondaire - Heures indicatives
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                  Vos heures réelles sont saisies sur votre chantier principal. 
                                  Les heures affichées ici sont à titre indicatif uniquement et ne seront pas comptabilisées pour la paie.
                                </p>
                              </div>
                            </div>
                          )}
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border/50">
                                    <th className="text-left py-2 px-3 font-semibold text-foreground">Date</th>
                                    <th className="text-center py-2 px-3 font-semibold text-foreground">Heures</th>
                                    <th className="text-center py-2 px-3 font-semibold text-foreground">Panier</th>
                                    <th className="text-center py-2 px-3 font-semibold text-foreground">Trajets</th>
                                    <th className="text-center py-2 px-3 font-semibold text-foreground">Intempérie</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredMacon.ficheJours.map((jour) => (
                                    <tr key={jour.id} className="border-b border-border/30">
                                      <td className="py-2 px-3 text-foreground">
                                        {format(new Date(jour.date), "EEE dd/MM", { locale: fr })}
                                      </td>
                                      <td className="text-center py-2 px-3">
                                        {/* Chef sur chantier secondaire = 0h par design, pas "absent" */}
                                        {selectedMacon.isChef && isChantierSecondaire && jour.HNORM === 0 && jour.HI === 0 ? (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                            Chantier principal
                                          </Badge>
                                        ) : jour.HNORM === 0 && jour.HI === 0 ? (
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                                            Absent
                                          </Badge>
                                        ) : (
                                          <span className="text-foreground font-medium">{jour.heures}h</span>
                                        )}
                                      </td>
                                      <td className="text-center py-2 px-3">
                                        {(jour as any).repas_type === "RESTO" ? (
                                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                                            Resto
                                          </Badge>
                                        ) : jour.PA ? (
                                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                                            ✓
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                      <td className="text-center py-2 px-3">
                                        {jour.trajet_perso ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                            Perso
                                          </Badge>
                                        ) : jour.code_trajet && jour.code_trajet !== '' ? (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                            {jour.code_trajet}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                      <td className="text-center py-2 px-3 text-foreground">
                                        {jour.HI > 0 ? `${jour.HI}h` : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-border/70 bg-muted/30">
                                    <td className="py-3 px-3 font-bold text-foreground">Total</td>
                                    <td className="text-center py-3 px-3 font-bold text-primary">
                                      {filteredMacon.totalHeures || 0}h
                                    </td>
                                    <td className="text-center py-3 px-3 font-bold text-foreground">
                                      {filteredMacon.paniers || 0}
                                    </td>
                                    <td className="text-center py-3 px-3 font-bold text-foreground">
                                      {filteredMacon.trajets || 0}
                                    </td>
                                    <td className="text-center py-3 px-3 font-bold text-foreground">
                                      {filteredMacon.intemperie || 0}h
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* SignaturePad */}
                    <SignaturePad
                      employeeName={`${selectedMacon.prenom} ${selectedMacon.nom}`}
                      onSave={handleSaveSignature}
                    />
                  </>
                )
              ) : (
                <Card className="p-12 shadow-md border-border/50 flex items-center justify-center min-h-[500px]">
                  <div className="text-center text-muted-foreground">
                    <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Sélectionnez un maçon pour commencer</p>
                    <p className="text-sm mt-2">Cliquez sur un nom dans la liste</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Finish Button */}
          {allSigned && (
            <Card className="p-6 shadow-md border-border/50 bg-success/5 border-success/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Toutes les signatures sont collectées
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vous pouvez maintenant soumettre la fiche au conducteur de travaux
                  </p>
                </div>
                <Button onClick={handleFinish} className="bg-success hover:bg-success/90">
                  Soumettre au conducteur
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SignatureMacons;
