import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserPlus } from "lucide-react";
import { Chantier } from "@/hooks/useChantiers";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";
import { Employe, JOURS_SEMAINE_FR } from "@/hooks/useAllEmployes";
import { PlanningEmployeRow } from "./PlanningEmployeRow";
import { AddEmployeeToPlanningDialog } from "./AddEmployeeToPlanningDialog";
import { cn } from "@/lib/utils";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
import { useSetChantierPrincipal } from "@/hooks/useSetChantierPrincipal";

interface InsertionData {
  statut_insertion: string;
  insertion_date_debut: string | null;
  insertion_heures_requises: number | null;
}

interface PlanningChantierAccordionProps {
  chantier: Chantier;
  affectations: PlanningAffectation[];
  allAffectations: PlanningAffectation[];
  weekDays: { date: string; dayName: string; fullName: string }[];
  semaine: string;
  onDayToggle: (employeId: string, chantierId: string, date: string, checked: boolean) => void;
  onVehiculeChange: (employeId: string, chantierId: string, vehiculeId: string | null) => void;
  onRemoveEmploye: (employeId: string, chantierId: string) => void;
  onAddEmploye: (employeId: string, chantierId: string, days: string[]) => void;
  onHeuresChange?: (chantierId: string, heures: string) => void;
  onInsertionChange?: (chantierId: string, data: InsertionData) => void;
  isLoading?: boolean;
  forceOpen?: boolean;
  chefsWithPrincipal?: Map<string, string>; // chef_id -> chantier_principal_id
  onSetChefResponsable?: (employeId: string, chantierId: string) => void;
  absencesLDByEmploye?: Map<string, { dates: Set<string>; type: string }>;
}

