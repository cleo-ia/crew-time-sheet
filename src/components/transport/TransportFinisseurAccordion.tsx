import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { VehiculeSelectorFinisseurs } from "./VehiculeSelectorFinisseurs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TransportFinisseurDay } from "@/types/transport";
import { getWeekDates } from "@/lib/weekUtils";
import { Truck } from "lucide-react";
import { useFichesJoursByFinisseur } from "@/hooks/useFichesJoursByFinisseur";

interface TransportFinisseurAccordionProps {
  finisseurId: string;
  finisseurNom: string;
  semaine: string;
  affectedDates: string[]; // 🆕 Liste des dates ISO affectées (ex: ["2025-01-06", "2025-01-07"])
  trajetPersoByDate: Map<string, boolean>; // 🆕 Indique si chaque date est en trajet perso
  initialData: {
    days: TransportFinisseurDay[];
  } | null;
  onUpdate: (data: { days: TransportFinisseurDay[] }) => void;
  localVehiculeUsage: Map<string, Map<string, string>>; // 🆕 Pour validation temps réel
}

export const TransportFinisseurAccordion = ({
  finisseurId,
  finisseurNom,
  semaine,
  affectedDates,
  trajetPersoByDate,
  initialData,
  onUpdate,
  localVehiculeUsage,
}: TransportFinisseurAccordionProps) => {
  // Récupérer les jours d'absence du finisseur
  const { data: fichesJours = [] } = useFichesJoursByFinisseur(finisseurId, semaine);

  // Créer un Set des dates d'absence pour lookup rapide
  const absenceDates = useMemo(
    () => new Set(fichesJours.filter(fj => fj.isAbsent).map(fj => fj.date)),
    [fichesJours]
  );

  // Mémoriser weekDays pour éviter les recalculs inutiles
  // Filtrer pour exclure les jours d'absence
  const weekDays = useMemo(() => {
    const weekDates = getWeekDates(semaine);
    const allWeekDays = weekDates.slice(0, 5);
    
    return allWeekDays.filter((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      // Exclure si absent OU non affecté
      return affectedDates.includes(dateStr) && !absenceDates.has(dateStr);
    });
  }, [semaine, affectedDates, absenceDates]);

  // Calculer le nombre de jours masqués à cause d'absences
  const maskedAbsenceDays = useMemo(() => {
    const weekDates = getWeekDates(semaine);
    const allWeekDays = weekDates.slice(0, 5);
    
    return allWeekDays.filter((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return affectedDates.includes(dateStr) && absenceDates.has(dateStr);
    }).length;
  }, [semaine, affectedDates, absenceDates]);
  
  // Si aucun jour affecté OU tous les jours sont des absences
  if (weekDays.length === 0) {
    return (
      <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="text-center text-muted-foreground py-4">
          {maskedAbsenceDays > 0 ? (
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                ⚠️ {maskedAbsenceDays} jour(s) masqué(s)
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                {finisseurNom} est absent(e) les jours affectés cette semaine.
                <br />
                Aucune fiche de trajet n'est requise pour ces jours.
              </p>
            </div>
          ) : (
            <p className="text-sm">Aucun jour affecté cette semaine pour {finisseurNom}</p>
          )}
        </div>
      </Card>
    );
  }
  
  const [days, setDays] = useState<TransportFinisseurDay[]>(
    initialData?.days
      .filter((day) => affectedDates.includes(day.date)) // 🆕 Filtrer les jours selon les affectations actuelles
      .map((day) => ({
        ...day,
        conducteurMatinId: day.conducteurMatinId || finisseurId,
        conducteurSoirId: day.conducteurSoirId || finisseurId,
      })) ||
      weekDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return {
          date: dateStr,
          conducteurMatinId: finisseurId,
          conducteurSoirId: finisseurId,
          immatriculation: "",
          trajetPerso: trajetPersoByDate.get(dateStr) || false,
        };
      })
  );

  // 🆕 Synchroniser days avec les affectations
  useEffect(() => {
    setDays((prevDays) => {
      // Créer une map des jours existants par date pour préserver les données
      const existingDaysMap = new Map(
        prevDays.map(d => [d.date, d])
      );
      
      // Recréer la liste complète basée sur les jours affectés actuels
      const newDays: TransportFinisseurDay[] = weekDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        
        // Si ce jour existait déjà, on garde ses données (véhicule sélectionné, etc.)
        if (existingDaysMap.has(dateStr)) {
          return existingDaysMap.get(dateStr)!;
        }
        
        // Sinon, créer un nouveau jour vide
        return {
          date: dateStr,
          conducteurMatinId: finisseurId,
          conducteurSoirId: finisseurId,
          immatriculation: "",
          trajetPerso: trajetPersoByDate.get(dateStr) || false,
        };
      });
      
      // 🆕 GARDE: ne mettre à jour que si la structure a vraiment changé
      if (
        prevDays.length === newDays.length &&
        prevDays.every((d, i) => d.date === newDays[i]?.date)
      ) {
        return prevDays; // Pas de changement → pas de mise à jour
      }
      
      return newDays;
    });
  }, [weekDays, finisseurId]);

  // Propager les changements au parent (avec comparaison profonde)
  const daysRef = useRef<TransportFinisseurDay[]>([]);
  
  useEffect(() => {
    // Ne propager que si les données ont vraiment changé
    const hasChanged = days.length !== daysRef.current.length ||
      days.some((d, i) => {
        const prev = daysRef.current[i];
        return !prev ||
          d.date !== prev.date ||
          d.immatriculation !== prev.immatriculation ||
          d.conducteurMatinId !== prev.conducteurMatinId ||
          d.conducteurSoirId !== prev.conducteurSoirId;
      });
    
    if (hasChanged) {
      daysRef.current = days;
      onUpdate({ days });
    }
  }, [days, onUpdate]);

  const handleDayVehiculeChange = (dayIndex: number, immatriculation: string) => {
    setDays((prev) => {
      const updated = [...prev];
      
      // Mettre à jour le jour modifié
      updated[dayIndex] = { ...updated[dayIndex], immatriculation };
      
      // Propagation forward uniquement (vers les jours suivants)
      for (let i = dayIndex + 1; i < weekDays.length; i++) {
        // Utiliser l'état ORIGINAL (prev) pour les comparaisons
        const previousDayOriginalPlate = prev[i - 1].immatriculation;
        const currentDayOriginalPlate = prev[i].immatriculation;
        
        // Propager si le jour était vide OU avait la même plaque que le jour précédent (avant modification)
        if (!currentDayOriginalPlate || currentDayOriginalPlate === previousDayOriginalPlate) {
          updated[i] = { ...updated[i], immatriculation };
        } else {
          // Arrêter la propagation si on rencontre une "barrière" (plaque différente)
          break;
        }
      }
      
      return updated;
    });
  };

  console.log(`[TransportFinisseurAccordion] Rendering for ${finisseurNom}`, {
    weekDays: weekDays.length,
    daysState: days.length,
    affectedDates
  });

  return (
    <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h4 className="font-semibold text-blue-900 dark:text-blue-100">
          Fiche trajet - {finisseurNom}
        </h4>
      </div>

      <div className="space-y-3">
        {weekDays.map((date, index) => {
          // Vérifier que le day existe à cet index
          if (!days[index]) {
            console.warn(`[TransportFinisseurAccordion] Missing day data at index ${index} for ${finisseurNom}`);
            return null;
          }

          const dayName = format(date, "EEEE", { locale: fr });
          const dayDate = format(date, "d MMMM", { locale: fr });
          const dateStr = format(date, "yyyy-MM-dd");
          const isTrajetPerso = trajetPersoByDate.get(dateStr) || false;
          
          return (
            <Card key={dateStr} className="p-3 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium capitalize text-blue-900 dark:text-blue-100">
                    {dayName} {dayDate}
                  </Label>
                </div>
                
                <div className="space-y-2">
                  {isTrajetPerso ? (
                    // Affichage pour trajet personnel
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium">Véhicule personnel</p>
                          <p className="text-xs text-green-600 dark:text-green-400">Pas de véhicule d'entreprise requis</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Affichage normal : sélecteur de véhicule
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Véhicule
                      </Label>
                      <VehiculeSelectorFinisseurs
                        value={days[index]?.immatriculation || ""}
                        onChange={(value) => handleDayVehiculeChange(index, value)}
                        date={days[index]?.date || ""}
                        semaine={semaine}
                        excludeFinisseurId={finisseurId}
                        localVehiculeUsage={localVehiculeUsage}
                      />
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/50 p-2 rounded border border-blue-100 dark:border-blue-900">
                    <span className="font-medium">Conducteur :</span> {finisseurNom}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
