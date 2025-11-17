import { useState, useEffect, Fragment, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Truck, ChevronDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/navigation/AppNav";
import { RoleBadge } from "@/components/ui/role-badge";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { useSaveSignature } from "@/hooks/useSaveSignature";
import { useFinisseursByConducteur, type FinisseurWithFiche } from "@/hooks/useFinisseursByConducteur";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getNextWeek } from "@/lib/weekUtils";
import { useCopyAllDataFinisseurs } from "@/hooks/useCopyAllDataFinisseurs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SignatureFinisseurs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const semaine = searchParams.get("semaine") || "";
  const conducteurId = searchParams.get("conducteurId") || "";

  const signaturePadContainerRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conducteurData, setConducteurData] = useState<FinisseurWithFiche | null>(null);
  const [transportFinisseursData, setTransportFinisseursData] = useState<Record<string, any>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [chantiersMap, setChantiersMap] = useState<Map<string, string>>(new Map());

  const toggleRow = (finisseurId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(finisseurId)) {
        newSet.delete(finisseurId);
      } else {
        newSet.add(finisseurId);
      }
      return newSet;
    });
  };

  // Récupérer les données du conducteur
  useEffect(() => {
    const fetchConducteur = async () => {
      if (!conducteurId) return;
      
      const { data } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, email")
        .eq("id", conducteurId)
        .single();
      
      if (data) {
        setConducteurData({
          id: data.id,
          nom: data.nom || "",
          prenom: data.prenom || "",
          email: data.email,
          totalHeures: 0,
          paniers: 0,
          trajets: 0,
          intemperie: 0,
          hasSigned: false,
          isConducteur: true,
        });
      }
    };
    
    fetchConducteur();
  }, [conducteurId]);

  const { data: finisseurs = [] } = useFinisseursByConducteur(conducteurId, semaine);

  // Charger les codes chantier
  useEffect(() => {
    const loadChantiers = async () => {
      if (finisseurs.length === 0) return;
      
      // Extraire tous les chantier_id uniques des affectations
      const chantierIds = new Set<string>();
      finisseurs.forEach(f => {
        f.affectedDays?.forEach(day => {
          if (day.chantier_id) {
            chantierIds.add(day.chantier_id);
          }
        });
      });
      
      if (chantierIds.size === 0) return;
      
      // Charger les chantiers correspondants
      const { data: chantiers } = await supabase
        .from("chantiers")
        .select("id, code_chantier")
        .in("id", Array.from(chantierIds));
      
      if (chantiers) {
        const map = new Map<string, string>();
        chantiers.forEach(ch => {
          if (ch.code_chantier) {
            map.set(ch.id, ch.code_chantier);
          }
        });
        setChantiersMap(map);
      }
    };
    
    loadChantiers();
  }, [finisseurs]);
  const saveSignature = useSaveSignature();
  const copyAllDataFinisseurs = useCopyAllDataFinisseurs();

  // Charger les données de transport pour chaque finisseur
  useEffect(() => {
    const loadTransportData = async () => {
      if (finisseurs.length === 0) return;
      
      const transportMap: Record<string, any> = {};
      
      for (const finisseur of finisseurs) {
        try {
          // Récupérer directement la fiche de transport du finisseur
          const { data: transport } = await supabase
            .from("fiches_transport_finisseurs")
            .select("id, fiche_id")
            .eq("finisseur_id", finisseur.id)
            .eq("semaine", semaine)
            .maybeSingle();
          
          if (transport) {
            const { data: jours } = await supabase
              .from("fiches_transport_finisseurs_jours")
              .select("*")
              .eq("fiche_transport_finisseur_id", transport.id)
              .order("date");
            
            // Enrichir avec l'info trajet_perso depuis ficheJours
            const enrichedJours = jours?.map(jour => {
              const ficheJour = finisseur.ficheJours?.find(fj => fj.date === jour.date);
              return {
                ...jour,
                trajet_perso: ficheJour?.trajet_perso || false
              };
            }) || [];
            
            transportMap[finisseur.id] = {
              days: enrichedJours
            };
          }
        } catch (error) {
          console.error(`Erreur chargement transport pour ${finisseur.prenom}:`, error);
        }
      }
      
      setTransportFinisseursData(transportMap);
    };
    
    loadTransportData();
  }, [finisseurs, semaine]);

  // Vérifier si le conducteur a déjà signé
  const conducteurHasSigned = conducteurData?.hasSigned || false;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Récupérer la signature directement depuis le canvas
    const canvas = signaturePadContainerRef.current?.querySelector('canvas');
    if (!canvas) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la signature.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que le canvas n'est pas vide
    const context = canvas.getContext('2d');
    const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = imageData?.data.every((value, index) => {
      return index % 4 === 3 ? value === 0 : true; // Vérifie uniquement le canal alpha
    });

    if (isEmpty) {
      toast({
        title: "Signature manquante",
        description: "Veuillez signer avant de valider.",
        variant: "destructive",
      });
      return;
    }

    const conducteurSignature = canvas.toDataURL("image/png");
    setIsSubmitting(true);

    try {
      // 1. Sauvegarder la signature du conducteur pour TOUTES les fiches des finisseurs
      if (conducteurSignature) {
        for (const finisseur of finisseurs) {
          const { data: ficheFinisseur } = await supabase
            .from("fiches")
            .select("id")
            .eq("semaine", semaine)
            .eq("salarie_id", finisseur.id)
            .is("chantier_id", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (ficheFinisseur) {
            await saveSignature.mutateAsync({
              ficheId: ficheFinisseur.id,
              userId: conducteurId,
              signatureData: conducteurSignature,
              role: "conducteur",
            });
          }
        }
      }

      // 2. Mettre à jour le statut de TOUTES les fiches des finisseurs → ENVOYE_RH
      const finisseurIds = finisseurs.map(f => f.id);

      if (finisseurIds.length > 0) {
        const { error: updateError } = await supabase
          .from("fiches")
          .update({ statut: "ENVOYE_RH" })
          .eq("semaine", semaine)
          .in("salarie_id", finisseurIds)
          .is("chantier_id", null);

        if (updateError) {
          console.error("Erreur mise à jour statut finisseurs:", updateError);
          throw updateError;
        }
      }

      toast({
        title: "✅ Signatures enregistrées",
        description: "Transmission automatique au service RH effectuée.",
      });

      // 3. Copier TOUTES les données vers la semaine suivante
      const nextWeek = getNextWeek(semaine);
      sessionStorage.setItem('conducteur_teamWeek', nextWeek);
      
      await copyAllDataFinisseurs.mutateAsync({ 
        conducteurId, 
        currentWeek: semaine, 
        nextWeek 
      });

      // 4. Définir le flag pour afficher le toast sur la page suivante
      sessionStorage.setItem('fromSignature', 'true');

      // 5. Rediriger vers la semaine suivante
      navigate(`/validation-conducteur?tab=mes-heures&semaine=${nextWeek}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (conducteurHasSigned) {
    return (
      <PageLayout>
        <AppNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold">Signature déjà enregistrée !</h2>
          <p className="text-muted-foreground mt-2">
            Vous avez déjà signé pour cette semaine.
          </p>
          <Button className="mt-6" onClick={() => navigate("/validation-conducteur")}>
            Retour
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (!conducteurData) {
    return (
      <PageLayout>
        <AppNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <p>Chargement...</p>
        </div>
      </PageLayout>
    );
  }

  // Fonction pour calculer les stats uniquement sur les jours affectés
  const calculateAffectedStats = (finisseur: FinisseurWithFiche) => {
    if (!finisseur.ficheJours || !finisseur.affectedDays || finisseur.affectedDays.length === 0) {
      return {
        heures: 0,
        paniers: 0,
        trajets: 0,
        intemperie: 0
      };
    }
    
    const affectedDaysSet = new Set(finisseur.affectedDays?.map(a => a.date));
    const relevantJours = finisseur.ficheJours.filter(jour => 
      affectedDaysSet.has(jour.date)
    );
    
    return {
      heures: relevantJours.reduce((sum, jour) => sum + (jour.HNORM || 0), 0),
      paniers: relevantJours.filter(jour => jour.PA).length,
      trajets: relevantJours.reduce((sum, jour) => sum + (jour.T || 0), 0),
      intemperie: relevantJours.reduce((sum, jour) => sum + (jour.HI || 0), 0)
    };
  };

  return (
    <PageLayout>
      <AppNav />
      <PageHeader
        title="Signatures Finisseurs"
        subtitle={`Semaine ${semaine}`}
        icon={CheckCircle2}
        theme="validation-conducteur"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/validation-conducteur")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Récapitulatif des heures de l'équipe */}
        {finisseurs.length > 0 && (
          <Card className="mb-6 shadow-md border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Récapitulatif de votre équipe - Semaine {semaine}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Vérifiez les heures de tous vos finisseurs avant de signer
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="text-left py-2 px-3 font-semibold">Finisseur</TableHead>
                      <TableHead className="text-center py-2 px-3 font-semibold">Heures</TableHead>
                      <TableHead className="text-center py-2 px-3 font-semibold">Paniers</TableHead>
                      <TableHead className="text-center py-2 px-3 font-semibold">Trajets</TableHead>
                      <TableHead className="text-center py-2 px-3 font-semibold">Trajets perso</TableHead>
                      <TableHead className="text-center py-2 px-3 font-semibold">Absences</TableHead>
                      <TableHead className="text-center py-2 px-3 font-semibold">Intempéries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finisseurs.map((finisseur) => {
                      const transportData = transportFinisseursData[finisseur.id];
                      const hasTransportData = transportData?.days && transportData.days.length > 0;
                      const isExpanded = expandedRows.has(finisseur.id);
                      const stats = calculateAffectedStats(finisseur);
                      
                      // Filtrer les jours de transport pour ne garder QUE ceux affectés au conducteur actuel
                      const affectedDatesSet = new Set(finisseur.affectedDays?.map(a => a.date) || []);
                      const relevantTransportDays = transportData?.days?.filter((day: any) => 
                        affectedDatesSet.has(day.date)
                      ) || [];
                      
                      // Calculer les trajets personnels et d'entreprise UNIQUEMENT sur les jours affectés
                      const countTrajetPerso = relevantTransportDays.filter((day: any) => day.trajet_perso === true).length;
                      const countTrajetsEntreprise = relevantTransportDays.filter((day: any) => !day.trajet_perso && day.immatriculation).length;
                      
                      // Calculer les absences (jours affectés avec HNORM=0 et pas trajet perso)
                      const countAbsences = finisseur.ficheJours?.filter(jour => {
                        const isAffected = finisseur.affectedDays?.some(a => a.date === jour.date);
                        return isAffected && jour.HNORM === 0 && !jour.trajet_perso;
                      }).length || 0;
                      
                      return (
                        <Fragment key={finisseur.id}>
                          {/* Ligne principale avec les totaux */}
                          <TableRow 
                            className="border-b border-border/30 hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleRow(finisseur.id)}
                          >
                            <TableCell className="py-2 px-3 font-medium">
                              <div className="flex items-center gap-2">
                                <ChevronDown 
                                  className={cn(
                                    "h-4 w-4 shrink-0 transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                                {finisseur.prenom} {finisseur.nom}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-2 px-3 font-bold text-primary">
                              {stats.heures}h
                            </TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {stats.paniers}
                            </TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {countTrajetsEntreprise > 0 ? countTrajetsEntreprise : "-"}
                            </TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {countTrajetPerso > 0 ? countTrajetPerso : "-"}
                            </TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {countAbsences > 0 ? countAbsences : "-"}
                            </TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {stats.intemperie}h
                            </TableCell>
                          </TableRow>
                          
                          {/* Ligne dépliable : détail des trajets */}
                          {isExpanded && (
                            <TableRow className="border-b border-border/30">
                              <TableCell colSpan={7} className="py-3 px-6 bg-muted/30">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                                    <Truck className="h-4 w-4" />
                                    Détail des trajets
                                  </div>
                                  
                                  {hasTransportData || finisseur.ficheJours ? (
                                     <div className="grid grid-cols-1 gap-1.5 text-sm">
                                      {finisseur.affectedDays?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((affectedDay) => {
                                        const ficheJour = finisseur.ficheJours?.find(fj => fj.date === affectedDay.date);
                                        const transportDay = transportData?.days?.find((d: any) => d.date === affectedDay.date);
                                        
                                        // Récupérer le code chantier et code trajet
                                        const codeChantier = ficheJour?.code_chantier_du_jour || chantiersMap.get(affectedDay.chantier_id) || null;
                                        const codeTrajet = ficheJour?.code_trajet || null;
                                        
                                        const isAbsent = ficheJour && ficheJour.HNORM === 0 && !ficheJour.trajet_perso;
                                        const isTrajetPerso = ficheJour?.trajet_perso === true;
                                        const hasImmat = transportDay?.immatriculation && transportDay.immatriculation.trim() !== "";
                                        
                                        return (
                                          <div 
                                            key={affectedDay.date}
                                            className="flex items-center gap-3 py-1.5 px-3 bg-background rounded border border-border/30"
                                          >
                                            <span className="font-medium capitalize min-w-[100px]">
                                              {format(new Date(affectedDay.date), "EEE dd/MM", { locale: fr })}
                                            </span>
                                            
                                            {/* Badge code chantier */}
                                            {codeChantier && (
                                              <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-medium">
                                                {codeChantier}
                                              </span>
                                            )}
                                            
                                            {/* Badge code trajet */}
                                            {codeTrajet && (
                                              <span className="font-mono text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-medium">
                                                {codeTrajet}
                                              </span>
                                            )}
                                            
                                            {isAbsent ? (
                                              <span className="flex items-center gap-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-medium">
                                                🚫 ABSENT
                                              </span>
                                            ) : isTrajetPerso ? (
                                              <span className="flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium">
                                                🚗 Véhicule personnel
                                              </span>
                                            ) : hasImmat ? (
                                              <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                                                {transportDay.immatriculation}
                                              </span>
                                            ) : (
                                              <span className="text-xs text-muted-foreground italic px-2 py-0.5">
                                                Non renseigné
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic py-2">
                                      Aucune donnée disponible
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}


        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold">
                {conducteurData.prenom} {conducteurData.nom}
              </h3>
              <RoleBadge role="conducteur" />
            </div>
            <p className="text-sm text-muted-foreground">
              En signant, vous validez les fiches de toute votre équipe ({finisseurs.length} finisseur{finisseurs.length > 1 ? 's' : ''})
            </p>
          </div>

          <div ref={signaturePadContainerRef} className="[&_button.bg-success]:hidden">
            <SignaturePad 
              onSave={() => {}} 
              employeeName={`${conducteurData.prenom} ${conducteurData.nom}`}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Signer et valider pour toute l'équipe
            </Button>
          </div>
        </Card>
      </main>
    </PageLayout>
  );
};

export default SignatureFinisseurs;
