import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, Edit, Save, X, Loader2, History, Truck, PenTool, AlertTriangle, BarChart3 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/timesheet/StatusBadge";
import { SignatureDisplay } from "./SignatureDisplay";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { useFicheDetailWithJours, useUpdateFicheStatus } from "@/hooks/useFiches";
import { useSaveSignature } from "@/hooks/useSaveSignature";
import { useConducteurSignature } from "@/hooks/useConducteurSignature";
import { supabase } from "@/integrations/supabase/client";
import { useFicheDetailForEdit } from "@/hooks/useFicheDetailForEdit";
import { useSaveFicheJours } from "@/hooks/useSaveFicheJours";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAddEmployeeToFiche } from "@/hooks/useAddEmployeeToFiche";
import { useDeleteEmployeeFromFiche } from "@/hooks/useDeleteEmployeeFromFiche";
import { useDeleteConducteurSignatures } from "@/hooks/useDeleteConducteurSignatures";
import { TimeEntryTable } from "@/components/timesheet/TimeEntryTable";
import { EmployeeSummaryTable } from "./EmployeeSummaryTable";
import { useTransportByChantier } from "@/hooks/useTransportByChantier";
import { useTransportValidation } from "@/hooks/useTransportValidation";
import { TransportSummaryV2 } from "@/components/transport/TransportSummaryV2";
import { RatioGlobalSheet } from "@/components/ratio/RatioGlobalSheet";
import { useFeatureEnabled } from "@/hooks/useEnterpriseConfig";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { dayNameToDate } from "@/lib/date";

interface FicheDetailProps {
  ficheId: string;
  onBack: () => void;
  readOnly?: boolean;
}

