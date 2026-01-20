import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { useAffectationsJoursChef, useUpdateJoursForMember, getDayNamesFromDates, type AffectationJourChef } from "@/hooks/useAffectationsJoursChef";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DaysSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
  } | null;
  chefId: string;
  chantierId: string;
  semaine: string;
  affectationId: string | null;
  entrepriseId: string;
  onSuccess?: () => void;
}

const WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

export const DaysSelectionDialog = ({
  open,
  onOpenChange,
  member,
  chefId,
  chantierId,
  semaine,
  affectationId,
  entrepriseId,
  onSuccess,
}: DaysSelectionDialogProps) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Charger toutes les affectations de la semaine pour voir les conflits
  const { data: allAffectations, isLoading } = useAffectationsJoursChef(semaine);
  
  // Mutation pour sauvegarder
  const updateJours = useUpdateJoursForMember();
  
  // Filtrer les affectations pour ce membre
  const memberAffectations = allAffectations?.filter(a => a.macon_id === member?.id) || [];
  
  // Récupérer les jours pris par un autre chef
  const daysTakenByOthers = memberAffectations
    .filter(a => a.chef_id !== chefId)
    .reduce((acc, a) => {
      const dayName = getDayNamesFromDates([a.jour], semaine)[0];
      if (dayName) {
        acc[dayName] = a;
      }
      return acc;
    }, {} as Record<string, AffectationJourChef>);
  
  // Initialiser les jours sélectionnés UNE SEULE FOIS à l'ouverture
  useEffect(() => {
    // Ne s'exécute qu'une fois à l'ouverture du dialog, après chargement des données
    if (open && member && !hasInitialized && !isLoading) {
      if (memberAffectations.length > 0) {
        const myDays = memberAffectations
          .filter(a => a.chef_id === chefId)
          .map(a => getDayNamesFromDates([a.jour], semaine)[0])
          .filter(Boolean);
        setSelectedDays(myDays);
      } else {
        // Par défaut, tous les jours sont sélectionnés si aucune affectation n'existe
        setSelectedDays(WEEK_DAYS);
      }
      setHasInitialized(true);
    }
    
    // Reset le flag quand le dialog se ferme
    if (!open) {
      setHasInitialized(false);
    }
  }, [open, member, memberAffectations, chefId, semaine, hasInitialized, isLoading]);
  
  const handleDayToggle = (day: string) => {
    // Ne pas permettre de sélectionner un jour pris par un autre chef
    if (daysTakenByOthers[day]) return;
    
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };
  
  const handleSave = async () => {
    if (!member) return;
    
    await updateJours.mutateAsync({
      maconId: member.id,
      chefId,
      chantierId,
      semaine,
      affectationId,
      entrepriseId,
      selectedDays,
    });
    
    onSuccess?.();
    onOpenChange(false);
  };
  
  const handleSelectAll = () => {
    const availableDays = WEEK_DAYS.filter(day => !daysTakenByOthers[day]);
    setSelectedDays(availableDays);
  };
  
  const handleDeselectAll = () => {
    setSelectedDays([]);
  };
  
  if (!member) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Jours d'affectation - {member.prenom} {member.nom}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info box */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Sélectionnez les jours où cet employé travaille sur votre chantier cette semaine.
              </AlertDescription>
            </Alert>
            
            {/* Checkboxes pour chaque jour */}
            <div className="space-y-3">
              {WEEK_DAYS.map(day => {
                const isTakenByOther = !!daysTakenByOthers[day];
                const isSelected = selectedDays.includes(day);
                
                return (
                  <div 
                    key={day}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isTakenByOther 
                        ? "bg-muted/50 border-muted cursor-not-allowed opacity-60" 
                        : isSelected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background border-border hover:bg-muted/30 cursor-pointer"
                    }`}
                    onClick={() => !isTakenByOther && handleDayToggle(day)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`day-${day}`}
                        checked={isSelected}
                        disabled={isTakenByOther}
                        onCheckedChange={() => handleDayToggle(day)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Label 
                        htmlFor={`day-${day}`}
                        className={`cursor-pointer font-medium ${isTakenByOther ? "text-muted-foreground" : ""}`}
                      >
                        {day}
                      </Label>
                    </div>
                    
                    {isTakenByOther && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Autre chef
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Boutons de sélection rapide */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="flex-1"
              >
                Tout sélectionner
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeselectAll}
                className="flex-1"
              >
                Tout désélectionner
              </Button>
            </div>
            
            {/* Afficher les conflits si présents */}
            {Object.keys(daysTakenByOthers).length > 0 && (
              <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  {Object.keys(daysTakenByOthers).length === 1 
                    ? `${Object.keys(daysTakenByOthers)[0]} est déjà affecté à un autre chef`
                    : `${Object.keys(daysTakenByOthers).join(", ")} sont déjà affectés à un autre chef`
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateJours.isPending}
          >
            {updateJours.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
