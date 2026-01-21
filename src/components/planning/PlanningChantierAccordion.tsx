import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { Chantier } from "@/hooks/useChantiers";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";
import { Employe, JOURS_SEMAINE_FR } from "@/hooks/useAllEmployes";
import { PlanningEmployeRow } from "./PlanningEmployeRow";
import { AddEmployeeToPlanningDialog } from "./AddEmployeeToPlanningDialog";

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
  isLoading?: boolean;
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
  isLoading,
}: PlanningChantierAccordionProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [heuresPopoverOpen, setHeuresPopoverOpen] = useState(false);

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

    return Array.from(map.values());
  }, [affectations]);

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

  const getInsertionBadge = () => {
    if (!statutInsertion || statutInsertion === "pas_insertion") return null;
    
    const config: Record<string, { label: string; className: string }> = {
      ok: { label: "OK", className: "bg-success/20 text-success border-success/30" },
      en_cours: { label: "En cours", className: "bg-primary/20 text-primary border-primary/30" },
      terminee: { label: "Terminée", className: "bg-success/20 text-success border-success/30" },
      annulee: { label: "Annulée", className: "bg-destructive/20 text-destructive border-destructive/30" },
    };
    
    const cfg = config[statutInsertion];
    if (!cfg) return null;
    
    return (
      <Badge variant="outline" className={`text-xs px-1.5 ${cfg.className}`}>
        Ins: {cfg.label}
      </Badge>
    );
  };

  const handleAdd = (employeId: string, days: string[]) => {
    onAddEmploye(employeId, chantier.id, days);
  };

  return (
    <>
      <Accordion type="single" collapsible className="border rounded-lg overflow-hidden">
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
                <Popover open={heuresPopoverOpen} onOpenChange={setHeuresPopoverOpen}>
                  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Badge 
                      variant="outline" 
                      className="text-xs px-1.5 bg-muted cursor-pointer hover:bg-primary/20 transition-colors"
                    >
                      {heuresHebdo}
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={heuresHebdo}
                      onValueChange={(value) => {
                        onHeuresChange?.(chantier.id, value);
                        setHeuresPopoverOpen(false);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="35H">35H</SelectItem>
                        <SelectItem value="37H">37H</SelectItem>
                        <SelectItem value="39H">39H</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
                {getInsertionBadge()}
              </div>

              {/* Compteurs par catégorie + jours */}
              <div className="flex items-center gap-4">
                {/* Badges LR / App / Intérim */}
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-1.5">
                    LR: {countsByCategory.totalLR}
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
                {employeAffectations.map(({ employe, affectations: empAff }) => (
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
                  />
                ))}
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
      />
    </>
  );
};