export const PlanningChantierAccordion = ({
  chantier,
  affectations,
  allAffectations,
  weekDays,
  semaine,
  onDayToggle,
  onVehiculeChange,
  onRemoveEmploye,
  onAddEmploye,
  onHeuresChange,
  onInsertionChange,
  isLoading,
  forceOpen,
  chefsWithPrincipal,
  onSetChefResponsable,
  absencesLDByEmploye,
}: PlanningChantierAccordionProps) => {
  const { shortName } = useEnterpriseConfig();
  const { mutate: setChantierPrincipal } = useSetChantierPrincipal();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [customHoursInput, setCustomHoursInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [insertionPopoverOpen, setInsertionPopoverOpen] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>("");

  // Synchroniser l'état avec forceOpen
  useEffect(() => {
    if (forceOpen !== undefined) {
      setAccordionValue(forceOpen ? chantier.id : "");
    }
  }, [forceOpen, chantier.id]);

  // Grouper les affectations par employé
  const employeAffectations = useMemo(() => {
    const map = new Map<string, { employe: Employe; affectations: PlanningAffectation[] }>();
    
    affectations.forEach(aff => {
      if (!aff.employe) return;
      
      if (!map.has(aff.employe_id)) {
        map.set(aff.employe_id, {
          employe: aff.employe as Employe,
          affectations: [],
        });
      }
      map.get(aff.employe_id)!.affectations.push(aff);
    });

    // Tri par ordre hiérarchique : Chef > Maçon > Finisseur > Grutier > Intérimaire
    const roleOrder: Record<string, number> = {
      chef: 1,
      macon: 2,
      finisseur: 3,
      grutier: 4,
    };

    return Array.from(map.values()).sort((a, b) => {
      const aIsInterim = !!a.employe.agence_interim;
      const bIsInterim = !!b.employe.agence_interim;
      
      // Intérimaires toujours en dernier
      if (aIsInterim && !bIsInterim) return 1;
      if (!aIsInterim && bIsInterim) return -1;
      
      // Tri par rôle métier
      const aOrder = roleOrder[a.employe.role_metier || ""] || 99;
      const bOrder = roleOrder[b.employe.role_metier || ""] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Tri alphabétique en cas d'égalité
      return `${a.employe.nom} ${a.employe.prenom}`.localeCompare(
        `${b.employe.nom} ${b.employe.prenom}`
      );
    });
  }, [affectations]);

  // Calculer les conflits : pour chaque employé, quels jours sont pris sur un AUTRE chantier
  const conflictsByEmploye = useMemo(() => {
    const map = new Map<string, Map<string, string>>(); // employe_id -> Map<jour, chantier_nom>
    
    allAffectations.forEach(aff => {
      // Ignorer les affectations sur ce chantier
      if (aff.chantier_id === chantier.id) return;
      
      if (!map.has(aff.employe_id)) {
        map.set(aff.employe_id, new Map());
      }
      // Récupérer le nom du chantier depuis l'affectation
      const chantierNom = (aff as any).chantier?.nom || "Autre chantier";
      map.get(aff.employe_id)!.set(aff.jour, chantierNom);
    });
    
    return map;
  }, [allAffectations, chantier.id]);

  // Vérifier si un employé est apprenti
  const isApprenti = (emp: Employe): boolean => {
    const libelle = emp.libelle_emploi?.toLowerCase() || "";
    return libelle.includes("apprenti") || libelle.includes("alternant");
  };

  // Compter par catégorie (LR, App, Intérim) - employés uniques + présences par jour
  const countsByCategory = useMemo(() => {
    // Compteurs par jour (pour les colonnes L M M J V)
    const lrByDay: Record<string, number> = {};
    const appByDay: Record<string, number> = {};
    const interimByDay: Record<string, number> = {};
    
    weekDays.forEach(day => {
      lrByDay[day.date] = 0;
      appByDay[day.date] = 0;
      interimByDay[day.date] = 0;
    });

    affectations.forEach(aff => {
      if (!aff.employe) return;
      const emp = aff.employe as Employe;
      const isInterim = !!emp.agence_interim;
      const isApp = isApprenti(emp);
      
      if (isInterim) {
        interimByDay[aff.jour] = (interimByDay[aff.jour] || 0) + 1;
      } else if (isApp) {
        appByDay[aff.jour] = (appByDay[aff.jour] || 0) + 1;
      } else {
        lrByDay[aff.jour] = (lrByDay[aff.jour] || 0) + 1;
      }
    });

    // Totaux = nombre d'EMPLOYÉS UNIQUES par catégorie
    const uniqueLR = new Set<string>();
    const uniqueApp = new Set<string>();
    const uniqueInterim = new Set<string>();

    employeAffectations.forEach(({ employe }) => {
      const isInterim = !!employe.agence_interim;
      const isApp = isApprenti(employe);
      
      if (isInterim) {
        uniqueInterim.add(employe.id);
      } else if (isApp) {
        uniqueApp.add(employe.id);
      } else {
        uniqueLR.add(employe.id);
      }
    });

    return { 
      lrByDay, 
      appByDay, 
      interimByDay, 
      totalLR: uniqueLR.size, 
      totalApp: uniqueApp.size, 
      totalInterim: uniqueInterim.size 
    };
  }, [affectations, weekDays, employeAffectations]);

  const totalEmployes = employeAffectations.length;
  const conducteurName = chantier.conducteur 
    ? `${chantier.conducteur.prenom} ${chantier.conducteur.nom}`
    : "Sans conducteur";

  // Champs étendus du chantier (nouveaux champs SQL)
  const heuresHebdo = (chantier as any).heures_hebdo_prevues || "39H";
  const statutInsertion = (chantier as any).statut_insertion;

  // Champs étendus pour insertion
  const insertionHeuresRequises = (chantier as any).insertion_heures_requises;

  // State local pour l'édition
  const [editStatut, setEditStatut] = useState(statutInsertion || "pas_insertion");
  const [editHeures, setEditHeures] = useState(
    insertionHeuresRequises?.toString() || ""
  );

  // Config des 6 choix d'insertion
  const insertionOptions = [
    { value: "pas_insertion", label: "Pas d'insertion", badgeLabel: "Pas d'insertion", className: "bg-muted text-muted-foreground border-muted" },
    { value: "heures_insertion", label: "Heures d'insertion", badgeLabel: "Ins:", className: "bg-destructive/20 text-destructive border-destructive/30" },
    { value: "clause_terminee", label: "Clause insertion terminée", badgeLabel: "Clause terminée", className: "bg-success/20 text-success border-success/30" },
    { value: "clause_terminee_attestation", label: "Clause terminée / attestation reçue", badgeLabel: "Terminée + attestation", className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300" },
    { value: "insertion_terminee", label: "Insertion terminée", badgeLabel: "Insertion terminée", className: "bg-success/20 text-success border-success/30" },
    { value: "clause_annulee", label: "Clause insertion annulée", badgeLabel: "Clause annulée", className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300" },
  ];

  const handleInsertionSave = () => {
    onInsertionChange?.(chantier.id, {
      statut_insertion: editStatut,
      insertion_date_debut: null,
      insertion_heures_requises: editStatut === "heures_insertion" && editHeures ? parseInt(editHeures, 10) : null,
    });
    setInsertionPopoverOpen(false);
  };

  const getInsertionBadge = () => {
    const currentStatut = statutInsertion || "pas_insertion";
    const currentOption = insertionOptions.find(opt => opt.value === currentStatut) || insertionOptions[0];
    
    // Construire le label du badge
    let badgeLabel = currentOption.badgeLabel;
    if (currentStatut === "heures_insertion" && insertionHeuresRequises) {
      badgeLabel = `Ins: ${insertionHeuresRequises}h`;
    }
    
    return (
      <Popover open={insertionPopoverOpen} onOpenChange={setInsertionPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
              "cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              currentOption.className
            )}
            onClick={(e) => {
              e.stopPropagation();
              setEditStatut(statutInsertion || "pas_insertion");
              setEditHeures(insertionHeuresRequises?.toString() || "");
            }}
          >
            {badgeLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-72 p-3" 
          onClick={(e) => e.stopPropagation()}
          align="start"
        >
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-2">Statut d'insertion</h4>
            
            {/* Liste des 6 choix */}
            <div className="space-y-1">
              {insertionOptions.map((option) => (
                <div key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      editStatut === option.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                    onClick={() => setEditStatut(option.value)}
                  >
                    {option.label}
                  </button>
                  
                  {/* Champ heures conditionnel */}
                  {option.value === "heures_insertion" && editStatut === "heures_insertion" && (
                    <div className="flex items-center gap-2 px-3 py-2 ml-4">
                      <Input
                        type="number"
                        placeholder="800"
                        value={editHeures}
                        onChange={(e) => setEditHeures(e.target.value)}
                        className="h-8 w-24"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bouton Enregistrer */}
            <Button 
              onClick={handleInsertionSave} 
              className="w-full h-8"
              size="sm"
            >
              Enregistrer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const handleAdd = (employeId: string, days: string[]) => {
    onAddEmploye(employeId, chantier.id, days);
  };

  return (
    <>
      <Accordion 
        type="single" 
        collapsible 
        className="border rounded-lg overflow-hidden"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        <AccordionItem value={chantier.id} className="border-0">
          {/* En-tête style Excel */}
          <AccordionTrigger className="px-4 py-2 hover:no-underline bg-muted/50 hover:bg-muted/70">
            <div className="flex items-center justify-between w-full pr-4">
              {/* Info chantier - style Excel */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">
                    {chantier.code_chantier || "???"}
                  </span>
                  <span className="font-semibold">
                    {chantier.nom}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {conducteurName}
                </span>
                <Select
                  value={showCustomInput ? "Autre" : heuresHebdo}
                  onValueChange={(value) => {
                    if (value === "Autre") {
                      setShowCustomInput(true);
                      setCustomHoursInput("");
                    } else {
                      setShowCustomInput(false);
                      onHeuresChange?.(chantier.id, value);
                    }
                  }}
                >
                  <SelectTrigger 
                    className="h-6 w-auto gap-1 px-2 text-xs border-muted bg-muted hover:bg-primary/20 transition-colors rounded-full font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent onClick={(e) => e.stopPropagation()}>
                    <SelectItem value="35H">35H</SelectItem>
                    <SelectItem value="37H">37H</SelectItem>
                    <SelectItem value="39H">39H</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                {showCustomInput && (
                  <Input
                    className="h-6 w-16 text-xs px-2"
                    placeholder="42H"
                    value={customHoursInput}
                    onChange={(e) => setCustomHoursInput(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" && customHoursInput.trim()) {
                        onHeuresChange?.(chantier.id, customHoursInput.trim());
                        setShowCustomInput(false);
                      }
                      if (e.key === "Escape") {
                        setShowCustomInput(false);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (customHoursInput.trim()) {
                          onHeuresChange?.(chantier.id, customHoursInput.trim());
                        }
                        setShowCustomInput(false);
                      }, 150);
                    }}
                    autoFocus
                  />
                )}
                {getInsertionBadge()}
              </div>

              {/* Compteurs par catégorie + jours */}
              <div className="flex items-center gap-4">
                {/* Badges LR / App / Intérim */}
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-1.5">
                    {shortName}: {countsByCategory.totalLR}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs px-1.5">
                    App: {countsByCategory.totalApp}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs px-1.5">
                    Int: {countsByCategory.totalInterim}
                  </Badge>
                </div>

                {/* Compteurs par jour avec dates */}
                <div className="flex gap-1">
                  {weekDays.map((day, index) => {
                    const lr = countsByCategory.lrByDay[day.date] || 0;
                    const interim = countsByCategory.interimByDay[day.date] || 0;
                    const total = lr + interim;
                    const dateStr = format(parseISO(day.date), "d/MM");
                    return (
                      <div 
                        key={day.date} 
                        className="flex flex-col items-center min-w-[32px]"
                      >
                        <span className="text-xs font-bold text-muted-foreground">
                          {JOURS_SEMAINE_FR[index]}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {dateStr}
                        </span>
                        <span className={`text-sm font-bold ${total > 0 ? 'text-primary' : 'text-muted-foreground/50'}`}>
                          {total}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <Badge variant="secondary" className="ml-2">
                  {totalEmployes} pers.
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4 pt-2">
            {/* En-tête des colonnes - style Excel avec dates */}
            <div className="flex items-center gap-2 py-1.5 px-3 text-xs text-muted-foreground font-semibold border-b border-border bg-muted/30 rounded-t-md">
              <span className="min-w-[50px]">Type</span>
              <span className="flex-1 min-w-[140px]">Personnel</span>
              <span className="w-[80px]">Adresse</span>
              <span className="w-[80px]">Fonction</span>
              <span className="w-[130px]">Véhicule</span>
              <span className="w-[70px]">Agence</span>
              <div className="flex gap-0.5">
                {weekDays.map((day, i) => {
                  const dateStr = format(parseISO(day.date), "d/MM");
                  return (
                    <div key={i} className="w-6 text-center flex flex-col">
                      <span className="font-bold">{JOURS_SEMAINE_FR[i]}</span>
                      <span className="text-[9px] text-muted-foreground/70">{dateStr}</span>
                    </div>
                  );
                })}
              </div>
              <span className="w-6"></span>
            </div>

            {/* Liste des employés */}
            {employeAffectations.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                Aucun employé affecté sur ce chantier
              </div>
            ) : (
              <div className="bg-card rounded-b-md">
                {employeAffectations.map(({ employe, affectations: empAff }) => {
                  // Vérifier si cet employé est un chef (role_metier = 'chef')
                  const isChef = employe.role_metier === 'chef';
                  // Vérifier si c'est son chantier principal
                  const chantierPrincipalId = chefsWithPrincipal?.get(employe.id);
                  const isChantierPrincipal = isChef && chantierPrincipalId === chantier.id;
                  // Un chef est "multi-chantiers" s'il a un chantier principal défini
                  const isMultiChantierChef = isChef && !!chantierPrincipalId;
                  
                  // Chef responsable : compter les chefs sur ce chantier
                  const chefsOnThisChantier = employeAffectations.filter(
                    ea => ea.employe.role_metier === 'chef'
                  );
                  const showChefResponsable = isChef && chefsOnThisChantier.length >= 2;
                  const isChefResponsable = isChef && empAff.some(a => a.is_chef_responsable);
                  
                  return (
                    <PlanningEmployeRow
                      key={employe.id}
                      employe={employe}
                      affectations={empAff}
                      weekDays={weekDays}
                      onDayToggle={(empId, date, checked) => 
                        onDayToggle(empId, chantier.id, date, checked)
                      }
                      onVehiculeChange={(empId, vehiculeId) =>
                        onVehiculeChange(empId, chantier.id, vehiculeId)
                      }
                      onRemove={(empId) => onRemoveEmploye(empId, chantier.id)}
                      isLoading={isLoading}
                      conflictDays={conflictsByEmploye.get(employe.id)}
                      absenceDays={absencesLDByEmploye?.get(employe.id) 
                        ? new Map([...absencesLDByEmploye.get(employe.id)!.dates].map(d => [d, absencesLDByEmploye.get(employe.id)!.type]))
                        : undefined}
                      isChef={isMultiChantierChef}
                      isChantierPrincipal={isChantierPrincipal}
                      onSetChantierPrincipal={(empId) => {
                        const currentPrincipal = chefsWithPrincipal?.get(empId);
                        if (currentPrincipal === chantier.id) {
                          // Déjà principal → retirer le statut
                          setChantierPrincipal({ employeId: empId, chantierId: null });
                        } else {
                          // Secondaire → définir comme principal
                          setChantierPrincipal({ employeId: empId, chantierId: chantier.id });
                        }
                      }}
                      isChefResponsable={isChefResponsable}
                      showChefResponsable={showChefResponsable}
                      onSetChefResponsable={(empId) =>
                        onSetChefResponsable?.(empId, chantier.id)
                      }
                    />
                  );
                })}
              </div>
            )}

            {/* Bouton ajouter */}
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un employé
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AddEmployeeToPlanningDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        chantierId={chantier.id}
        semaine={semaine}
        weekDays={weekDays}
        existingAffectations={affectations}
        allAffectations={allAffectations}
        onAdd={handleAdd}
        absencesLDByEmploye={absencesLDByEmploye}
      />
    </>
  );
};
