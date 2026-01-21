import { useState, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Building2, User } from "lucide-react";
import { Chantier } from "@/hooks/useChantiers";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";
import { Employe } from "@/hooks/useAllEmployes";
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

  // Compter les employés par jour
  const countByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    weekDays.forEach(day => {
      counts[day.date] = affectations.filter(a => a.jour === day.date).length;
    });
    return counts;
  }, [affectations, weekDays]);

  const totalEmployes = employeAffectations.length;
  const conducteurName = chantier.conducteur 
    ? `${chantier.conducteur.prenom} ${chantier.conducteur.nom}`
    : "Sans conducteur";
  const chefName = chantier.chef
    ? `${chantier.chef.prenom} ${chantier.chef.nom}`
    : null;

  const handleAdd = (employeId: string, days: string[]) => {
    onAddEmploye(employeId, chantier.id, days);
  };

  return (
    <>
      <Accordion type="single" collapsible className="border rounded-lg">
        <AccordionItem value={chantier.id} className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
            <div className="flex items-center justify-between w-full pr-4">
              {/* Info chantier */}
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">
                    {chantier.code_chantier || "CI???"} {chantier.nom}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{conducteurName}</span>
                    {chefName ? (
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {chefName}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sans chef
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Compteurs par jour */}
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {weekDays.map(day => (
                    <div 
                      key={day.date} 
                      className="flex flex-col items-center min-w-[28px]"
                    >
                      <span className="text-xs text-muted-foreground">{day.dayName}</span>
                      <span className={`text-sm font-medium ${countByDay[day.date] > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {countByDay[day.date]}
                      </span>
                    </div>
                  ))}
                </div>

                <Badge variant="secondary">
                  {totalEmployes} employé{totalEmployes > 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            {/* En-tête des colonnes */}
            <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground font-medium border-b mb-2">
              <span className="min-w-[60px]">Type</span>
              <span className="flex-1 min-w-[150px]">Personnel</span>
              <span className="w-[100px]">Ville</span>
              <span className="w-[100px]">Fonction</span>
              <span className="w-[140px]">Véhicule</span>
              <span className="w-[80px]">Agence</span>
              <div className="flex gap-1">
                {weekDays.map(day => (
                  <span key={day.date} className="w-[26px] text-center">{day.dayName}</span>
                ))}
              </div>
              <span className="w-8"></span>
            </div>

            {/* Liste des employés */}
            {employeAffectations.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                Aucun employé affecté sur ce chantier
              </div>
            ) : (
              <div className="space-y-1">
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
              className="mt-4 w-full"
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
