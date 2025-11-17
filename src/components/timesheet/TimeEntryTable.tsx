import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Crown, ChevronDown, Users, Car, Truck, UserPlus } from "lucide-react";
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
import { useTransportDataFinisseur } from "@/hooks/useTransportDataFinisseur";
import { useAutoSaveTransportFinisseur } from "@/hooks/useAutoSaveTransportFinisseur";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { TeamMemberCombobox } from "@/components/chef/TeamMemberCombobox";
import { TransportFinisseurAccordion } from "@/components/transport/TransportFinisseurAccordion";
import { TransportFinisseurDay, CodeTrajet } from "@/types/transport";
import { ChantierSelector } from "./ChantierSelector";
import { CodeTrajetSelector } from "./CodeTrajetSelector";
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
type DayData = {
  hours: number;
  overtime: number;
  absent: boolean;
  panierRepas: boolean;
  trajet: boolean;
  trajetPerso: boolean;
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

export const TimeEntryTable = ({ chantierId, weekId, chefId, onEntriesChange, initialData, mode = "create", affectationsJours, allAffectations, onAddEmployee, onDeleteEmployee, readOnly = false }: TimeEntryTableProps) => {
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

  // Charger les chantiers pour les sélecteurs
  const { data: chantiers = [] } = useQuery({
    queryKey: ["chantiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chantiers")
        .select("id, nom, code_chantier, ville, actif")
        .eq("actif", true)
        .order("nom");
      
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });

  // Récupérer les vrais maçons affectés au chantier (+ le chef si applicable)
  // En mode conducteur, on ne charge QUE les finisseurs affectés (pas le conducteur)
  const { data: macons = [], isLoading } = useMaconsByChantier(
    chantierId, 
    weekId, 
    isConducteurMode ? undefined : chefId
  );

  // Charger les finisseurs si on est en mode conducteur
  const { data: finisseursData = [] } = useFinisseursByConducteur(
    isConducteurMode ? chefId : null,
    isConducteurMode ? weekId : ""
  );

  // Charger tous les maçons, grutiers et intérimaires pour le combobox d'ajout (mode edit seulement)
  const { data: allMacons = [] } = useUtilisateursByRole(mode === "edit" ? "macon" : undefined);
  const { data: allGrutiers = [] } = useUtilisateursByRole(mode === "edit" ? "grutier" : undefined);
  const { data: allInterimaires = [] } = useUtilisateursByRole(mode === "edit" ? "interimaire" : undefined);
  
  // État pour le combobox d'ajout et suppression
  const [newEmployeeId, setNewEmployeeId] = useState<string>("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string; ficheId: string } | null>(null);

  // Initialiser les entrées de temps à partir des vrais maçons
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  
  // Hook pour l'auto-save
  const autoSaveMutation = useAutoSaveFiche();
  
  // État pour les fiches trajet des finisseurs (mode conducteur uniquement)
  const [transportFinisseurData, setTransportFinisseurData] = useState<
    Record<string, { ficheId: string; days: TransportFinisseurDay[] }>
  >({});
  
  // Calculer l'usage local des véhicules à partir de transportFinisseurData
  // Structure: Map<date, Map<immatriculation, finisseurId>>
  const localVehiculeUsage = useMemo(() => {
    const usage = new Map<string, Map<string, string>>();
    
    Object.entries(transportFinisseurData).forEach(([finisseurId, transport]) => {
      if (transport?.days) {
        transport.days.forEach(day => {
          if (day.immatriculation) {
            if (!usage.has(day.date)) {
              usage.set(day.date, new Map());
            }
            usage.get(day.date)!.set(day.immatriculation, finisseurId);
          }
        });
      }
    });
    
    return usage;
  }, [transportFinisseurData]);
  
  // Hook pour l'auto-save des fiches trajet finisseurs
  const autoSaveTransportFinisseur = useAutoSaveTransportFinisseur();

  // Charger les données transport de tous les finisseurs depuis la DB
  useEffect(() => {
    if (!isConducteurMode || finisseursData.length === 0) return;
    
    const loadTransportData = async () => {
      const transportData: Record<string, { ficheId: string; days: TransportFinisseurDay[] }> = {};
      
      for (const finisseur of finisseursData) {
        // 1. Recherche directe de la fiche transport par finisseur + semaine
        const { data: transport } = await supabase
          .from("fiches_transport_finisseurs")
          .select("id, fiche_id")
          .eq("finisseur_id", finisseur.id)
          .eq("semaine", weekId)
          .maybeSingle();
        
        if (transport) {
          // 2. Récupérer les jours
          const { data: jours } = await supabase
            .from("fiches_transport_finisseurs_jours")
            .select("*")
            .eq("fiche_transport_finisseur_id", transport.id)
            .order("date");
          
          if (jours && jours.length > 0) {
            const days: TransportFinisseurDay[] = jours.map((j: any) => ({
              date: j.date,
              conducteurMatinId: j.conducteur_matin_id || finisseur.id,
              conducteurSoirId: j.conducteur_soir_id || finisseur.id,
              immatriculation: j.immatriculation || "",
            }));
            
            transportData[finisseur.id] = { ficheId: transport.fiche_id, days };
          }
        }
      }
      
      if (Object.keys(transportData).length > 0) {
        setTransportFinisseurData(transportData);
      }
    };
    
    loadTransportData();
  }, [isConducteurMode, finisseursData, weekId]);

  const [hasUserEdits, setHasUserEdits] = useState(false);

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
    if (isConducteurMode && chefId && weekId && !hasLoadedData && finisseursData.length > 0 && chantiers.length > 0) {
      const finisseurEntries = finisseursData.map((finisseur) => {
        const daysDefault = {
          Lundi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Mardi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Jeudi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId: null, chantierCode: null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
        };

        // Appliquer les données existantes si disponibles
        const daysFromDb = { ...daysDefault };
        if (finisseur.ficheJours) {
          finisseur.ficheJours.forEach(j => {
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
              
              // 🔧 Trajet: true par défaut si valeur absente, sinon utiliser la valeur réelle
              const rawT = j.T;
              const trajet = rawT === null || rawT === undefined ? true : Boolean(rawT);
              
              // Trouver le chantier par code si présent
              const chantierDuJour = j.code_chantier_du_jour 
                ? chantiers.find(c => c.code_chantier === j.code_chantier_du_jour)
                : null;
              
              daysFromDb[dayLabel] = {
                ...daysFromDb[dayLabel],
                hours,
                overtime: 0,
                panierRepas: PA,
                trajet,
                trajetPerso: !!j.trajet_perso,
                heuresIntemperie: HI,
                absent: hours === 0 && !PA && HI === 0,
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
              
              // ✅ Ne remplir que si le jour n'a pas déjà de chantier (priorité à ficheJours)
              if (!currentDay.chantierId && !currentDay.chantierCode) {
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
        
        // Valeurs par défaut (39h) - UNIQUEMENT Lundi à Vendredi
        const daysDefault = {
          Lundi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Mardi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Jeudi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
          Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0, chantierId, chantierCode: selectedChantier?.code_chantier || null, chantierVille: null, chantierNom: null, commentaire: "", codeTrajet: null },
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
              
              // 🔧 Trajet: true par défaut si valeur absente, sinon utiliser la valeur réelle
              const rawT = j.T;
              const trajet = rawT === null || rawT === undefined ? true : Boolean(rawT);
              
              // Trouver le chantier par code si disponible
              const chantierDuJour = j.code_chantier_du_jour 
                ? chantiers.find(c => c.code_chantier === j.code_chantier_du_jour)
                : null;
              
              daysFromDb[dayLabel] = {
                hours,
                overtime: 0,
                panierRepas: PA,
                trajet,
                trajetPerso: !!j.trajet_perso,
                heuresIntemperie: HI,
                absent: hours === 0 && !PA && HI === 0,
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
        Lundi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true,  trajetPerso: false, heuresIntemperie: 0, codeTrajet: null as CodeTrajet | null },
        Mardi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true,  trajetPerso: false, heuresIntemperie: 0, codeTrajet: null as CodeTrajet | null },
        Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true,  trajetPerso: false, heuresIntemperie: 0, codeTrajet: null as CodeTrajet | null },
        Jeudi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true,  trajetPerso: false, heuresIntemperie: 0, codeTrajet: null as CodeTrajet | null },
        Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, trajet: true,  trajetPerso: false, heuresIntemperie: 0, codeTrajet: null as CodeTrajet | null },
      } as const;

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
                
                // 🔧 Trajet: true par défaut si valeur absente, sinon utiliser la valeur réelle
                const rawT = j.T;
                const trajet = rawT === null || rawT === undefined ? true : Boolean(rawT);
                
                daysFromDb[label] = {
                  hours,
                  overtime: 0,
                  panierRepas: PA,
                  trajet,
                  trajetPerso: !!j.trajet_perso,
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
    if (!affectationsJours?.length || !chantiers.length || !entries.length) return;

    console.log("🔄 Synchronisation affectations → saisie", {
      affectations: affectationsJours.length,
      chantiers: chantiers.length,
      entries: entries.length,
      hasUserEdits
    });

    setEntries(prev => prev.map(entry => {
      const affs = affectationsJours.filter(a => a.finisseur_id === entry.employeeId);
      if (!affs.length) return entry;

      const updatedDays = { ...entry.days };
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
      
      for (const aff of affs) {
        const date = new Date(aff.date + "T00:00:00");
        const dayLabel = dayNames[date.getDay()];
        const dayData = updatedDays[dayLabel];
        
        if (!dayData) continue;

        const chantierInfo = chantiers.find(c => c.id === aff.chantier_id);
        const shouldUpdate = !dayData.chantierId || (!hasUserEdits && dayData.chantierId !== aff.chantier_id);
        
        if (shouldUpdate) {
          console.log(`  ✅ ${entry.employeeName} - ${dayLabel}: ${chantierInfo?.nom ?? aff.chantier_id}`);
          updatedDays[dayLabel] = {
            ...dayData,
            chantierId: aff.chantier_id,
            chantierCode: chantierInfo?.code_chantier ?? null,
            chantierVille: chantierInfo?.ville ?? null,
            chantierNom: chantierInfo?.nom ?? null,
          };
        }
      }
      
      return { ...entry, days: updatedDays };
    }));
  }, [isConducteurMode, affectationsJours, chantiers, entries.length, hasUserEdits]);

  // Détecter et ajouter dynamiquement les nouveaux maçons/intérimaires (mode chef)
  useEffect(() => {
    if (isConducteurMode || !hasLoadedData || readOnly) return;

    setEntries((prev) => {
      const existingIds = new Set(prev.map(e => e.employeeId));
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

      const defaults = {
        Lundi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0 },
        Mardi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0 },
        Mercredi: { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0 },
        Jeudi:    { hours: 8, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0 },
        Vendredi: { hours: 7, overtime: 0, absent: false, panierRepas: true, trajet: true, trajetPerso: false, heuresIntemperie: 0 },
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
                  trajet: T > 0,
                  trajetPerso: !!j.trajet_perso,
                  heuresIntemperie: HI,
                  absent: hours === 0 && !PA && T === 0 && HI === 0,
                  commentaire: (j as any).commentaire || "",
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
  useEffect(() => {
    if (!isConducteurMode || !hasLoadedData) return;
    setEntries(prev =>
      prev.filter(e => getVisibleDaysForFinisseur(e.employeeId).length > 0)
    );
  }, [isConducteurMode, hasLoadedData, affectationsJours, finisseursData]);

  // Nettoyer l'état transport des finisseurs supprimés
  useEffect(() => {
    if (!isConducteurMode) return;
    setTransportFinisseurData(prev => {
      const allowed = new Set(entries.map(e => e.employeeId));
      return Object.fromEntries(
        Object.entries(prev).filter(([id]) => allowed.has(id))
      );
    });
  }, [isConducteurMode, entries]);

  // Réinitialiser hasLoadedData si la semaine change
  useEffect(() => {
    setHasLoadedData(false);
    setHasUserEdits(false);
  }, [weekId]);

  // Propager l'état au parent pour sauvegarde
  useEffect(() => {
    onEntriesChange?.(entries);
  }, [entries, onEntriesChange]);

  // Auto-save avec debounce de 2 secondes
  useEffect(() => {
    if (readOnly || !hasLoadedData || entries.length === 0 || !chefId) return;
    
    const timer = setTimeout(() => {
      // Auto-save systématique pour TOUTE modification
      autoSaveMutation.mutate({ 
        timeEntries: entries, 
        weekId, 
        chantierId, 
        chefId 
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [entries, hasLoadedData, weekId, chantierId, chefId, readOnly]);
  
  // Handler pour mise à jour des fiches trajet finisseurs
  const handleTransportFinisseurUpdate = useCallback((finisseurId: string, data: { days: TransportFinisseurDay[] }) => {
    setTransportFinisseurData((prev) => ({
      ...prev, 
      [finisseurId]: {
        ficheId: prev[finisseurId]?.ficheId, // Préserver la ficheId existante
        days: data.days
      }
    }));
    
    // Auto-save systématique (même sans plaque renseignée)
    const finisseurTransportData = transportFinisseurData[finisseurId];
    
    autoSaveTransportFinisseur.mutateAsync({
      ficheId: finisseurTransportData?.ficheId,
      finisseurId,
      conducteurId: chefId || "",
      semaine: weekId,
      days: data.days.map((d) => ({
        date: d.date,
        immatriculation: d.immatriculation,
        conducteurMatinId: d.conducteurMatinId || finisseurId,
        conducteurSoirId: d.conducteurSoirId || finisseurId,
      })),
    })
    .then((res) => {
      if (res?.ficheId && !finisseurTransportData?.ficheId) {
        setTransportFinisseurData((prev2) => ({
          ...prev2,
          [finisseurId]: {
            ...prev2[finisseurId],
            ficheId: res.ficheId,
          },
        }));
      }
    });
  }, [transportFinisseurData, weekId, chefId, autoSaveTransportFinisseur]);

  const calculateTotalHours = (entry: TimeEntry) => {
    const visibleDays = getVisibleDaysForFinisseur(entry.employeeId);
    
    // Filtrer les jours à comptabiliser
    const daysToCount = isConducteurMode 
      ? weekDays.filter(d => visibleDays.includes(d))
      : weekDays;
    
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

  // Pré-calculer l'état de complétude des fiches trajet (AVANT le return pour respecter Rules of Hooks)
  const transportCompletionMap = useMemo(() => {
    if (!isConducteurMode || !affectationsJours) return {};
    
    const map: Record<string, boolean> = {};
    
    entries.forEach(entry => {
      const transportData = transportFinisseurData[entry.employeeId];
      
      // Récupérer les dates ISO affectées pour ce finisseur
      const affectedDates = affectationsJours
        .filter(a => a.finisseur_id === entry.employeeId)
        .map(a => a.date);
      
      // Si pas de jours affectés, considérer comme complet
      if (affectedDates.length === 0) {
        map[entry.employeeId] = true;
        return;
      }
      
      // Construire un Set des dates avec code trajet perso et des dates d'absence
      const monday = parseISOWeek(weekId);
      const trajetPersoDates = new Set<string>();
      const absenceDates = new Set<string>();
      
      ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].forEach((dayName, idx) => {
        const dayData = entry.days[dayName];
        const dateStr = format(addDays(monday, idx), "yyyy-MM-dd");
        
        if (dayData?.codeTrajet === "T_PERSO") {
          trajetPersoDates.add(dateStr);
        }
        if (dayData?.absent) {
          absenceDates.add(dateStr);
        }
      });
      
      // Si pas de données transport, vérifier si tous les jours affectés sont absents ou trajet perso
      if (!transportData?.days) {
        const allOkWithoutTransport = affectedDates.every(d => 
          absenceDates.has(d) || trajetPersoDates.has(d)
        );
        map[entry.employeeId] = allOkWithoutTransport;
        return;
      }

      // Vérifier que tous les jours affectés ont une fiche complète
      const isComplete = affectedDates.every(dateStr => {
        // Si absent ou trajet perso : considérer comme complet (pas besoin de plaque)
        if (absenceDates.has(dateStr) || trajetPersoDates.has(dateStr)) {
          return true;
        }
        
        // Sinon : exiger immatriculation + conducteurs
        const jourData = transportData.days.find(d => d.date === dateStr);
        if (!jourData) return false;
        
        const hasDrivers = !!jourData.conducteurMatinId && !!jourData.conducteurSoirId;
        const hasVehicle = !!jourData.immatriculation && jourData.immatriculation.trim() !== "";
        
        return hasDrivers && hasVehicle;
      });
      
      map[entry.employeeId] = isComplete;
    });
    
    return map;
  }, [isConducteurMode, entries, transportFinisseurData, affectationsJours, weekId]);

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
      {/* Trier les entrées : Chef d'équipe > Maçons > Intérimaires */}
      {(() => {
        const baseEntries = !isConducteurMode
          ? entries
          : entries.filter(e => getVisibleDaysForFinisseur(e.employeeId).length > 0);
        const sortedEntries = [...baseEntries].sort((a, b) => {
          const maconA = macons.find(m => m.id === a.employeeId);
          const maconB = macons.find(m => m.id === b.employeeId);
          
          // Déterminer la priorité de tri
          const getPriority = (macon: typeof maconA) => {
            if (!macon) return 4; // Inconnu en dernier
            if (macon.isChef) return 0; // Chef en premier
            if (macon.role === "macon") return 1; // Maçons en 2ème
            if (macon.role === "grutier") return 2; // Grutiers en 3ème
            if (macon.role === "interimaire") return 3; // Intérimaires en dernier
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
          const isMacon = macon && !isChef && !isInterimaire && !isGrutier;
          
          // Récupérer l'état de complétude depuis la map pré-calculée
          const visibleDays = getVisibleDaysForFinisseur(entry.employeeId);
          const isTransportComplete = transportCompletionMap[entry.employeeId] ?? true;
          
          return (
            <AccordionItem 
              key={entry.employeeId} 
              value={entry.employeeId}
              className={`border rounded-lg shadow-md overflow-hidden bg-card ${
                isConducteurMode && visibleDays.length > 0
                  ? isTransportComplete 
                    ? "border-l-4 border-l-green-500" 
                    : "border-l-4 border-l-orange-500"
                  : ""
              }`}
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
                    {isMacon && <span className="text-xl">👷‍♂️</span>}
                    
                    {/* Nom */}
                    <h3 className="font-semibold text-foreground">{entry.employeeName}</h3>
                    
                    {/* Badges de rôle */}
                    {isChef && (
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Chef d'équipe
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
                    {isMacon && (
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                        Maçon
                      </Badge>
                    )}
                    
                    {/* Indicateur fiche trajet (mode conducteur uniquement) */}
                    {isConducteurMode && visibleDays.length > 0 && (
                      <div className="flex items-center gap-1">
                        {isTransportComplete ? (
                          <Truck className="h-4 w-4 text-green-600" />
                        ) : (
                          <Truck className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
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
                    
                    return weekDays
                      .filter(day => !isConducteurMode || visibleDays.includes(day))
                      .map((day) => {
                        const dayData = entry.days[day];
                        
                        // Calculer la date ISO du jour
                        const monday = parseISOWeek(weekId);
                        const dayIndex = weekDays.indexOf(day);
                        const dateISO = format(addDays(monday, dayIndex), "yyyy-MM-dd");
                        
                        // Vérifier si ce jour est affecté par un autre conducteur
                        const isDayBlocked = isDayAffectedByOtherConducteur(entry.employeeId, dateISO);
                        
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
                                🔒 Autre conducteur
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
                                disabled={isReadOnly || isDayBlocked}
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
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">Intempérie</label>
                              <div className="flex items-center gap-1">
                                <EditableNumber
                                  value={dayData.heuresIntemperie}
                                  onCommit={(v) =>
                                    updateDayValue(entry.employeeId, day, "heuresIntemperie", v)
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

                            {/* Panier Repas */}
                            <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                              <Checkbox
                                checked={dayData.panierRepas}
                                onCheckedChange={(checked) =>
                                  updateDayValue(entry.employeeId, day, "panierRepas", !!checked)
                                }
                                disabled={isReadOnly || isDayBlocked}
                                id={`panier-${entry.employeeId}-${day}`}
                              />
                              <label
                                htmlFor={`panier-${entry.employeeId}-${day}`}
                                className="text-xs text-muted-foreground cursor-pointer flex-1"
                              >
                                Panier repas
                              </label>
                            </div>

                            {/* Colonne Trajet - Stack vertical */}
                            <div className="flex flex-col gap-2">
                              <label className="text-xs text-muted-foreground block mb-1">
                                Trajet
                              </label>
                              <CodeTrajetSelector
                                value={dayData.codeTrajet || null}
                                onChange={(value) => updateDayValue(entry.employeeId, day, "codeTrajet", value)}
                                disabled={isReadOnly || isDayBlocked}
                                hasHours={(dayData.hours || 0) > 0}
                              />
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
                
                {/* Fiche trajet pour les finisseurs (mode conducteur uniquement) */}
                {isConducteurMode && chefId && (
                  <div className="px-4 pb-4 mt-3">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="trajet" className="border-0">
                        <AccordionTrigger className="py-3 px-4 hover:no-underline bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-orange-500 rounded-lg shadow-sm">
                              <Car className="h-4 w-4 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="font-semibold text-base text-orange-700 dark:text-orange-300">Fiche trajet</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-2 px-4">
                    <TransportFinisseurAccordion
                      finisseurId={entry.employeeId}
                      finisseurNom={entry.employeeName}
                      semaine={weekId}
                      conducteurId={chefId}
                      affectedDates={
                        affectationsJours
                          ?.filter(a => a.finisseur_id === entry.employeeId)
                          .map(a => a.date) || []
                      }
                      allAffectations={allAffectations}
                      trajetPersoByDate={
                              // Créer un Map date → true si T_PERSO
                              Object.entries(entry.days).reduce((map, [dayName, dayData]) => {
                                const dayIndex = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].indexOf(dayName);
                                if (dayIndex !== -1 && weekId) {
                                  const monday = parseISOWeek(weekId);
                                  const date = format(addDays(monday, dayIndex), "yyyy-MM-dd");
                                  map.set(date, dayData.codeTrajet === "T_PERSO");
                                }
                                return map;
                              }, new Map<string, boolean>())
                            }
                            initialData={transportFinisseurData[entry.employeeId] ? { days: transportFinisseurData[entry.employeeId].days } : null}
                            onUpdate={(data) => handleTransportFinisseurUpdate(entry.employeeId, data)}
                            localVehiculeUsage={localVehiculeUsage}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
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
