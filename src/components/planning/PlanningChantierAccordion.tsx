import { useState, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Building2 } from "lucide-react";
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
  isLoading,
}: PlanningChantierAccordionProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  // Compter par catégorie (LR, Intérim) par jour
  const countsByCategory = useMemo(() => {
    const lrByDay: Record<string, number> = {};
    const interimByDay: Record<string, number> = {};
    
    weekDays.forEach(day => {
      lrByDay[day.date] = 0;
      interimByDay[day.date] = 0;
    });

    affectations.forEach(aff => {
      if (!aff.employe) return;
      const isInterim = !!(aff.employe as Employe).agence_interim;
      if (isInterim) {
        interimByDay[aff.jour] = (interimByDay[aff.jour] || 0) + 1;
      } else {
        lrByDay[aff.jour] = (lrByDay[aff.jour] || 0) + 1;
      }
    });

    // Totaux globaux
    const totalLR = Object.values(lrByDay).reduce((a, b) => a + b, 0);
    const totalInterim = Object.values(interimByDay).reduce((a, b) => a + b, 0);

    return { lrByDay, interimByDay, totalLR, totalInterim };
  }, [affectations, weekDays]);

  const totalEmployes = employeAffectations.length;
  const conducteurName = chantier.conducteur 
    ? `${chantier.conducteur.prenom} ${chantier.conducteur.nom}`
    : "Sans conducteur";

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
              </div>

              {/* Compteurs par catégorie + jours */}
              <div className="flex items-center gap-4">
                {/* Badges LR / Intérim */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs">
                    LR: {countsByCategory.totalLR}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
                    Int: {countsByCategory.totalInterim}
                  </Badge>
                </div>

                {/* Compteurs par jour */}
                <div className="flex gap-1">
                  {weekDays.map((day, index) => {
                    const lr = countsByCategory.lrByDay[day.date] || 0;
                    const interim = countsByCategory.interimByDay[day.date] || 0;
                    const total = lr + interim;
                    return (
                      <div 
                        key={day.date} 
                        className="flex flex-col items-center min-w-[28px]"
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {JOURS_SEMAINE_FR[index]}
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
            {/* En-tête des colonnes - style Excel */}
            <div className="flex items-center gap-2 py-1.5 px-3 text-xs text-muted-foreground font-semibold border-b border-border bg-muted/30 rounded-t-md">
              <span className="min-w-[50px]">Type</span>
              <span className="flex-1 min-w-[140px]">Personnel</span>
              <span className="w-[80px]">Adresse</span>
              <span className="w-[80px]">Fonction</span>
              <span className="w-[130px]">Véhicule</span>
              <span className="w-[70px]">Agence</span>
              <div className="flex gap-0.5">
                {JOURS_SEMAINE_FR.map((jour, i) => (
                  <span key={i} className="w-6 text-center font-bold">{jour}</span>
                ))}
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
