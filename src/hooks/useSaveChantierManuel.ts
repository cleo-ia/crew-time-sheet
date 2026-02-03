import { useState } from "react";
import { useSaveFiche, type EmployeeData } from "@/hooks/useSaveFiche";
import { useSaveTransportFinisseur } from "@/hooks/useSaveTransportFinisseur";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";
import type { TransportFinisseurDay } from "@/types/transport";

interface TimeEntry {
  employeeId: string;
  employeeName: string;
  days: Record<string, {
    hours: number;
    absent: boolean;
    panierRepas: boolean;
    repasType?: "PANIER" | "RESTO" | null;
    trajet: boolean;
    trajetPerso: boolean;
    codeTrajet?: string | null;
    heuresIntemperie?: number;
    chantierCode?: string | null;
    chantierVille?: string | null;
    commentaire?: string;
  }>;
}

interface Affectation {
  finisseur_id: string;
  date: string;
  chantier_id: string;
}

interface UseSaveChantierManuelParams {
  chantierId: string;
  selectedWeek: string;
  conducteurId: string;
  chantierFinisseurs: Array<{ id: string; nom: string; prenom: string }>;
  timeEntries: TimeEntry[];
  transportFinisseurData: Record<string, { ficheId?: string; days: TransportFinisseurDay[] }>;
  affectationsJours?: Affectation[];
}

export const useSaveChantierManuel = () => {
  const [savingChantier, setSavingChantier] = useState<string | null>(null);
  const saveFiche = useSaveFiche();
  const saveTransportFinisseur = useSaveTransportFinisseur();
  const { toast } = useToast();

  const saveChantier = async (params: UseSaveChantierManuelParams) => {
    const { 
      chantierId, 
      selectedWeek, 
      conducteurId, 
      chantierFinisseurs, 
      timeEntries,
      transportFinisseurData,
      affectationsJours
    } = params;

    setSavingChantier(chantierId);

    try {
      const monday = parseISOWeek(selectedWeek);
      const days = [0, 1, 2, 3, 4].map((d) => format(addDays(monday, d), "yyyy-MM-dd"));
      const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;

      // 1. Filtrer les entries pour ce chantier
      const chantierEntries = timeEntries.filter(e =>
        chantierFinisseurs.some(f => f.id === e.employeeId)
      );

      if (chantierEntries.length === 0) {
        toast({
          variant: "destructive",
          title: "Aucune donnée à sauvegarder",
          description: "Aucun finisseur trouvé pour ce chantier.",
        });
        setSavingChantier(null);
        return false;
      }

      // 2. Préparer les données pour saveFiche
      const employeesData: EmployeeData[] = chantierEntries.map((entry) => {
        // Récupérer les dates affectées pour cet employé
        const employeeAffectedDates = new Set(
          affectationsJours
            ?.filter(aff => aff.finisseur_id === entry.employeeId)
            ?.map(aff => aff.date) || []
        );
        
        // Construire dailyHours uniquement pour les jours affectés
        const dailyHours = days
          .map((date, index) => {
            // Si pas d'affectation pour ce jour, ne pas l'inclure
            if (employeeAffectedDates.size > 0 && !employeeAffectedDates.has(date)) {
              return null;
            }
            
            const dayName = dayNames[index];
            const dayData = entry.days[dayName];
            
            if (!dayData) return null;
            
            return {
              date,
              heures: dayData.absent ? 0 : (dayData.hours ?? 0),
              pause_minutes: 0,
              HNORM: dayData.absent ? 0 : (dayData.hours ?? 0),
              HI: dayData.heuresIntemperie ?? 0,
              T: (dayData.codeTrajet === 'GD' || dayData.codeTrajet === 'T_PERSO') ? 0 : (dayData.trajet ? 1 : 0),
              PA: dayData.panierRepas ?? false,
              trajet_perso: dayData.trajetPerso ?? false,
              code_trajet: dayData.codeTrajet || (dayData.trajet ? "A_COMPLETER" : null),
              code_chantier_du_jour: dayData.chantierCode || null,
              ville_du_jour: dayData.chantierVille || null,
              commentaire: dayData.commentaire || null,
              repas_type: dayData.repasType ?? (dayData.panierRepas ? "PANIER" : null),
            };
          })
          .filter((day): day is NonNullable<typeof day> => day !== null);
        
        return {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          dailyHours,
        };
      });

      // 3. Sauvegarder les fiches d'heures
      console.log(`[SaveChantierManuel] Saving ${employeesData.length} employees for chantier ${chantierId}`);
      
      await saveFiche.mutateAsync({
        semaine: selectedWeek,
        chantierId: chantierId !== "sans-chantier" ? chantierId : null,
        employeesData,
        statut: "BROUILLON",
        userId: conducteurId,
      });

      // 4. Sauvegarder les fiches trajet finisseurs
      let transportSaved = 0;
      for (const finisseur of chantierFinisseurs) {
        const transportData = transportFinisseurData[finisseur.id];
        if (transportData?.days && transportData.days.length > 0) {
          try {
            await saveTransportFinisseur.mutateAsync({
              ficheId: transportData.ficheId,
              finisseurId: finisseur.id,
              conducteurId,
              semaine: selectedWeek,
              chantierId: chantierId !== "sans-chantier" ? chantierId : null,
              days: transportData.days.map((d) => ({
                date: d.date,
                immatriculation: d.immatriculation || null,
                conducteurMatinId: d.conducteurMatinId || finisseur.id,
                conducteurSoirId: d.conducteurSoirId || finisseur.id,
              })),
            });
            transportSaved++;
          } catch (err) {
            console.warn(`[SaveChantierManuel] Erreur trajet finisseur ${finisseur.id}:`, err);
          }
        }
      }

      console.log(`[SaveChantierManuel] ✅ Saved ${employeesData.length} employees + ${transportSaved} transport fiches`);
      
      toast({
        title: "✅ Fiche enregistrée",
        description: `Heures et trajets sauvegardés pour ${employeesData.length} finisseur(s).`,
      });

      setSavingChantier(null);
      return true;
    } catch (error) {
      console.error("[SaveChantierManuel] Error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de la sauvegarde. Veuillez réessayer.",
      });
      setSavingChantier(null);
      return false;
    }
  };

  return {
    saveChantier,
    savingChantier,
    isSaving: savingChantier !== null,
  };
};
