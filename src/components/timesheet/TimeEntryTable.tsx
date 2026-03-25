import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Crown, ChevronDown, Users, UserPlus, Lock } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { useAutoSaveFiche } from "@/hooks/useAutoSaveFiche";
import { useFinisseursByConducteur } from "@/hooks/useFinisseursByConducteur";
import { useFicheId } from "@/hooks/useFicheId";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { TeamMemberCombobox } from "@/components/chef/TeamMemberCombobox";
import { CodeTrajet } from "@/types/transport";
import { ChantierSelector } from "./ChantierSelector";
import { useAffectationsJoursByChefAndChantier, getDayNamesFromDates } from "@/hooks/useAffectationsJoursChef";


import { format, addDays } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Editable numeric input that preserves user typing (supports comma) and commits on blur
const EditableNumber = ({
  value,
  onCommit,
  disabled,
  min = 0,
  max = 24,
  step = 0.5,
  className,
}: {
  value: number;
  onCommit: (val: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) => {
  const [text, setText] = useState(String(value ?? 0));

  // Keep local state in sync when external value changes
  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  const handleBlur = () => {
    const normalized = text.replace(",", ".").trim();
    let num = Number(normalized);
    if (Number.isNaN(num)) num = value ?? 0;
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setText(String(num));
    onCommit(num);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`h-9 text-center ${className ?? ""}`}
    />
  );
};

interface TimeEntryTableProps {
  chantierId: string | null;
  weekId: string;
  chefId?: string;
  onEntriesChange?: (entries: TimeEntry[]) => void;
  onTransportDataChange?: (data: Record<string, { ficheId?: string; days: Array<{ date: string; conducteurMatinId: string; conducteurSoirId: string; immatriculation: string }> }>) => void;
  initialData?: TimeEntry[];
  mode?: "create" | "edit" | "conducteur";
  affectationsJours?: Array<{
    finisseur_id: string;
    date: string;
    chantier_id: string;
    conducteur_id?: string;
  }>;
  allAffectations?: Array<{
    finisseur_id: string;
    date: string;
    chantier_id: string;
    conducteur_id: string;
  }>;
  onAddEmployee?: (salarieId: string) => Promise<void>;
  onDeleteEmployee?: (ficheId: string) => Promise<void>;
  readOnly?: boolean;
}

// Type pour les données d'un jour
type RepasType = "PANIER" | "RESTO" | null;

type DayData = {
  hours: number;
  overtime: number;
  absent: boolean;
  panierRepas: boolean;
  repasType?: RepasType; // Nouveau: type de repas (PANIER ou RESTO)
  trajet: boolean;
  trajetPerso: boolean;
  grandDeplacement: boolean;
  codeTrajet?: CodeTrajet | null;
  heuresIntemperie: number;
  chantierId?: string | null;
  chantierCode?: string | null;
  chantierVille?: string | null;
  chantierNom?: string | null;
  commentaire?: string;
  
};

interface TimeEntry {
  employeeId: string;
  employeeName: string;
  ficheId?: string; // Ajout du ficheId pour permettre la suppression
  days: {
    [key: string]: DayData;
  };
}

export const TimeEntryTable = ({ chantierId, weekId, chefId, onEntriesChange, onTransportDataChange, initialData, mode = "create", affectationsJours, allAffectations, onAddEmployee, onDeleteEmployee, readOnly = false }: TimeEntryTableProps) => {
  const isReadOnly = readOnly;
  const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const isConducteurMode = mode === "conducteur";
  
  // 🔧 Valeurs par défaut pour normaliser les données legacy
  const defaultHoursByDay: Record<string, number> = { 
    Lundi: 8, 
    Mardi: 8, 
    Mercredi: 8, 
    Jeudi: 8, 
    Vendredi: 7 
  };

  // Helper : retourne les jours à afficher pour un finisseur donné
  const getVisibleDaysForFinisseur = (finisseurId: string): string[] => {
    if (!affectationsJours || !isConducteurMode) {
      // Mode chef : afficher tous les jours
      return weekDays;
    }
    
    // Mode conducteur : filtrer par affectations
    const affectedDates = affectationsJours
      .filter(a => a.finisseur_id === finisseurId)
      .map(a => a.date);
    
    if (affectedDates.length === 0) return [];
    
    // Convertir les dates ISO en noms de jours ("Lundi", "Mardi", etc.)
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const visibleDays: string[] = [];
    
    affectedDates.forEach(dateStr => {
      const date = new Date(dateStr + "T00:00:00");
      const dayIndex = date.getDay();
      const dayName = dayNames[dayIndex];
      
      if (weekDays.includes(dayName)) {
        visibleDays.push(dayName);
      }
    });
    
    return visibleDays;
  };

  // Helper : vérifie si un jour spécifique est affecté par un AUTRE conducteur
  const isDayAffectedByOtherConducteur = (finisseurId: string, dateISO: string): boolean => {
    if (!allAffectations || !isConducteurMode || !chefId) return false;
    
    const affectation = allAffectations.find(
      a => a.finisseur_id === finisseurId && a.date === dateISO
    );
    
    // Si pas d'affectation trouvée OU si c'est NOTRE conducteur : pas bloqué
    if (!affectation || affectation.conducteur_id === chefId) return false;
    
    // Sinon : c'est un autre conducteur
    return true;
  };

  // Charger les chantiers pour les sélecteurs (filtré par entreprise)
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  const { data: chantiers = [] } = useQuery({
    queryKey: ["chantiers", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];
      
      const { data, error } = await supabase
        .from("chantiers")
        .select("id, nom, code_chantier, ville, actif, is_ecole")
        .eq("actif", true)
        .eq("entreprise_id", entrepriseId)
        .order("nom");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!entrepriseId,
  });

  const isCurrentChantierEcole = chantiers?.find(c => c.id === chantierId)?.is_ecole === true;

  // Récupérer les vrais maçons affectés au chantier (+ le chef si applicable)
  // En mode conducteur, on ne charge QUE les finisseurs affectés (pas le conducteur)
  const { data: macons = [], isLoading } = useMaconsByChantier(
    chantierId, 
    weekId, 
    isConducteurMode ? undefined : chefId
  );

  // Charger les finisseurs si on est en mode conducteur
  const { data: finisseursData = [], isLoading: finisseursLoading } = useFinisseursByConducteur(
    isConducteurMode ? chefId : null,
    isConducteurMode ? weekId : ""
  );

  // Charger les affectations jours chef pour le mode chef (pas conducteur, pas edit)
  // ✅ FILTRE PAR CHANTIER pour gérer les employés partagés entre plusieurs chantiers
  // Mode planning complet : toujours charger depuis affectations_jours_chef
  const { data: affectationsJoursChef = [] } = useAffectationsJoursByChefAndChantier(
    !isConducteurMode && mode !== "edit" ? chefId || null : null,
    !isConducteurMode && mode !== "edit" ? chantierId : null,
    weekId
  );

  // ✅ Chef multi-chantier : query légère pour les valeurs par défaut uniquement
  const { data: chefChantierPrincipalData } = useQuery({
    queryKey: ["chef-chantier-principal-defaults", chefId],
    queryFn: async () => {
      if (!chefId) return null;
      const { data } = await supabase
        .from("utilisateurs")
        .select("chantier_principal_id")
        .eq("id", chefId)
        .single();
      return data;
    },
    enabled: !!chefId,
  });

  const isChefOnSecondaryChantier = useMemo(() => {
    if (!chefId || !chantierId || !chefChantierPrincipalData?.chantier_principal_id) return false;
    return chefChantierPrincipalData.chantier_principal_id !== chantierId;
  }, [chefId, chantierId, chefChantierPrincipalData]);

  // Helper pour vérifier si un employé est autorisé à travailler un jour donné
  const isDayAuthorizedForEmployee = useCallback((employeeId: string, dayName: string): boolean => {
    // Le chef lui-même est TOUJOURS autorisé sur tous les jours
    // Il n'est pas stocké dans affectations_jours_chef car il est propriétaire de la fiche
    if (chefId && employeeId === chefId) return true;
    
    // En mode conducteur, on utilise les props affectationsJours
    if (isConducteurMode) return true; // Géré par getVisibleDaysForFinisseur
    
    // En mode edit, on autorise tout
    if (mode === "edit") return true;
    
    // ✅ FIX: En planning actif, si pas d'affectations pour cet employé sur ce chantier = jour NON autorisé
    // Cela évite les "39h fantômes" quand le chef sélectionné ne correspond pas aux affectations
    if (!affectationsJoursChef || affectationsJoursChef.length === 0) return false;
    
    // Vérifier si l'employé a une affectation pour ce jour
    const monday = parseISOWeek(weekId);
    const dayIndexMap: Record<string, number> = {
      "Lundi": 0,
      "Mardi": 1,
      "Mercredi": 2,
      "Jeudi": 3,
      "Vendredi": 4,
    };
    
    const dayIndex = dayIndexMap[dayName];
    if (dayIndex === undefined) return true;
    
    const targetDate = format(addDays(monday, dayIndex), "yyyy-MM-dd");
    
    return affectationsJoursChef.some(
      aff => aff.macon_id === employeeId && 
             aff.jour === targetDate &&
             aff.chantier_id === chantierId
    );
  }, [chefId, isConducteurMode, mode, affectationsJoursChef, weekId]);

  // Charger tous les maçons, grutiers, intérimaires et finisseurs pour le combobox d'ajout (mode edit seulement)
  const { data: allMacons = [] } = useUtilisateursByRole(mode === "edit" ? "macon" : undefined);
  const { data: allGrutiers = [] } = useUtilisateursByRole(mode === "edit" ? "grutier" : undefined);
  const { data: allInterimaires = [] } = useUtilisateursByRole(mode === "edit" ? "interimaire" : undefined);
  const { data: allFinisseurs = [] } = useUtilisateursByRole(mode === "edit" ? "finisseur" : undefined);
  
  // État pour le combobox d'ajout et suppression
  const [newEmployeeId, setNewEmployeeId] = useState<string>("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string; ficheId: string } | null>(null);

  // Initialiser les entrées de temps à partir des vrais maçons
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  
  // Hook pour l'auto-save
  const autoSaveMutation = useAutoSaveFiche();
  

  const [hasUserEdits, setHasUserEdits] = useState(false);
  const hasSyncedAffectations = useRef(false);

  // Normalisation de initialData : résoudre chantierId depuis chantierCode (mode edit uniquement)
  useEffect(() => {
    if (!initialData || initialData.length === 0 || chantiers.length === 0) return;
    if (mode !== "edit") return; // Seulement en mode edit
    
    setEntries(prev => {
      // Ne normaliser que si on vient de charger initialData (pas de modifications utilisateur)
      if (hasUserEdits) return prev;
      
      return prev.map(entry => {
        const normalizedDays = { ...entry.days };
        
        Object.keys(normalizedDays).forEach(dayName => {
          const day = normalizedDays[dayName as keyof typeof normalizedDays];
          
          // ✅ Si on a un chantierCode, résoudre SYSTÉMATIQUEMENT le chantierId (même s'il est déjà rempli)
          // Cela fait prévaloir le code_chantier_du_jour de fiches_jours sur le chantier global
          if (day.chantierCode) {
            const chantier = chantiers.find(c => c.code_chantier === day.chantierCode);
            if (chantier && day.chantierId !== chantier.id) {
              console.debug(`🔧 [Normalisation] ${dayName}: chantierId ${day.chantierId} → ${chantier.id} (code: ${day.chantierCode})`);
              normalizedDays[dayName as keyof typeof normalizedDays] = {
                ...day,
                chantierId: chantier.id,
                chantierVille: day.chantierVille || chantier.ville,
                chantierNom: chantier.nom,
              };
            }
          }
        });
        
        return { ...entry, days: normalizedDays };
      });
    });
  }, [initialData, chantiers, mode, hasUserEdits]);

  // Mettre à jour les entrées quand les maçons sont chargés OU quand initialData est fourni
  useEffect(() => {
    let cancelled = false;
    
    // 1️⃣ Mode édition : charger initialData UNIQUEMENT si pas de modifications utilisateur
    if (initialData && initialData.length > 0 && !hasUserEdits) {
      setEntries(initialData);
      setHasLoadedData(true);
      return;
    }

    // 2️⃣ Mode conducteur : charger UNIQUEMENT les finisseurs (pas le conducteur)
    if (isConducteurMode && chefId && weekId && !hasLoadedData && !finisseursLoading && finisseursData.length > 0 && chantiers.length > 0) {
      const finisseurEntries = finisseursData.map((finisseur) => {
        const daysDefault = {
          Lundi: { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: "A_COMPLETER" as CodeTrajet },
          Mardi: { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: "A_COMPLETER" as CodeTrajet },
          Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: "A_COMPLETER" as CodeTrajet },
          Jeudi: { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: "A_COMPLETER" as CodeTrajet },
          Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: "A_COMPLETER" as CodeTrajet },
        };

        // Appliquer les données existantes si disponibles
        const daysFromDb = { ...daysDefault };
        if (finisseur.ficheJours) {
          // En mode conducteur, ne garder que les ficheJours dont la date
          // correspond à une affectation dans affectationsJours (déjà filtré par chantier)
          const visibleDates = new Set(
            (affectationsJours || [])
              .filter(a => a.finisseur_id === finisseur.id)
              .map(a => a.date)
          );
          const filteredJours = isConducteurMode && visibleDates.size > 0
            ? finisseur.ficheJours.filter(j => visibleDates.has(j.date))
            : finisseur.ficheJours;

          filteredJours.forEach(j => {
            const d = new Date(j.date);
            const dayOfWeek = d.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) return;
            
            const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
            const dayLabel = dayNames[dayOfWeek] as keyof typeof daysFromDb;
            if (daysFromDb[dayLabel]) {
              // 🔧 Normaliser les heures : cap à la valeur par défaut du jour
              const rawHours = Number(j.HNORM || 0);
               const hours = Math.max(0, Math.min(rawHours, 24));
              const HI = Number(j.HI || 0);
              const PA = !!j.PA;
              
              // 🔧 Exclusivité Trajet / Trajet Perso / GD : calculer d'abord les options exclusives
              const isTrajetPerso = !!j.trajet_perso || j.code_trajet === "T_PERSO";
              const isGD = j.code_trajet === "GD";
              // Trajet = true par défaut SAUF si Trajet Perso ou GD est actif
              const dbTrajet = Number(j.T || 0) > 0;
              const trajet = (isTrajetPerso || isGD) ? false : dbTrajet;
              
              // Trouver le chantier par code si présent
              const chantierDuJour = j.code_chantier_du_jour 
                ? chantiers.find(c => c.code_chantier === j.code_chantier_du_jour)
                : null;
              
              daysFromDb[dayLabel] = {
                ...daysFromDb[dayLabel],
                hours,
                overtime: 0,
                panierRepas: PA,
                repasType: ((j as any).repas_type as RepasType) || (PA ? "PANIER" : null),
                trajet,
                trajetPerso: !!j.trajet_perso || j.code_trajet === "T_PERSO",
                grandDeplacement: (j as any).code_trajet === "GD",
                heuresIntemperie: HI,
                absent: !isCurrentChantierEcole && hours === 0 && HI === 0,
                // ✅ Mapper le chantier du jour depuis ficheJours (priorité sur affectations)
                chantierCode: j.code_chantier_du_jour || null,
                chantierVille: j.ville_du_jour || null,
                chantierId: chantierDuJour?.id || null,
                chantierNom: chantierDuJour?.nom || null,
                commentaire: (j as any).commentaire || "",
                codeTrajet: ((j as any).code_trajet || null) as CodeTrajet | null,
              };
            }
          });
        }
        
        // Enrichir avec les affectations de chantiers
        if (affectationsJours && affectationsJours.length > 0) {
          const affectationsForFinisseur = affectationsJours.filter(a => a.finisseur_id === finisseur.id);
          
          for (const affectation of affectationsForFinisseur) {
            const dateAffectation = new Date(affectation.date + "T00:00:00");
            const dayOfWeek = dateAffectation.getDay();
            const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
            const dayLabel = dayNames[dayOfWeek] as keyof typeof daysFromDb;
            
            if (daysFromDb[dayLabel]) {
              const currentDay = daysFromDb[dayLabel];
              
              // ✅ Enrichir le chantierId depuis les affectations s'il est manquant (nécessaire pour l'auto-save)
              if (!currentDay.chantierId) {
                const chantierInfo = chantiers.find(c => c.id === affectation.chantier_id);
                
                daysFromDb[dayLabel] = {
                  ...currentDay,
                  chantierId: affectation.chantier_id,
                  chantierCode: chantierInfo?.code_chantier || null,
                  chantierVille: chantierInfo?.ville || null,
                  chantierNom: chantierInfo?.nom || null,
                };
              }
            }
          }
        }

        return {
          employeeId: finisseur.id,
          employeeName: `${finisseur.prenom} ${finisseur.nom}`,
          days: daysFromDb,
        };
      });

      setEntries(finisseurEntries);
      setHasLoadedData(true);
      return;
    }

    // 3️⃣ Mode création (Chef) : charger avec macons
    if (macons.length > 0 && mode === "create" && !hasLoadedData) {
      // Mode création : initialiser avec données par défaut OU depuis la BDD si elles existent
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      
      const newEntries: TimeEntry[] = macons.map((macon) => {
        // Récupérer le chantier sélectionné
        const selectedChantier = chantierId 
          ? chantiers.find(c => c.id === chantierId) 
          : null;
        
        // Valeurs par défaut - UNIQUEMENT Lundi à Vendredi
        // ✅ Chef multi-chantier : 0h par défaut sur chantier secondaire (sans panier ni trajet)
        const isChefSelf = !!chefId && macon.id === chefId;
        const useZeroDefaults = isChefSelf && isChefOnSecondaryChantier;
        
        const defaultHours = (day: string) => useZeroDefaults ? 0 : (day === "Vendredi" ? 7 : 8);
        const defaultPanier = !useZeroDefaults;
        const defaultRepas = useZeroDefaults ? null : ("PANIER" as RepasType);
        const defaultTrajet = !useZeroDefaults;
        const defaultCodeTrajet = useZeroDefaults ? null : ("A_COMPLETER" as CodeTrajet | null);
        
        const daysDefault = {
          Lundi: { hours: defaultHours("Lundi"), overtime: 0, absent: false, panierRepas: defaultPanier, repasType: defaultRepas, trajet: defaultTrajet, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: defaultCodeTrajet },
          Mardi: { hours: defaultHours("Mardi"), overtime: 0, absent: false, panierRepas: defaultPanier, repasType: defaultRepas, trajet: defaultTrajet, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: defaultCodeTrajet },
          Mercredi: { hours: defaultHours("Mercredi"), overtime: 0, absent: false, panierRepas: defaultPanier, repasType: defaultRepas, trajet: defaultTrajet, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: defaultCodeTrajet },
          Jeudi: { hours: defaultHours("Jeudi"), overtime: 0, absent: false, panierRepas: defaultPanier, repasType: defaultRepas, trajet: defaultTrajet, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: defaultCodeTrajet },
          Vendredi: { hours: defaultHours("Vendredi"), overtime: 0, absent: false, panierRepas: defaultPanier, repasType: defaultRepas, trajet: defaultTrajet, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: defaultCodeTrajet },
        };

        // S'il y a des jours sauvegardés en BDD, on les applique
        const daysFromDb = { ...daysDefault };
        if (macon.ficheJours && macon.ficheJours.length > 0) {
          macon.ficheJours.forEach((j) => {
            const d = new Date(j.date);
            const dayOfWeek = d.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi
            
            // ⚠️ Ignorer Samedi (6) et Dimanche (0)
            if (dayOfWeek === 0 || dayOfWeek === 6) return;
            
            const dayLabel = dayNames[dayOfWeek] as keyof typeof daysFromDb;
            if (daysFromDb[dayLabel]) {
              // 🔧 Normaliser les heures : cap à la valeur par défaut du jour
              const rawHours = Number((j as any).HNORM ?? j.heures ?? 0);
              const hours = Math.max(0, Math.min(rawHours, 24));
              const HI = Number(j.HI || 0);
              const PA = !!j.PA;
              
              // 🔧 Exclusivité Trajet / Trajet Perso / GD : calculer d'abord les options exclusives
              const isTrajetPerso = !!j.trajet_perso || j.code_trajet === "T_PERSO";
              const isGD = j.code_trajet === "GD";
              // Trajet = true par défaut SAUF si Trajet Perso ou GD est actif
              // Lire la valeur T depuis la BDD au lieu de forcer true/false
              const dbTrajet = Number(j.T || 0) > 0;
              const trajet = (isTrajetPerso || isGD) ? false : dbTrajet;
              
              // Trouver le chantier par code si disponible
              const chantierDuJour = j.code_chantier_du_jour 
                ? chantiers.find(c => c.code_chantier === j.code_chantier_du_jour)
                : null;
              
              daysFromDb[dayLabel] = {
                hours,
                overtime: 0,
                panierRepas: PA,
                repasType: ((j as any).repas_type as RepasType) || (PA ? "PANIER" : null),
                trajet,
                trajetPerso: !!j.trajet_perso || j.code_trajet === "T_PERSO",
                grandDeplacement: (j as any).code_trajet === "GD",
                heuresIntemperie: HI,
                // ✅ Chef multi-chantier : ne pas auto-marquer absent (il peut être sur un autre chantier)
                // Le chef coche "Absent" manuellement si c'est une vraie absence
                absent: isChefSelf && (useZeroDefaults || !!chefChantierPrincipalData?.chantier_principal_id) 
                  ? false 
                  : (!isCurrentChantierEcole && hours === 0 && !PA && HI === 0),
                chantierId: chantierDuJour?.id || chantierId,
                chantierCode: j.code_chantier_du_jour || null,
                chantierVille: j.ville_du_jour || null,
                chantierNom: chantierDuJour?.nom || null,
                commentaire: (j as any).commentaire || "",
                codeTrajet: ((j as any).code_trajet || null) as CodeTrajet | null,
              };
            }
          });
        }


        return {
          employeeId: macon.id,
          employeeName: `${macon.prenom} ${macon.nom}`,
          days: daysFromDb,
        };
      });
      
      setEntries(newEntries);
      setHasLoadedData(true);
    }
  }, [isConducteurMode, chefId, chantierId, weekId, initialData, macons, finisseursData, mode, hasLoadedData, chantiers]);

  // Détecter et ajouter dynamiquement les nouveaux finisseurs (sans perdre les saisies existantes)
  useEffect(() => {
    if (!isConducteurMode || !chefId || !weekId || finisseursData.length === 0 || !hasLoadedData) return;

    setEntries((prev) => {
      const existingIds = new Set(prev.map(e => e.employeeId));
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

      const defaults = {
        Lundi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true,  trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Mardi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true,  trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true,  trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Jeudi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true,  trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true,  trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
      };

      const toAdd = finisseursData
        .filter(f => !existingIds.has(f.id))
        .map(f => {
          // Cloner les defaults
          const daysFromDb: any = JSON.parse(JSON.stringify(defaults));

          // Appliquer les jours existants s'ils ont une fiche
          if (f.ficheJours && f.ficheJours.length > 0) {
            f.ficheJours.forEach(j => {
              const d = new Date(j.date);
              const idx = d.getDay(); // 0=Dimanche, 1=Lundi...6=Samedi
              const label = dayNames[idx];
              if (label === "Lundi" || label === "Mardi" || label === "Mercredi" || label === "Jeudi" || label === "Vendredi") {
                // 🔧 Normaliser les heures : cap à la valeur par défaut du jour
                const rawHours = Number(j.HNORM || 0);
                const hours = Math.max(0, Math.min(rawHours, 24));
                const HI = Number(j.HI || 0);
                const PA = !!j.PA;
                
                // 🔧 Exclusivité Trajet / Trajet Perso / GD : calculer d'abord les options exclusives
                const isTrajetPerso = !!j.trajet_perso || j.code_trajet === "T_PERSO";
                const isGD = j.code_trajet === "GD";
                // Trajet = true par défaut SAUF si Trajet Perso ou GD est actif
                const trajet = (isTrajetPerso || isGD) ? false : true;
                
                daysFromDb[label] = {
                  hours,
                  overtime: 0,
                  panierRepas: PA,
                  repasType: ((j as any).repas_type as RepasType) || (PA ? "PANIER" : null),
                  trajet,
                  trajetPerso: !!j.trajet_perso || j.code_trajet === "T_PERSO",
                  grandDeplacement: (j as any).code_trajet === "GD",
                  heuresIntemperie: HI,
                  absent: hours === 0 && !PA && HI === 0,
                  commentaire: (j as any).commentaire || "",
                  codeTrajet: ((j as any).code_trajet || null) as CodeTrajet | null,
                };
              }
            });
          }

          return {
            employeeId: f.id,
            employeeName: `${f.prenom} ${f.nom}`,
            days: daysFromDb,
          };
        });

      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
  }, [isConducteurMode, chefId, weekId, finisseursData, hasLoadedData]);

  // 🔄 Synchroniser les affectations de chantiers vers la saisie (ne pas écraser les saisies utilisateur)
  useEffect(() => {
    if (!isConducteurMode) return;
    if (!affectationsJours?.length || !chantiers.length) return;
    
    // ✅ Éviter la re-sync si déjà synchronisé OU si l'utilisateur a modifié
    if (hasSyncedAffectations.current || hasUserEdits) return;

    console.log("🔄 Synchronisation affectations → saisie (unique)", {
      affectations: affectationsJours.length,
      chantiers: chantiers.length,
      hasUserEdits
    });

    setEntries(prev => {
      if (prev.length === 0) return prev; // Attendre que les entries soient chargées
      
      let hasChanges = false;
      const updated = prev.map(entry => {
        const affs = affectationsJours.filter(a => a.finisseur_id === entry.employeeId);
        if (!affs.length) return entry;

        const updatedDays = { ...entry.days };
        const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
        
        for (const aff of affs) {
          const date = new Date(aff.date + "T00:00:00");
          const dayLabel = dayNames[date.getDay()];
          const dayData = updatedDays[dayLabel];
          
          if (!dayData) continue;

          // Vérifier si le chantier est déjà correct
          if (dayData.chantierId === aff.chantier_id) continue;

          const chantierInfo = chantiers.find(c => c.id === aff.chantier_id);
          
          // Mettre à jour seulement si pas de chantierId ou si différent
          if (!dayData.chantierId) {
            hasChanges = true;
            updatedDays[dayLabel] = {
              ...dayData,
              chantierId: aff.chantier_id,
              chantierCode: chantierInfo?.code_chantier ?? null,
              chantierVille: chantierInfo?.ville ?? null,
              chantierNom: chantierInfo?.nom ?? null,
            };
          }
        }
        
        return hasChanges ? { ...entry, days: updatedDays } : entry;
      });

      // ✅ Marquer comme synchronisé pour éviter les re-runs
      hasSyncedAffectations.current = true;
      
      return hasChanges ? updated : prev;
    });
  }, [isConducteurMode, affectationsJours, chantiers, hasUserEdits]);

  // ❌ SUPPRIMÉ : L'effet "Re-trigger" ne servait à rien (log seulement) et ajoutait du bruit

  useEffect(() => {
    if (isConducteurMode || !hasLoadedData || readOnly) return;

    setEntries((prev) => {
      const existingIds = new Set(prev.map(e => e.employeeId));
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

      const defaults = {
        Lundi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Mardi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Jeudi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
        Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, repasType: "PANIER" as RepasType, trajet: true, trajetPerso: false, grandDeplacement: false, heuresIntemperie: 0, codeTrajet: "A_COMPLETER" as CodeTrajet },
      } as const;

      const toAdd = macons
        .filter(m => !existingIds.has(m.id))
        .map(m => {
          const daysFromDb: any = JSON.parse(JSON.stringify(defaults));

          if (m.ficheJours && m.ficheJours.length > 0) {
            m.ficheJours.forEach(j => {
              const d = new Date(j.date);
              const idx = d.getDay();
              const label = dayNames[idx];
              if (label === "Lundi" || label === "Mardi" || label === "Mercredi" || label === "Jeudi" || label === "Vendredi") {
                const hours = Number((j as any).HNORM ?? j.heures ?? 0);
                const HI = Number(j.HI || 0);
                const T = Number(j.T || 0);
                const PA = !!j.PA;

                daysFromDb[label] = {
                  hours,
                  overtime: 0,
                  panierRepas: PA,
                  repasType: ((j as any).repas_type as RepasType) || (PA ? "PANIER" : null),
                  trajet: T > 0,
                  trajetPerso: !!j.trajet_perso,
                  grandDeplacement: (j as any).code_trajet === "GD",
                  heuresIntemperie: HI,
                  absent: hours === 0 && !PA && T === 0 && HI === 0,
                  commentaire: (j as any).commentaire || "",
                  codeTrajet: (T > 0 ? ((j as any).code_trajet || "A_COMPLETER") : ((j as any).code_trajet || null)) as CodeTrajet,
                };
              }
            });
          }

          return {
            employeeId: m.id,
            employeeName: `${m.prenom} ${m.nom}`,
            days: daysFromDb,
          };
        });

      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
  }, [isConducteurMode, macons, hasLoadedData, readOnly]);

  // Retirer automatiquement les maçons/intérimaires désaffectés (mode chef)
  useEffect(() => {
    if (isConducteurMode || !hasLoadedData || readOnly) return;
    const allowed = new Set(macons.map(m => m.id));
    setEntries(prev => prev.filter(e => allowed.has(e.employeeId)));
  }, [isConducteurMode, hasLoadedData, macons, readOnly]);

  // Supprimer les finisseurs qui n'ont plus de jours visibles (après désaffectation)
  // ✅ FIX: Ne pas filtrer si affectationsJours est undefined ou vide (phase de chargement)
  useEffect(() => {
    if (!isConducteurMode || !hasLoadedData) return;
    // ⚠️ GARDE: Ne pas filtrer si les affectations ne sont pas encore chargées
    // Un tableau vide [] temporaire pendant le remontage/refetch ne doit PAS supprimer tout le monde
    if (!affectationsJours || affectationsJours.length === 0) return;
    
    setEntries(prev =>
      prev.filter(e => getVisibleDaysForFinisseur(e.employeeId).length > 0)
    );
  }, [isConducteurMode, hasLoadedData, affectationsJours, finisseursData]);


  // Réinitialiser hasLoadedData si la semaine OU le chantier change RÉELLEMENT
  // ✅ FIX: Ne pas reset au simple remontage du composant (retour d'onglet)
  const prevWeekId = useRef<string | null>(null);
  const prevChantierId = useRef<string | null>(null);
  
  useEffect(() => {
    // Premier montage : stocker les valeurs sans reset
    if (prevWeekId.current === null && prevChantierId.current === null) {
      prevWeekId.current = weekId;
      prevChantierId.current = chantierId;
      return;
    }
    
    // Reset UNIQUEMENT si la semaine ou le chantier a VRAIMENT changé
    const weekChanged = weekId !== prevWeekId.current;
    const chantierChanged = chantierId !== prevChantierId.current;
    
    if (weekChanged || chantierChanged) {
      setHasLoadedData(false);
      setHasUserEdits(false);
      setEntries([]); // Vider les données pour éviter flash de données obsolètes
      hasSyncedAffectations.current = false; // Reset le flag de sync
      
      // Mettre à jour les refs
      prevWeekId.current = weekId;
      prevChantierId.current = chantierId;
    }
  }, [weekId, chantierId]);

  // Propager l'état au parent pour sauvegarde
  useEffect(() => {
    // En mode edit, ne pas propager un tableau vide pendant le chargement initial
    // pour éviter d'écraser les données passées en initialData
    if (mode === "edit" && !hasLoadedData && entries.length === 0) {
      return;
    }
    onEntriesChange?.(entries);
  }, [entries, onEntriesChange, mode, hasLoadedData]);

  // Flag pour suivre les modifications en attente
  const isDirty = useRef<boolean>(false);

  // Auto-save avec debounce de 1 seconde (réduit pour plus de réactivité)
  // ⚠️ DÉSACTIVÉ en mode conducteur (sauvegarde manuelle via bouton "Enregistrer")
  useEffect(() => {
    if (isConducteurMode) return;
    if (readOnly || !hasLoadedData || entries.length === 0 || !chefId) return;
    
    const timer = setTimeout(() => {
      console.log("[TimeEntryTable] Auto-saving (debounce)...");
      autoSaveMutation.mutate(
        { 
          timeEntries: entries, 
          weekId, 
          chantierId, 
          chefId,
          mode: "chef"
        },
        {
          onSuccess: () => {
            isDirty.current = false;
          }
        }
      );
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [entries, hasLoadedData, weekId, chantierId, chefId, readOnly, isConducteurMode]);

  // Sauvegarder immédiatement quand la page est masquée (fermeture tablette)
  // ⚠️ DÉSACTIVÉ en mode conducteur (sauvegarde manuelle)
  useEffect(() => {
    if (isConducteurMode) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden && isDirty.current && hasLoadedData && entries.length > 0 && chefId && !readOnly) {
        console.log("[TimeEntryTable] Page hidden, forcing immediate save");
        autoSaveMutation.mutate({ 
          timeEntries: entries, 
          weekId, 
          chantierId, 
          chefId,
          mode: "chef"
        });
        isDirty.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [entries, hasLoadedData, weekId, chantierId, chefId, readOnly, autoSaveMutation, isConducteurMode]);
  

  const calculateTotalHours = (entry: TimeEntry) => {
    const visibleDays = getVisibleDaysForFinisseur(entry.employeeId);
    
    // Filtrer les jours à comptabiliser
    let daysToCount: string[];
    
    if (isConducteurMode) {
      // Mode conducteur : utiliser les jours visibles des finisseurs
      daysToCount = weekDays.filter(d => visibleDays.includes(d));
    } else {
      // Mode chef : filtrer selon les jours affectés à ce chef
      // isDayAuthorizedForEmployee gère déjà: chef toujours autorisé, mode edit, rétrocompatibilité
      daysToCount = weekDays.filter(d => isDayAuthorizedForEmployee(entry.employeeId, d));
    }
    
    return daysToCount.reduce((total, day) => {
      const dayData = entry.days[day];
      if (!dayData || dayData.absent) return total;
      return total + (dayData.hours ?? 0);
    }, 0);
  };

  const updateDayValue = (
    employeeId: string,
    day: string,
    field: keyof TimeEntry["days"][string],
    value: any
  ) => {
    setHasUserEdits(true);
    isDirty.current = true; // Marquer comme modifié
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.employeeId !== employeeId) return entry;
        
        let updatedDayData = {
          ...entry.days[day],
          [field]: value,
        };

        // Logique spéciale pour le champ "absent"
        if (field === "absent") {
          if (value) {
            updatedDayData = {
              ...updatedDayData,
              hours: 0,
              panierRepas: false,
              codeTrajet: null,
            };
          } else {
            // Si présent, restaurer les heures par défaut et re-cocher panier
            const defaultHours = defaultHoursByDay[day] || 8;
            updatedDayData.hours = defaultHours;
            updatedDayData.panierRepas = true;
            // codeTrajet reste null, l'utilisateur devra choisir
          }
        }
        
        // Propagation automatique des codes trajet depuis le lundi
        if (field === "codeTrajet" && day === "Lundi" && value) {
          const daysToPropagate = ["Mardi", "Mercredi", "Jeudi", "Vendredi"];
          const updatedDays = { ...entry.days, [day]: updatedDayData };
          
          // Propager aux jours non-absents (écrase les valeurs existantes)
          daysToPropagate.forEach(nextDay => {
            const nextDayData = updatedDays[nextDay];
            if (!nextDayData?.absent) {
              updatedDays[nextDay] = {
                ...nextDayData,
                codeTrajet: value,
              };
            }
          });
          
          return {
            ...entry,
            days: updatedDays,
          };
        }
        
        return {
          ...entry,
          days: {
            ...entry.days,
            [day]: updatedDayData,
          },
        };
      })
    );
  };


  // Ne pas appliquer automatiquement 39h au chargement
  // L'utilisateur le fera manuellement avec le bouton si besoin


  // Handlers pour ajout/suppression
  const handleAddClick = async () => {
    if (!newEmployeeId || newEmployeeId === "all") return;
    if (!onAddEmployee) return;
    
    await onAddEmployee(newEmployeeId);
    setNewEmployeeId(""); // Reset le combobox
  };

  const handleDeleteClick = (entry: TimeEntry, ficheId?: string) => {
    setEmployeeToDelete({
      id: entry.employeeId,
      name: entry.employeeName,
      ficheId: ficheId || "",
    });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete || !onDeleteEmployee) return;
    
    await onDeleteEmployee(employeeToDelete.ficheId);
    setDeleteConfirmOpen(false);
    setEmployeeToDelete(null);
  };

  // Afficher un loader pendant le chargement des maçons
  if (isLoading) {
    return (
      <Card className="p-12 shadow-md border-border/50">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p className="text-lg font-medium">Chargement des maçons...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section d'ajout d'employé (mode edit uniquement) */}
      {mode === "edit" && onAddEmployee && (
        <Card className="p-4 shadow-md border-border/50 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <TeamMemberCombobox
                value={newEmployeeId}
                onChange={setNewEmployeeId}
                allMacons={allMacons}
                allGrutiers={allGrutiers}
                allInterimaires={allInterimaires}
                allFinisseurs={allFinisseurs}
                isLoading={false}
                excludeIds={entries.map(entry => entry.employeeId)}
              />
            </div>
            <Button
              onClick={handleAddClick}
              disabled={!newEmployeeId || newEmployeeId === "all"}
              className="whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </Card>
      )}
      {/* Time Entry Cards with Accordion */}
      {/* Trier les entrées : Chef de chantier > Maçons > Intérimaires */}
      {(() => {
        const baseEntries = !isConducteurMode
          ? entries
          : entries.filter(e => getVisibleDaysForFinisseur(e.employeeId).length > 0);
        const sortedEntries = [...baseEntries].sort((a, b) => {
          const maconA = macons.find(m => m.id === a.employeeId);
          const maconB = macons.find(m => m.id === b.employeeId);
          
          // Déterminer la priorité de tri
          const getPriority = (macon: typeof maconA) => {
            if (!macon) return 5; // Inconnu en dernier
            if (macon.isChef) return 0; // Chef en premier
            if (macon.role === "macon") return 1; // Maçons en 2ème
            if (macon.role === "grutier") return 2; // Grutiers en 3ème
            if (macon.role === "finisseur") return 3; // Finisseurs en 4ème
            if (macon.role === "interimaire") return 4; // Intérimaires en dernier
            return 1; // Par défaut avec les maçons
          };
          
          return getPriority(maconA) - getPriority(maconB);
        });

        return (
          <Accordion type="multiple" className="space-y-4">
            {sortedEntries.map((entry) => {
          const macon = macons.find(m => m.id === entry.employeeId);
          const isChef = macon?.isChef;
          const isInterimaire = macon?.role === "interimaire";
          const isGrutier = macon?.role === "grutier";
          const isFinisseur = macon?.role === "finisseur";
          const isMacon = macon && !isChef && !isInterimaire && !isGrutier && !isFinisseur;
          
          // Récupérer les jours visibles pour ce finisseur
          const visibleDays = getVisibleDaysForFinisseur(entry.employeeId);
          
          return (
            <AccordionItem 
              key={entry.employeeId} 
              value={entry.employeeId}
              className="border rounded-lg shadow-md overflow-hidden bg-card"
            >
              <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>div>svg]:rotate-180 [&>svg]:hidden">
                <div className="flex items-center justify-between w-full bg-primary/5 border-b border-border/50 p-4 hover:bg-primary/10 transition-colors">
                  {/* Partie gauche : Emoji + Nom + Badges */}
                  <div className="flex items-center gap-3">
                    {/* Bouton de suppression (mode edit, sauf pour le chef) */}
                    {mode === "edit" && onDeleteEmployee && !isChef && entry.ficheId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(entry, entry.ficheId!);
                        }}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Emoji selon le rôle */}
                    {isInterimaire && <span className="text-xl">🔄</span>}
                    {isGrutier && <span className="text-xl">🏗️</span>}
                    {isFinisseur && <span className="text-xl">🔨</span>}
                    {isMacon && <span className="text-xl">👷‍♂️</span>}
                    
                    {/* Nom */}
                    <h3 className="font-semibold text-foreground">{entry.employeeName}</h3>
                    
                    {/* Badges de rôle */}
                    {isChef && (
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Chef de chantier
                      </Badge>
                    )}
                    {isInterimaire && (
                      <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                        Intérimaire
                      </Badge>
                    )}
                    {isGrutier && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        Grutier
                      </Badge>
                    )}
                    {isFinisseur && (
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                        Finisseur
                      </Badge>
                    )}
                    {isMacon && (
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                        Maçon
                      </Badge>
                    )}
                    
                  </div>
                  
                  {/* Partie droite : Total + Flèche */}
                  <div className="flex items-center gap-4 pr-2">
                    <div className="text-sm text-muted-foreground">
                      Total: <span className="font-bold text-lg text-foreground">{calculateTotalHours(entry)}h</span>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="p-0">
                

                
                {/* Days Grid */}
                <div className="p-4 space-y-3">
      {(() => {
                    const visibleDays = getVisibleDaysForFinisseur(entry.employeeId);
                    
                    if (visibleDays.length === 0 && isConducteurMode) {
                      return (
                        <div className="col-span-12 p-4 text-center text-muted-foreground bg-muted/30 rounded-md">
                          Aucun jour affecté pour ce finisseur cette semaine.
                        </div>
                      );
                    }
                    
                    // ✅ En mode edit, filtrer pour n'afficher que les jours avec données
                    const daysWithData = weekDays.filter(day => {
                      if (isConducteurMode) return visibleDays.includes(day);
                      if (mode === "edit") {
                        // En mode edit, n'afficher que les jours ayant des données définies
                        return entry.days[day] !== undefined;
                      }
                      return true; // Mode create : tous les jours
                    });
                    
                    // Message si aucun jour avec données en mode edit
                    if (daysWithData.length === 0 && mode === "edit") {
                      return (
                        <div className="col-span-12 p-4 text-center text-muted-foreground bg-muted/30 rounded-md">
                          Aucun jour affecté pour cet employé cette semaine sur ce chantier.
                        </div>
                      );
                    }
                    
                    return daysWithData.map((day) => {
                        const dayData = entry.days[day];
                        
                        // Calculer la date ISO du jour
                        const monday = parseISOWeek(weekId);
                        const dayIndex = weekDays.indexOf(day);
                        const dateISO = format(addDays(monday, dayIndex), "yyyy-MM-dd");
                        
                        // Vérifier si ce jour est affecté par un autre conducteur
                        const isBlockedByConducteur = isDayAffectedByOtherConducteur(entry.employeeId, dateISO);
                        
                        // Vérifier si ce jour est autorisé pour ce chef (mode chef uniquement)
                        const isBlockedByChefAffectation = !isConducteurMode && mode !== "edit" && !isDayAuthorizedForEmployee(entry.employeeId, day);
                        
                        // ✅ Chef multi-chantier : plus de blocage sur les chantiers secondaires
                        
                        const isDayBlocked = isBlockedByConducteur || isBlockedByChefAffectation;
                        
                        return (
                      <div
                        key={day}
                        className={`rounded-lg border p-3 ${
                          dayData.absent ? "bg-destructive/5 border-destructive/20" : 
                          isDayBlocked ? "bg-amber-50/50 border-amber-200" :
                          "bg-muted/30 border-border/30"
                        }`}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{day}</span>
                            {isDayBlocked && (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                                {isBlockedByConducteur ? "🔒 Autre conducteur" : "🔒 Jour non affecté"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={dayData.absent}
                              disabled={isReadOnly || isDayBlocked}
                              id={`absent-${entry.employeeId}-${day}`}
                              onCheckedChange={(checked) =>
                                updateDayValue(entry.employeeId, day, "absent", !!checked)
                              }
                            />
                            <label
                              htmlFor={`absent-${entry.employeeId}-${day}`}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              Absent
                            </label>
                          </div>
                        </div>

                        {/* Inputs Grid */}
                        {!dayData.absent && (
                          <div className="space-y-3">
                            {/* Sélecteur de chantier */}
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Chantier</label>
                              <ChantierSelector
                                value={
                                  dayData.chantierCode
                                    ? (chantiers.find(c => c.code_chantier === dayData.chantierCode)?.id
                                        ?? dayData.chantierId
                                        ?? chantierId
                                        ?? undefined)
                                    : (dayData.chantierId ?? chantierId ?? undefined)
                                }
                                onChange={async (newChantierId) => {
                                  if (isReadOnly) return;
                                  
                                  try {
                                    const { data: chantier } = await supabase
                                      .from("chantiers")
                                      .select("id, nom, code_chantier, ville")
                                      .eq("id", newChantierId)
                                      .maybeSingle();
                                    
                                    const days = weekDays;
                                    const currentDayIndex = Math.max(0, days.indexOf(day));
                                    
                                    setEntries((prev) =>
                                      prev.map((e) => {
                                        if (e.employeeId !== entry.employeeId) return e;
                                        
                                        const updatedDays = { ...e.days };
                                        days.slice(currentDayIndex).forEach((targetDay) => {
                                          updatedDays[targetDay] = {
                                            ...updatedDays[targetDay],
                                            chantierId: newChantierId,
                                            chantierCode: chantier?.code_chantier || null,
                                            chantierVille: chantier?.ville || null,
                                            chantierNom: chantier?.nom || null,
                                          };
                                        });
                                        
                                        return { ...e, days: updatedDays };
                                      })
                                    );
                                    
                                    setHasUserEdits(true);
                                  } catch (e) {
                                    console.error("Chantier selection update failed:", e);
                                  }
                                }}
                                chefId={undefined}
                                allowAll={true}
                                compact={true}
                                disabled={isReadOnly || isDayBlocked || mode !== "conducteur"}
              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                            {/* Heures */}
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Heures</label>
                              <div className="flex items-center gap-1">
                                <EditableNumber
                                  value={dayData.hours}
                                  onCommit={(v) =>
                                    updateDayValue(entry.employeeId, day, "hours", v)
                                  }
                                  disabled={isReadOnly || isDayBlocked}
                                  min={0}
                                  max={24}
                                  step={0.5}
                                  className="h-9 text-center"
                                />
                                <span className="text-xs text-muted-foreground">h</span>
                              </div>
                            </div>

                            {/* Heures Intempérie */}
                            <div className={mode === "create" ? "opacity-50" : ""}>
                              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                                Intempérie{mode === "create" && <Lock className="h-3 w-3" />}
                              </label>
                              <div className="flex items-center gap-1">
                                <EditableNumber
                                  value={dayData.heuresIntemperie}
                                  onCommit={(v) =>
                                    updateDayValue(entry.employeeId, day, "heuresIntemperie", v)
                                  }
                                  disabled={isReadOnly || isDayBlocked || mode === "create"}
                                  min={0}
                                  max={24}
                                  step={0.5}
                                  className={`h-9 text-center ${mode === "create" ? "cursor-not-allowed bg-muted" : ""}`}
                                />
                                <span className="text-xs text-muted-foreground">h</span>
                              </div>
                            </div>

                            {/* Repas: Panier ou Restaurant */}
                            <div className="flex flex-col gap-1 p-2 rounded bg-background/50">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={dayData.repasType === "PANIER" || (dayData.panierRepas && dayData.repasType !== "RESTO")}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      updateDayValue(entry.employeeId, day, "repasType", "PANIER");
                                      updateDayValue(entry.employeeId, day, "panierRepas", true);
                                    } else {
                                      updateDayValue(entry.employeeId, day, "repasType", null);
                                      updateDayValue(entry.employeeId, day, "panierRepas", false);
                                    }
                                  }}
                                  disabled={isReadOnly || isDayBlocked}
                                  id={`panier-${entry.employeeId}-${day}`}
                                />
                                <label
                                  htmlFor={`panier-${entry.employeeId}-${day}`}
                                  className="text-xs text-muted-foreground cursor-pointer"
                                >
                                  Panier
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={dayData.repasType === "RESTO"}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      updateDayValue(entry.employeeId, day, "repasType", "RESTO");
                                      updateDayValue(entry.employeeId, day, "panierRepas", false); // RESTO => PA=false
                                    } else {
                                      updateDayValue(entry.employeeId, day, "repasType", null);
                                      updateDayValue(entry.employeeId, day, "panierRepas", false);
                                    }
                                  }}
                                  disabled={isReadOnly || isDayBlocked}
                                  id={`resto-${entry.employeeId}-${day}`}
                                />
                                <label
                                  htmlFor={`resto-${entry.employeeId}-${day}`}
                                  className="text-xs text-muted-foreground cursor-pointer"
                                >
                                  Restaurant
                                </label>
                              </div>
                            </div>

                            {/* Trajet - 2 checkboxes simples */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={dayData.trajet === true}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      updateDayValue(entry.employeeId, day, "trajet", true);
                                      updateDayValue(entry.employeeId, day, "codeTrajet", "A_COMPLETER");
                                      updateDayValue(entry.employeeId, day, "trajetPerso", false);
                                      updateDayValue(entry.employeeId, day, "grandDeplacement", false);
                                    } else {
                                      updateDayValue(entry.employeeId, day, "trajet", false);
                                      updateDayValue(entry.employeeId, day, "codeTrajet", null);
                                    }
                                  }}
                                  disabled={isReadOnly || isDayBlocked}
                                />
                                <label className="text-xs text-muted-foreground cursor-pointer">Trajet</label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={dayData.trajetPerso}
                                  onCheckedChange={(checked) => {
                                    updateDayValue(entry.employeeId, day, "trajetPerso", checked);
                                    if (checked) {
                                      updateDayValue(entry.employeeId, day, "trajet", false);
                                      updateDayValue(entry.employeeId, day, "grandDeplacement", false);
                                      updateDayValue(entry.employeeId, day, "codeTrajet", "T_PERSO");
                                    }
                                  }}
                                  disabled={isReadOnly || isDayBlocked}
                                />
                                <label className="text-xs text-muted-foreground cursor-pointer">Trajet Perso</label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={dayData.grandDeplacement}
                                  onCheckedChange={(checked) => {
                                    updateDayValue(entry.employeeId, day, "grandDeplacement", checked);
                                    if (checked) {
                                      updateDayValue(entry.employeeId, day, "trajetPerso", false);
                                      updateDayValue(entry.employeeId, day, "trajet", false);
                                      updateDayValue(entry.employeeId, day, "codeTrajet", "GD");
                                    } else {
                                      // Si on décoche GD et que trajet est coché, revenir à A_COMPLETER
                                      if (dayData.trajet) {
                                        updateDayValue(entry.employeeId, day, "codeTrajet", "A_COMPLETER");
                                      }
                                    }
                                  }}
                                  disabled={isReadOnly || isDayBlocked}
                                />
                                <label className="text-xs text-muted-foreground cursor-pointer">GD</label>
                              </div>
                            </div>

                            {/* Commentaire */}
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <label className="text-xs text-muted-foreground block mb-1">
                                Commentaire (optionnel)
                              </label>
                              <textarea
                                value={dayData.commentaire || ""}
                                onChange={(e) =>
                                  updateDayValue(entry.employeeId, day, "commentaire", e.target.value)
                                }
                                disabled={isReadOnly || isDayBlocked}
                                placeholder="Ex: Arrivé en retard, formation, visite client..."
                                className="w-full h-20 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                            </div>
                          </div>
                        )}
                      </div>
                        );
                      });
                  })()}
                </div>
                
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      );
    })()}

      {/* Empty State */}
      {entries.length === 0 && (
        <Card className="p-12 shadow-md border-border/50">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {isConducteurMode 
                ? "Aucun finisseur affecté cette semaine" 
                : "Aucun maçon trouvé"}
            </p>
            <p className="text-sm mt-2">
              {isConducteurMode
                ? "Utilisez la section 'Planifier la semaine' pour affecter vos finisseurs"
                : "Aucun membre d'équipe n'est assigné à ce chantier"}
            </p>
          </div>
        </Card>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer <strong>{employeeToDelete?.name}</strong> de cette fiche ?
              <br />
              <span className="text-destructive font-medium">
                Toutes les données de cet employé pour cette semaine seront définitivement supprimées.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