export const FicheDetail = ({ ficheId, onBack, readOnly = false }: FicheDetailProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = !readOnly;
  const [conducteurId, setConducteurId] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  
  // Feature toggle pour Ratio Global (Limoge Revillon uniquement)
  const isRatioGlobalEnabled = useFeatureEnabled('ratioGlobal');
  
  const { data: ficheData, isLoading } = useFicheDetailWithJours(ficheId);
  const saveSignatureMutation = useSaveSignature();
  const deleteSignatures = useDeleteConducteurSignatures();
  
  const queryClient = useQueryClient();
  
  // Get current user (conducteur)
  useEffect(() => {
    const getConducteur = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setConducteurId(user.id);
      }
    };
    getConducteur();
  }, []);
  
  // ✅ Forcer le rafraîchissement des données au montage (après nettoyage SQL)
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["fiche-detail-edit"] });
    queryClient.invalidateQueries({ queryKey: ["fiche-with-jours"] });
  }, [ficheId, queryClient]);
  
  // Check if conducteur has signed
  const { data: conducteurSignature } = useConducteurSignature(ficheId, conducteurId);
  const hasConducteurSigned = !!conducteurSignature;
  
  // Hooks pour ajout/suppression d'employés
  const addEmployeeMutation = useAddEmployeeToFiche();
  const deleteEmployeeMutation = useDeleteEmployeeFromFiche();
  
  // Toujours extraire depuis ficheData une fois chargé (source de vérité)
  const chantierId = ficheData?.chantier?.id || "";
  const semaine = ficheData?.semaine || "";
  
  // Fetch detailed data for editing (uniquement si chantierId et semaine sont disponibles)
  const { data: detailData, isLoading: isLoadingDetail } = useFicheDetailForEdit(chantierId, semaine);
  
  // Fetch transport data
  const { data: transportData } = useTransportByChantier(chantierId, semaine);
  
  // Check if transport is complete (only for BROUILLON status)
  // For VALIDÉ_CHEF status, transport is already complete (no need to check)
  const ficheStatus = ficheData?.statut || "";
  const shouldCheckTransport = ficheStatus === "BROUILLON";
  const { isTransportComplete } = useTransportValidation(
    shouldCheckTransport ? ficheId : null,
    shouldCheckTransport ? conducteurId : null
  );
  // If we don't need to check transport, consider it as valid for signature
  // SDER: transport sheets are optional, never block signature
  const entrepriseSlug = localStorage.getItem("entreprise_slug");
  const isTransportValidForSignature = entrepriseSlug === "sder" ? true : (shouldCheckTransport ? isTransportComplete : true);
  
  // ⚠️ IMPORTANT: Récupérer les salarieIds AVANT tout early return
  // Utiliser un tableau vide si ficheData n'est pas encore chargé
  const allFiches = ficheData?.all_fiches || (ficheData ? [ficheData] : []);
  const salarieIds = useMemo(
    () => allFiches.map((f: any) => f.salarie?.id).filter(Boolean),
    [allFiches]
  );
  
  // Appeler useUserRoles avec un tableau stable (vide ou rempli)
  const { data: rolesMap } = useUserRoles(salarieIds);
  
  // Autres hooks
  const updateStatus = useUpdateFicheStatus();
  const saveFicheJours = useSaveFicheJours();
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ficheData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Fiche introuvable</p>
        <Button onClick={onBack} className="mt-4">Retour</Button>
      </div>
    );
  }

  const chantierNom = ficheData.chantier?.nom || "Chantier inconnu";
  const chefNom = ficheData.chef 
    ? `${ficheData.chef.prenom} ${ficheData.chef.nom}` 
    : "Non assigné";
  
  // Format week display
  let semaineDisplay = ficheData.semaine;
  try {
    const weekDate = new Date(ficheData.semaine);
    if (!isNaN(weekDate.getTime())) {
      semaineDisplay = `Semaine du ${format(weekDate, "dd/MM/yyyy", { locale: fr })}`;
    }
  } catch (e) {
    // Keep original
  }
  
  const macons = allFiches
    .map((f: any) => ({
      nom: f.salarie ? `${f.salarie.prenom} ${f.salarie.nom}` : "Inconnu",
      heures: Number(f.total_heures || 0),
      paniers: f.paniers || 0,
      trajets: f.trajets || 0,
      intemperie: f.intemperie || 0,
      isChef: f.salarie?.id === ficheData.chef?.id,
      salarieId: f.salarie?.id,
      role: (f.salarie?.id === ficheData.chef?.id)
        ? "chef"
        : (f.salarie?.agence_interim
            ? "interimaire"
            : ((rolesMap?.get(f.salarie?.id) as any) || "macon")),
    }))
    .sort((a, b) => {
      // 1. Chef de chantier toujours en premier
      if (a.isChef && !b.isChef) return -1;
      if (!a.isChef && b.isChef) return 1;
      
      // 2. Parmi les non-chefs : tous les autres rôles avant les intérimaires
      if (!a.isChef && !b.isChef) {
        const aIsInterim = a.role === "interimaire";
        const bIsInterim = b.role === "interimaire";
        if (!aIsInterim && bIsInterim) return -1;
        if (aIsInterim && !bIsInterim) return 1;
      }
      
      // 3. Si même catégorie, garder l'ordre existant
      return 0;
    });

  const totalHeures = allFiches.reduce((sum: number, f: any) => sum + Number(f.total_heures || 0), 0);

  // Heures séparées employés vs intérimaires (indicatif)
  const heuresEmployes = allFiches
    .filter((f: any) => !f.salarie?.agence_interim)
    .reduce((sum: number, f: any) => sum + Number(f.total_heures || 0), 0);
  
  const heuresInterimaires = allFiches
    .filter((f: any) => f.salarie?.agence_interim)
    .reduce((sum: number, f: any) => sum + Number(f.total_heures || 0), 0);

  // Collect signatures from all fiches
  const signatures = allFiches
    .map((f: any) => {
      const maconNom = f.salarie ? `${f.salarie.prenom} ${f.salarie.nom}` : "Inconnu";
      const signature = f.signatures?.find((s: any) => s.role !== 'conducteur');
      const isChef = f.salarie?.id === ficheData.chef?.id;
      return {
        maconNom: maconNom,
        signed: !!signature,
        signatureData: signature?.signature_data || undefined,
        signedAt: signature ? signature.signed_at : undefined,
        isChef,
        role: ((isChef)
          ? "chef"
          : (f.salarie?.agence_interim
              ? "interimaire"
              : ((rolesMap?.get(f.salarie?.id) as any) || "macon"))) as "chef" | "macon" | "interimaire" | "finisseur",
      };
    })
    .sort((a, b) => {
      // 1. Chef de chantier toujours en premier
      if (a.isChef && !b.isChef) return -1;
      if (!a.isChef && b.isChef) return 1;
      
      // 2. Parmi les non-chefs : tous les autres rôles avant les intérimaires
      if (!a.isChef && !b.isChef) {
        const aIsInterim = a.role === "interimaire";
        const bIsInterim = b.role === "interimaire";
        if (!aIsInterim && bIsInterim) return -1;
        if (aIsInterim && !bIsInterim) return 1;
      }
      
      // 3. Si même catégorie, garder l'ordre existant
      return 0;
    });

  const fiche = {
    id: ficheId,
    semaine: semaineDisplay,
    chantier: chantierNom,
    chef: chefNom,
    status: ficheData.statut,
    totalHeures: totalHeures,
    macons: macons,
    signatures: signatures,
    historique: [
      { 
        date: format(new Date(ficheData.created_at), "dd/MM/yyyy HH:mm", { locale: fr }), 
        action: "Fiche créée", 
        auteur: chefNom 
      },
    ],
  };

  const handleValidate = async () => {
    // Parse composite ficheId: "chantierId-semaine"
    const lastHyphenIndex = ficheId.lastIndexOf("-");
    const secondLastHyphenIndex = ficheId.lastIndexOf("-", lastHyphenIndex - 1);
    const isComposite = ficheId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{4}-(W|S)\d{2}$/i);
    
    if (isComposite) {
      const chantierId = ficheId.substring(0, secondLastHyphenIndex);
      const semaine = ficheId.substring(secondLastHyphenIndex + 1);
      
      await updateStatus.mutateAsync({
        chantierId: chantierId,
        semaine: semaine,
        status: "ENVOYE_RH",
      });
    } else {
      await updateStatus.mutateAsync({
        ficheId: ficheId,
        status: "ENVOYE_RH",
      });
    }
    
    setTimeout(onBack, 1000);
  };


  // Convert fiches to TimeEntry format
  // ✅ Ne génère que les jours ayant des fiches_jours (multi-chef: jours non affectés = pas de données)
  const convertFichesToTimeEntries = () => {
    if (!detailData) return [];
    
    return detailData.map((fiche: any) => {
      const days: any = {};
      
      // ✅ Récupérer uniquement les dates existantes dans fiches_jours
      const existingDates = fiche.fiches_jours?.map((fj: any) => fj.date) || [];
      
      ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].forEach(dayName => {
        const dateStr = dayNameToDate(ficheData.semaine, dayName as any);
        
        // ✅ Ignorer les jours sans fiches_jours (non affectés à ce chantier)
        if (!existingDates.includes(dateStr)) return;
        
        const jourData = fiche.fiches_jours?.find((fj: any) => fj.date === dateStr);
        
        // ✅ Si le jour a un code_chantier_du_jour, on ne pré-remplit PAS chantierId avec le chantier global
        const hasCodeChantier = !!jourData?.code_chantier_du_jour;
        
        // ✅ Calculs pour l'exclusivité Trajet / Trajet Perso / GD
        const hours = jourData?.heures || 0;
        const HI = jourData?.HI || 0;
        const PA = !!jourData?.PA;
        const isTrajetPerso = !!jourData?.trajet_perso || jourData?.code_trajet === "T_PERSO";
        const isGD = jourData?.code_trajet === "GD";
        
        days[dayName] = {
          hours,
          overtime: 0,
          absent: hours === 0 && HI === 0,
          panierRepas: PA,
          repasType: jourData?.repas_type || null,
          trajet: (isTrajetPerso || isGD) ? false : true,
          trajetPerso: isTrajetPerso,
          grandDeplacement: isGD,
          codeTrajet: jourData?.code_trajet || null,
          heuresIntemperie: HI,
          chantierCode: hasCodeChantier ? jourData.code_chantier_du_jour : "",
          chantierVille: hasCodeChantier ? (jourData.ville_du_jour || "") : "",
          chantierId: hasCodeChantier ? null : (fiche.chantier_id || ""),
          commentaire: jourData?.commentaire || null,
        };
      });
      
      return {
        employeeId: fiche.salarie_id,
        employeeName: fiche.salarie ? `${fiche.salarie.prenom} ${fiche.salarie.nom}` : "Inconnu",
        ficheId: fiche.id,
        days,
      };
    });
  };

  const handleStartEdit = () => {
    if (!detailData || detailData.length === 0) {
      toast({
        title: "Données non disponibles",
        description: "Les données détaillées sont en cours de chargement. Veuillez patienter.",
        variant: "destructive",
      });
      return;
    }
    
    if (readOnly || ["VALIDE_CONDUCTEUR", "ENVOYE_RH"].includes(fiche.status)) {
      toast({
        title: "Modification impossible",
        description: "Cette fiche ne peut plus être modifiée.",
        variant: "destructive",
      });
      return;
    }
    
    const entries = convertFichesToTimeEntries();
    setTimeEntries(entries);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setTimeEntries([]);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      console.log("💾 Sauvegarde des modifications détaillées...");
      
      await saveFicheJours.mutateAsync({
        entries: timeEntries,
        weekId: ficheData.semaine,
      });
      
      console.log("✅ Modifications enregistrées avec succès");
      setIsEditing(false);
      setTimeEntries([]);
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
    }
  };

  const handleAddEmployee = async (salarieId: string) => {
    if (readOnly || ["VALIDE_CONDUCTEUR", "ENVOYE_RH"].includes(fiche.status)) {
      toast({
        title: "Modification impossible",
        description: "Cette fiche ne peut plus être modifiée.",
        variant: "destructive",
      });
      return;
    }
    
    if (!chantierId || !semaine) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter un employé : données manquantes.",
        variant: "destructive",
      });
      return;
    }

    await addEmployeeMutation.mutateAsync({
      chantierId,
      semaine,
      salarieId,
    });
  };

  const handleDeleteEmployee = async (ficheId: string) => {
    if (readOnly || ["VALIDE_CONDUCTEUR", "ENVOYE_RH"].includes(fiche.status)) {
      toast({
        title: "Modification impossible",
        description: "Cette fiche ne peut plus être modifiée.",
        variant: "destructive",
      });
      return;
    }
    
    await deleteEmployeeMutation.mutateAsync({ ficheId });
  };

  // Calculate employee summary from detailData
  const calculateEmployeeSummary = () => {
    if (!detailData) return [];
    
    return detailData.map((fiche: any) => {
      const totalHours = fiche.fiches_jours?.reduce(
        (sum: number, fj: any) => sum + Number(fj.HNORM ?? fj.heures ?? 0),
        0
      ) || 0;
      
      const totalIntemperie = fiche.fiches_jours?.reduce(
        (sum: number, fj: any) => sum + Number(fj.HI || 0),
        0
      ) || 0;
      
      const totalPaniers = fiche.fiches_jours?.filter((fj: any) => fj.PA === true).length || 0;
      
      // Trajets personnels (trajet_perso = true)
      const totalTrajetsPerso = fiche.fiches_jours?.filter((fj: any) => fj.trajet_perso === true).length || 0;
      
      // Trajets normaux = jours où on a des heures travaillées (heures > 0) ET trajet_perso = false
      const totalTrajets = fiche.fiches_jours?.filter((fj: any) => {
        const heures = Number(fj.HNORM || fj.heures || 0);
        return heures > 0 && fj.trajet_perso !== true;
      }).length || 0;
      
      // Absences = jours où HNORM = 0 ET HI = 0 ET trajet_perso = false
      const totalAbsences = fiche.fiches_jours?.filter((fj: any) => {
        const heures = Number(fj.HNORM || fj.heures || 0);
        const intemperie = Number(fj.HI || 0);
        return heures === 0 && intemperie === 0 && fj.trajet_perso !== true;
      }).length || 0;
      
      // Récupérer les codes chantiers journaliers
      let codes = (fiche.fiches_jours
        ?.map((fj: any) => fj.code_chantier_du_jour)
        .filter(Boolean) || []) as string[];
      
      // Détecter si des jours travaillés ont un code NULL (données legacy)
      const hasWorkedDaysWithNullCode = fiche.fiches_jours?.some((fj: any) => {
        const heures = Number(fj.HNORM || fj.heures || 0);
        return heures > 0 && fj.trajet_perso !== true && !fj.code_chantier_du_jour;
      });
      
      // Si oui, ajouter le chantier global de la fiche
      if (hasWorkedDaysWithNullCode && ficheData?.chantier?.code_chantier) {
        codes.push(ficheData.chantier.code_chantier);
      }
      
      // Si aucun code du tout, utiliser le chantier global comme fallback
      if (codes.length === 0 && ficheData?.chantier?.code_chantier) {
        codes = [ficheData.chantier.code_chantier];
      }
      
      const uniqueChantiers = Array.from(new Set(codes)) as string[];
      
      return {
        employeeId: fiche.salarie_id,
        employeeName: fiche.salarie ? `${fiche.salarie.prenom} ${fiche.salarie.nom}` : "Inconnu",
        isChef: fiche.salarie?.id === ficheData.chef?.id,
        // Priorité : chef > intérimaire > role_metier (grutier, finisseur, macon) > user_roles (admin, conducteur, rh) > macon par défaut
        role: (fiche.salarie?.id === ficheData.chef?.id)
          ? "chef"
          : (fiche.salarie?.agence_interim
              ? "interimaire"
              : ((fiche.salarie?.role_metier as any) || (rolesMap?.get(fiche.salarie_id) as any) || "macon")),
        totalHours,
        totalIntemperie,
        totalPaniers,
        totalTrajets,
        totalTrajetsPerso,
        totalAbsences,
        chantiers: uniqueChantiers,
      };
    }).sort((a: any, b: any) => {
      // 1. Chef d'équipe toujours en premier
      if (a.isChef && !b.isChef) return -1;
      if (!a.isChef && b.isChef) return 1;
      
      // 2. Parmi les non-chefs : tous les autres rôles (finisseur, macon, etc.) avant les intérimaires
      if (!a.isChef && !b.isChef) {
        const aIsInterim = a.role === "interimaire";
        const bIsInterim = b.role === "interimaire";
        if (!aIsInterim && bIsInterim) return -1;
        if (aIsInterim && !bIsInterim) return 1;
      }
      
      // 3. Si même catégorie, garder l'ordre existant
      return 0;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 shadow-md border-border/50">
        <div className="flex items-start justify-between mb-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
          <StatusBadge status={fiche.status} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">{fiche.chantier}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Semaine</span>
              <p className="font-medium text-foreground">{fiche.semaine}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Chef d'équipe</span>
              <p className="font-medium text-foreground">{fiche.chef}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Effectif</span>
              <p className="font-medium text-foreground">{fiche.macons.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">H. Employés</span>
              <p className="font-medium text-foreground">{heuresEmployes}h</p>
            </div>
            <div>
              <span className="text-muted-foreground">H. Intérimaires</span>
              <p className="font-medium text-foreground">{heuresInterimaires}h</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total heures</span>
              <p className="font-medium text-foreground">{fiche.totalHeures}h</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Avertissement si fiche non modifiable */}
      {(readOnly || ["VALIDE_CONDUCTEUR", "ENVOYE_RH"].includes(fiche.status)) && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">Consultation uniquement</p>
              <p className="text-sm">
                {fiche.status === "VALIDE_CONDUCTEUR" 
                  ? "Cette fiche a été transmise au conducteur et ne peut plus être modifiée."
                  : fiche.status === "ENVOYE_RH"
                  ? "Cette fiche a été envoyée aux RH et ne peut plus être modifiée."
                  : "Cette fiche est en lecture seule."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Transport Summary (accordéon) */}
      {transportData?.days && transportData.days.length > 0 && (
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

      {/* Ratio Global (Limoge Revillon uniquement - lecture seule pour conducteur) */}
      {isRatioGlobalEnabled && ficheData?.id && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ratio-global" className="border-none">
            <Card className="shadow-md border-border/50">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Ratio Global
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <RatioGlobalSheet
                  selectedWeek={ficheData.semaine}
                  chantierId={chantierId}
                  ficheId={ficheData.id}
                  isReadOnly={true}
                />
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      )}
      {/* Detailed Time Entry */}
      <Card className="p-6 shadow-md border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Détail des heures</h3>
          {canEdit && !isEditing && !["VALIDE_CONDUCTEUR", "ENVOYE_RH"].includes(fiche.status) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleStartEdit}
              disabled={isLoadingDetail || !detailData || detailData.length === 0}
            >
              {isLoadingDetail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Modifier les données
            </Button>
          )}
          {canEdit && isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saveFicheJours.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          )}
        </div>
        {isEditing && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ Les modifications seront appliquées jour par jour. Vérifiez bien les données avant d'enregistrer.
            </p>
          </div>
        )}
        
        {!isEditing ? (
          readOnly ? (
            <TimeEntryTable
              chantierId={chantierId}
              weekId={ficheData.semaine}
              chefId={ficheData?.chef?.id}
              mode="edit"
              initialData={convertFichesToTimeEntries()}
              readOnly
            />
          ) : (
            <EmployeeSummaryTable employees={calculateEmployeeSummary()} />
          )
        ) : (
          <TimeEntryTable
            chantierId={chantierId}
            weekId={ficheData.semaine}
            chefId={ficheData?.chef?.id}
            mode="edit"
            initialData={timeEntries}
            onEntriesChange={setTimeEntries}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}
      </Card>

      {/* Signatures */}
      <SignatureDisplay signatures={fiche.signatures} />

      {/* Signature du conducteur */}
      {canEdit && !readOnly && (
        <Card className="p-6 shadow-md border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <PenTool className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-foreground">Signature du conducteur</h3>
            <Badge variant="outline" className="ml-auto bg-orange-500/10 text-orange-600 border-orange-500/20">
              Conducteur
            </Badge>
          </div>

          {!hasConducteurSigned ? (
            <div className="space-y-4">
              {!showSignaturePad ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Signature obligatoire
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        En signant cette fiche, elle sera automatiquement validée et envoyée au service RH.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={!isTransportValidForSignature}
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    Enregistrer et collecter les signatures
                  </Button>
                  {!isTransportValidForSignature && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      ⚠️ Complétez d'abord la fiche de trajet (au moins 1 véhicule complet par jour)
                    </p>
                  )}
                </div>
              ) : (
                <SignaturePad
                  employeeName="Conducteur"
                  onSave={async (signatureData) => {
                    if (!conducteurId) return;
                    
                    try {
                      console.log("🖊️ Début de la signature pour", allFiches.length, "fiches");
                      
                      // Si c'est une fiche composite, signer TOUTES les fiches individuelles
                      if (allFiches.length > 1) {
                        // Créer une signature pour chaque fiche individuelle
                        for (const fiche of allFiches) {
                          console.log("✍️ Signature de la fiche:", fiche.id);
                          await saveSignatureMutation.mutateAsync({
                            ficheId: fiche.id,
                            userId: conducteurId,
                            role: "conducteur",
                            signatureData,
                          });
                        }
                        console.log("✅ Toutes les signatures créées avec succès");
                      } else {
                        // Si c'est une fiche simple, utiliser l'UUID réel depuis allFiches
                        const realFicheId = allFiches[0]?.id;
                        if (!realFicheId) {
                          throw new Error("Impossible de récupérer l'ID réel de la fiche");
                        }
                        await saveSignatureMutation.mutateAsync({
                          ficheId: realFicheId,
                          userId: conducteurId,
                          role: "conducteur",
                          signatureData,
                        });
                      }
                      
                      setShowSignaturePad(false);
                      
                      // Déclencher automatiquement la validation de TOUTES les fiches
                      console.log("🚀 Déclenchement de la validation automatique...");
                      console.log("📋 Paramètres:", { chantierId, semaine, nbFiches: allFiches.length });
                      
                      await handleValidate();
                      
                      console.log("✅ Validation réussie");
                      
                    } catch (error: any) {
                      console.error("❌ Erreur complète:", error);
                      console.error("❌ Message d'erreur:", error?.message);
                      console.error("❌ Stack trace:", error?.stack);
                      
                      toast({
                        title: "Erreur lors de la signature/validation",
                        description: error?.message || "Une erreur est survenue",
                        variant: "destructive",
                      });
                    }
                  }}
                  onCancel={() => setShowSignaturePad(false)}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Signature enregistrée</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Signé le {conducteurSignature ? format(new Date(conducteurSignature.signed_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : ""}
                  </p>
                </div>
              </div>
              {conducteurSignature?.signature_data && (
                <div className="border-2 border-dashed border-border rounded-lg p-4 bg-muted/30">
                  <img 
                    src={conducteurSignature.signature_data} 
                    alt="Signature du conducteur" 
                    className="max-h-32 mx-auto"
                  />
                </div>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full mt-2">
                    Réinitialiser la signature
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Supprimer la signature du conducteur pour ce lot (chantier + semaine) ? Cette action est réversible en re-signant.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (!conducteurId) return;
                        console.log("🧹 Action utilisateur: réinitialisation signature");
                        await deleteSignatures.mutateAsync({ ficheId, conducteurId });
                        console.log("✅ Réinitialisation terminée");
                      }}
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </Card>
      )}

      {/* History */}
      <Card className="p-6 shadow-md border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historique des modifications
        </h3>
        <div className="space-y-3">
          {fiche.historique.map((event, idx) => (
            <div key={idx} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{event.action}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Par {event.auteur} • {event.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
