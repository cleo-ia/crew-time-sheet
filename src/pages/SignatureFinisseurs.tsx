import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Truck, ArrowLeft } from "lucide-react";
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
// La copie S→S+1 est désormais gérée par la sync Planning (lundi 5h)
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TransportSummaryV2 } from "@/components/transport/TransportSummaryV2";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TransportDayV2 } from "@/types/transport";

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
  const [chantiersMap, setChantiersMap] = useState<Map<string, string>>(new Map());
  // Données de transport consolidées pour le récap global (tous les jours/véhicules avec noms conducteurs)
  const [allTransportJoursRaw, setAllTransportJoursRaw] = useState<any[]>([]);

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

  // Map enrichie avec code + nom du chantier
  const [chantiersInfo, setChantiersInfo] = useState<Map<string, { code: string; nom: string }>>(new Map());

  // Charger les codes et noms des chantiers
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
      
      // Charger les chantiers correspondants avec code et nom
      const { data: chantiers } = await supabase
        .from("chantiers")
        .select("id, code_chantier, nom")
        .in("id", Array.from(chantierIds));
      
      if (chantiers) {
        // Map pour chantiersMap (legacy - code uniquement)
        const codeMap = new Map<string, string>();
        // Map enrichie avec code + nom
        const infoMap = new Map<string, { code: string; nom: string }>();
        
        chantiers.forEach(ch => {
          if (ch.code_chantier) {
            codeMap.set(ch.id, ch.code_chantier);
          }
          infoMap.set(ch.id, {
            code: ch.code_chantier || "SANS_CODE",
            nom: ch.nom || ""
          });
        });
        setChantiersMap(codeMap);
        setChantiersInfo(infoMap);
      }
    };
    
    loadChantiers();
  }, [finisseurs]);
  const saveSignature = useSaveSignature();
  // La copie S→S+1 est désormais gérée par la sync Planning (lundi 5h)

  // Charger les données de transport depuis le nouveau système unifié (fiches_transport)
  useEffect(() => {
    const loadTransportData = async () => {
      if (finisseurs.length === 0) return;
      
      const transportMap: Record<string, any> = {};
      
      try {
        // 1. Récupérer tous les chantier_ids uniques depuis les affectations
        const chantierIds = new Set<string>();
        finisseurs.forEach(f => {
          f.affectedDays?.forEach(day => {
            if (day.chantier_id) {
              chantierIds.add(day.chantier_id);
            }
          });
        });
        
        if (chantierIds.size === 0) return;
        
        // 2. Récupérer les fiches transport unifiées par chantier + semaine
        const { data: fichesTransport, error: ftError } = await supabase
          .from("fiches_transport")
          .select("id, chantier_id")
          .in("chantier_id", Array.from(chantierIds))
          .eq("semaine", semaine);
        
        if (ftError) throw ftError;
        if (!fichesTransport?.length) return;
        
      // 2b. Récupérer fiche_id et chantier_id pour les codes chantier
      const { data: fichesTransportMeta } = await supabase
        .from("fiches_transport")
        .select("id, fiche_id, chantier_id")
        .in("id", fichesTransport.map(ft => ft.id));
      
      // 2c. Récupérer les codes chantier du jour depuis fiches_jours (source prioritaire)
      const ficheIds = [...new Set((fichesTransportMeta || []).map(ft => ft.fiche_id).filter(Boolean))];
      let codeChantierByDate = new Map<string, string>();
      
      if (ficheIds.length > 0) {
        const { data: fichesJours } = await supabase
          .from("fiches_jours")
          .select("fiche_id, date, code_chantier_du_jour")
          .in("fiche_id", ficheIds);
        
        // Map date → code_chantier_du_jour
        (fichesJours || []).forEach(fj => {
          if (fj.code_chantier_du_jour) {
            codeChantierByDate.set(fj.date, fj.code_chantier_du_jour);
          }
        });
      }
      
      // 2d. Fallback : codes chantier par défaut depuis chantiers
      const chantierIdsForCodes = [...new Set((fichesTransportMeta || []).map(ft => ft.chantier_id).filter(Boolean))];
      let defaultCodeByChantier = new Map<string, string>();
      
      if (chantierIdsForCodes.length > 0) {
        const { data: chantiersData } = await supabase
          .from("chantiers")
          .select("id, code_chantier")
          .in("id", chantierIdsForCodes);
        
        (chantiersData || []).map(c => {
          if (c.code_chantier) {
            defaultCodeByChantier.set(c.id, c.code_chantier);
          }
        });
      }
      
        // 3. Récupérer tous les jours de transport pour ces fiches
        const ficheTransportIds = fichesTransport.map(ft => ft.id);
        const { data: joursTransport, error: jtError } = await supabase
          .from("fiches_transport_jours")
          .select(`
            id, date, immatriculation, fiche_transport_id, periode,
            conducteur_aller:utilisateurs!fiches_transport_jours_conducteur_aller_id_fkey(id, nom, prenom),
            conducteur_retour:utilisateurs!fiches_transport_jours_conducteur_retour_id_fkey(id, nom, prenom)
          `)
          .in("fiche_transport_id", ficheTransportIds)
          .order("date")
          .order("periode");
        
        if (jtError) throw jtError;
        
      // Enrichir chaque jour avec le code chantier (2 niveaux de fallback)
      const enrichedJoursRaw = (joursTransport || []).map(jour => {
        const ft = fichesTransportMeta?.find(f => f.id === jour.fiche_transport_id);
        // Source 1 : code_chantier_du_jour depuis fiches_jours
        const codeFromFiche = codeChantierByDate.get(jour.date);
        // Source 2 : code_chantier par défaut du chantier
        const codeDefault = ft?.chantier_id ? defaultCodeByChantier.get(ft.chantier_id) : null;
        
        return {
          ...jour,
          codeChantier: codeFromFiche || codeDefault || "-"
        };
      });
      
      // Stocker les données brutes enrichies pour le récap global
      setAllTransportJoursRaw(enrichedJoursRaw);
        
        // 4. Créer une map chantier_id → jours de transport
        const transportByChantier = new Map<string, any[]>();
        fichesTransport.forEach(ft => {
          transportByChantier.set(ft.chantier_id!, []);
        });
        
        joursTransport?.forEach(jour => {
          const ft = fichesTransport.find(f => f.id === jour.fiche_transport_id);
          if (ft?.chantier_id) {
            transportByChantier.get(ft.chantier_id)?.push(jour);
          }
        });
        
        // 5. Mapper les données pour chaque finisseur selon ses dates d'affectation
        for (const finisseur of finisseurs) {
          const affectedDays = finisseur.affectedDays || [];
          const enrichedJours: any[] = [];
          
          for (const affectation of affectedDays) {
            if (!affectation.chantier_id || !affectation.date) continue;
            
            // Trouver le jour de transport correspondant
            const chantiersJours = transportByChantier.get(affectation.chantier_id) || [];
            const jourTransport = chantiersJours.find(j => j.date === affectation.date);
            
            // Enrichir avec trajet_perso depuis ficheJours
            const ficheJour = finisseur.ficheJours?.find(fj => fj.date === affectation.date);
            
            enrichedJours.push({
              date: affectation.date,
              immatriculation: jourTransport?.immatriculation || null,
              conducteur_matin_id: jourTransport?.conducteur_aller?.id || null,
              conducteur_soir_id: jourTransport?.conducteur_retour?.id || null,
              trajet_perso: ficheJour?.trajet_perso || false
            });
          }
          
          transportMap[finisseur.id] = {
            days: enrichedJours.sort((a, b) => a.date.localeCompare(b.date))
          };
        }
      } catch (error) {
        console.error("Erreur chargement transport unifié:", error);
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
          // ✅ CORRECTION: Récupérer les chantier_ids depuis les affectations
          const finisseurAffectations = finisseur.affectedDays || [];
          const chantierIds = [...new Set(finisseurAffectations.map(a => a.chantier_id).filter(Boolean))];
          
          if (chantierIds.length === 0) continue;
          
          // Chercher la fiche par chantier (toutes les fiches ont un chantier_id maintenant)
          const { data: ficheFinisseur } = await supabase
            .from("fiches")
            .select("id")
            .eq("semaine", semaine)
            .eq("salarie_id", finisseur.id)
            .in("chantier_id", chantierIds)
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
        // Récupérer tous les chantier_ids uniques des affectations de cette semaine
        const allChantierIds = [...new Set(
          finisseurs.flatMap(f => 
            (f.affectedDays || []).map(a => a.chantier_id).filter(Boolean)
          )
        )];
        
        if (allChantierIds.length > 0) {
          // 2a. Mettre à jour les fiches avec chantier (règle métier: toutes les fiches ont un chantier)
          const { error: updateError } = await supabase
            .from("fiches")
            .update({ statut: "ENVOYE_RH" })
            .eq("semaine", semaine)
            .in("salarie_id", finisseurIds)
            .in("chantier_id", allChantierIds);

          if (updateError) {
            console.error("Erreur mise à jour statut fiches:", updateError);
            throw updateError;
          }
        }

        // 2b. Fiches d'équipes sur chantiers SANS CHEF gérées par ce conducteur
        const { data: chantiersWithoutChef } = await supabase
          .from("chantiers")
          .select("id")
          .eq("conducteur_id", conducteurId)
          .is("chef_id", null);

        if (chantiersWithoutChef && chantiersWithoutChef.length > 0) {
          const chantierIdsSansChef = chantiersWithoutChef.map(c => c.id);
          
          const { error: updateCheflessError } = await supabase
            .from("fiches")
            .update({ statut: "ENVOYE_RH" })
            .eq("semaine", semaine)
            .in("salarie_id", finisseurIds)
            .in("chantier_id", chantierIdsSansChef);

          if (updateCheflessError) {
            console.error("Erreur mise à jour statut équipes sans chef:", updateCheflessError);
            throw updateCheflessError;
          }
        }

        // 3. Injecter automatiquement les congés validés pour ces fiches
        // Récupérer toutes les fiches transmises (fiches avec chantier des affectations)
        let fichesTransmises: { id: string; salarie_id: string; semaine: string }[] = [];
        
        if (allChantierIds.length > 0) {
          const { data: fichesAvecChantier } = await supabase
            .from("fiches")
            .select("id, salarie_id, semaine")
            .eq("semaine", semaine)
            .in("salarie_id", finisseurIds)
            .in("chantier_id", allChantierIds);

          if (fichesAvecChantier) {
            fichesTransmises = [...fichesTransmises, ...fichesAvecChantier];
          }
        }

        if (chantiersWithoutChef && chantiersWithoutChef.length > 0) {
          const chantierIdsSansChef = chantiersWithoutChef.map(c => c.id);
          const { data: fichesChantiersSansChef } = await supabase
            .from("fiches")
            .select("id, salarie_id, semaine")
            .eq("semaine", semaine)
            .in("salarie_id", finisseurIds)
            .in("chantier_id", chantierIdsSansChef);

          if (fichesChantiersSansChef) {
            // Dédupliquer les fiches (éviter doublons si une fiche est déjà dans fichesTransmises)
            const existingIds = new Set(fichesTransmises.map(f => f.id));
            fichesChantiersSansChef.forEach(f => {
              if (!existingIds.has(f.id)) {
                fichesTransmises.push(f);
              }
            });
          }
        }

        if (fichesTransmises.length > 0) {
          const { injectValidatedLeaves } = await import("@/hooks/useInjectValidatedLeaves");
          await injectValidatedLeaves(fichesTransmises);
        }
      }

      toast({
        title: "✅ Signatures enregistrées",
        description: "Transmission automatique au service RH effectuée.",
      });

      // 3. Préparer la redirection vers S+1
      // La copie S→S+1 est désormais gérée par la sync Planning (lundi 5h)
      // Le transport peut être copié manuellement via le bouton "Copier S-1"
      const nextWeek = getNextWeek(semaine);
      sessionStorage.setItem('conducteur_teamWeek', nextWeek);

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
  const calculateAffectedStats = (finisseur: FinisseurWithFiche, chantierId?: string) => {
    if (!finisseur.ficheJours || !finisseur.affectedDays || finisseur.affectedDays.length === 0) {
      return {
        heures: 0,
        paniers: 0,
        trajets: 0,
        intemperie: 0
      };
    }
    
    const relevantAffectedDays = chantierId
      ? finisseur.affectedDays.filter(a => a.chantier_id === chantierId)
      : finisseur.affectedDays;
    
    const affectedDaysSet = new Set(relevantAffectedDays.map(a => a.date));
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

  // Grouper les finisseurs par chantier
  const finisseursParChantier = (() => {
    const map = new Map<string, {
      chantierId: string;
      code: string;
      nom: string;
      finisseurs: FinisseurWithFiche[];
    }>();
    
    finisseurs.forEach(finisseur => {
      // Tous les chantiers uniques de ce finisseur
      const chantierIdsUniques = [...new Set(
        (finisseur.affectedDays || []).map(a => a.chantier_id).filter(Boolean)
      )];
      
      for (const chantierId of chantierIdsUniques) {
        if (!map.has(chantierId)) {
          const info = chantiersInfo.get(chantierId);
          map.set(chantierId, {
            chantierId,
            code: info?.code || "SANS_CODE",
            nom: info?.nom || "",
            finisseurs: []
          });
        }
        map.get(chantierId)!.finisseurs.push(finisseur);
      }
    });
    
    // Retourner comme array trié par code chantier
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  })();

  // Consolider les données de transport PAR CHANTIER
  const transportParChantier = (() => {
    // Map: chantierId → days[]
    const result = new Map<string, TransportDayV2[]>();
    
    // Grouper les jours par chantier puis par date
    allTransportJoursRaw.forEach((jour: any) => {
      // Trouver le chantier_id depuis la fiche transport
      // On utilise le codeChantier pour retrouver le chantierId
      const chantierId = Array.from(chantiersInfo.entries())
        .find(([_, info]) => info.code === jour.codeChantier)?.[0] || "";
      
      if (!chantierId) return;
      
      if (!result.has(chantierId)) {
        result.set(chantierId, []);
      }
      
      const days = result.get(chantierId)!;
      let dayEntry = days.find(d => d.date === jour.date);
      
      if (!dayEntry) {
        dayEntry = {
          date: jour.date,
          codeChantier: jour.codeChantier || "-",
          vehicules: []
        };
        days.push(dayEntry);
      }
      
      // Ignorer les entrées sans immatriculation
      if (!jour.immatriculation) return;
      
      // Fusionner ou ajouter le véhicule
      let vehicule = dayEntry.vehicules.find(v => v.immatriculation === jour.immatriculation);
      if (!vehicule) {
        vehicule = {
          id: crypto.randomUUID(),
          immatriculation: jour.immatriculation,
          conducteurMatinId: "",
          conducteurMatinNom: "",
          conducteurSoirId: "",
          conducteurSoirNom: ""
        };
        dayEntry.vehicules.push(vehicule);
      }
      
      // Fusionner les lignes MATIN et SOIR
      if (jour.periode === "MATIN" && jour.conducteur_aller) {
        vehicule.conducteurMatinNom = 
          `${jour.conducteur_aller.prenom} ${jour.conducteur_aller.nom}`;
      }
      if (jour.periode === "SOIR" && jour.conducteur_retour) {
        vehicule.conducteurSoirNom = 
          `${jour.conducteur_retour.prenom} ${jour.conducteur_retour.nom}`;
      }
    });
    
    // Trier les jours par date
    result.forEach((days, key) => {
      result.set(key, days.sort((a, b) => a.date.localeCompare(b.date)));
    });
    
    return result;
  })();

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
        {/* Récapitulatif des heures PAR CHANTIER */}
        {finisseursParChantier.length > 0 && finisseursParChantier.map((chantierGroup) => {
          const transportDays = transportParChantier.get(chantierGroup.chantierId) || [];
          const hasTransport = transportDays.length > 0;
          
          return (
            <div key={chantierGroup.chantierId} className="mb-6">
              {/* En-tête du chantier */}
              <div className="flex items-center gap-2 mb-3 bg-muted/50 rounded-lg px-4 py-2">
                <span className="text-lg">📦</span>
                <h3 className="font-semibold text-foreground">
                  {chantierGroup.code} - {chantierGroup.nom}
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({chantierGroup.finisseurs.length} finisseur{chantierGroup.finisseurs.length > 1 ? 's' : ''})
                </span>
              </div>
              
              {/* Récap heures pour ce chantier */}
              <Card className="mb-4 shadow-md border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Récapitulatif Heures
                  </CardTitle>
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
                        {chantierGroup.finisseurs.map((finisseur) => {
                          const transportData = transportFinisseursData[finisseur.id];
                          const stats = calculateAffectedStats(finisseur, chantierGroup.chantierId);
                          
                          // Dates d'affectation pour CE chantier uniquement
                          const chantierAffectedDays = (finisseur.affectedDays || [])
                            .filter(a => a.chantier_id === chantierGroup.chantierId);
                          const affectedDatesSet = new Set(chantierAffectedDays.map(a => a.date));
                          
                          const relevantTransportDays = transportData?.days?.filter((day: any) => 
                            affectedDatesSet.has(day.date)
                          ) || [];
                          
                          // Calculer les trajets personnels et d'entreprise UNIQUEMENT sur les jours de CE chantier
                          const countTrajetPerso = relevantTransportDays.filter((day: any) => day.trajet_perso === true).length;
                          const countTrajetsEntreprise = relevantTransportDays.filter((day: any) => !day.trajet_perso && day.immatriculation).length;
                          
                          // Calculer les absences (jours affectés à CE chantier avec HNORM=0 et pas trajet perso)
                          const countAbsences = finisseur.ficheJours?.filter(jour => {
                            return affectedDatesSet.has(jour.date) && jour.HNORM === 0 && !jour.trajet_perso;
                          }).length || 0;
                          
                          return (
                            <TableRow 
                              key={finisseur.id}
                              className="border-b border-border/30"
                            >
                              <TableCell className="py-2 px-3 font-medium">
                                {finisseur.prenom} {finisseur.nom}
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
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Récap transport pour ce chantier */}
              {hasTransport && (
                <Accordion type="single" collapsible defaultValue="transport-recap" className="mb-4">
                  <AccordionItem value="transport-recap" className="border rounded-lg shadow-md">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Récapitulatif Trajet</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <TransportSummaryV2 transportData={{ days: transportDays }} hideCodeColumn />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          );
        })}

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
