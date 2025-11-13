import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { format, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { TransportDayV2 } from "@/types/transport";
import { TransportDayAccordion } from "./TransportDayAccordion";
import { useSaveTransportV2 } from "@/hooks/useSaveTransportV2";
import { useTransportDataV2 } from "@/hooks/useTransportDataV2";
import { useAutoSaveTransportV2 } from "@/hooks/useAutoSaveTransportV2";
import { useCopyPreviousWeekTransport } from "@/hooks/useCopyPreviousWeekTransport";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface TransportSheetV2Props {
  selectedWeek: Date;
  selectedWeekString: string;
  chantierId: string | null;
  chefId: string;
  ficheId?: string | null;
  conducteurId?: string;
  isReadOnly?: boolean;
}

export interface TransportSheetV2Ref {
  resetTransportData: () => void;
}

export const TransportSheetV2 = forwardRef<TransportSheetV2Ref, TransportSheetV2Props>(({
  selectedWeek,
  selectedWeekString,
  chantierId,
  chefId,
  ficheId,
  conducteurId,
  isReadOnly = false,
}, ref) => {
  const [transportDays, setTransportDays] = useState<TransportDayV2[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [openDay, setOpenDay] = useState<string>("");
  const openDayRef = useRef<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialDataSource, setInitialDataSource] = useState<'existing' | 'copied' | null>(null);
  
  const [hasCopied, setHasCopied] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializedForWeek = useRef<Record<string, boolean>>({});
  
  const queryClient = useQueryClient();
  const saveTransport = useSaveTransportV2();
  const autoSave = useAutoSaveTransportV2();
  const { data: existingTransport, isLoading } = useTransportDataV2(ficheId || null, conducteurId);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isDirty = useRef<boolean>(false);
  
  // Fonction pour gérer l'ouverture/fermeture de l'accordéon
  const handleOpenDayChange = (val: string | undefined) => {
    const normalized = val ?? "";
    openDayRef.current = normalized;
    setOpenDay(normalized);
  };
  // Exposer la méthode reset pour le debug admin
  useImperativeHandle(ref, () => ({
    resetTransportData: () => {
      console.log("[TransportSheetV2] Resetting transport data");
      // Annuler toute sauvegarde en attente
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      isDirty.current = false;

      setTransportDays([]);
      setHasLoadedData(false);
      setInitialDataSource(null);
      setHasCopied(false);
      setIsInitialized(false);
      setOpenDay("");
      initializedForWeek.current = {};
      
      // Invalider les queries pour forcer un rechargement
      queryClient.invalidateQueries({ queryKey: ["transport-v2"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
    }
  }), [queryClient]);

  // Vérifier si on a des données existantes (jours avec au moins 1 véhicule non vide)
  const hasExistingData = existingTransport && existingTransport.days.length > 0 && 
    existingTransport.days.some(day => day.vehicules.some(v => v.immatriculation));

  // Hook pour copier les données de la semaine précédente si besoin
  const { hasPreviousData, copyFromPrevious } = useCopyPreviousWeekTransport({
    currentWeek: selectedWeekString,
    chefId,
    chantierId,
    currentFicheId: ficheId,
    hasExistingData: hasExistingData || hasCopied,
    onDataLoaded: (copiedDays) => {
      console.log("[TransportSheetV2] Applying copied data from previous week");
      setTransportDays(copiedDays);
      setHasLoadedData(true);
      setInitialDataSource('copied');
      setHasCopied(true);
    },
  });

  // Gérer le clic sur le bouton "Copier depuis S-1"
  const handleCopyFromPrevious = () => {
    if (copyFromPrevious) {
      copyFromPrevious();
    }
  };


  // Sauvegarder immédiatement quand l'accordéon se ferme
  const previousOpenDay = useRef<string>("");
  
  useEffect(() => {
    // Détecter la fermeture : openDay passe d'une date à undefined
    if (previousOpenDay.current && !openDay && isDirty.current) {
      console.log("[TransportSheetV2] Accordion closing, saving immediately");
      
      // Annuler le debounce en cours
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      
      // Sauvegarder immédiatement
      setIsSaving(true);
      autoSave.mutateAsync({
        ficheId: ficheId || "",
        semaine: selectedWeekString,
        chantierId,
        chefId,
        days: transportDays,
        isDirty: true,
      }).then((result) => {
        isDirty.current = false;
        console.log("[TransportSheetV2] Data saved on accordion close");
        // Invalider SEULEMENT si des données ont été sauvegardées
        if (result?.saved) {
          queryClient.invalidateQueries({ queryKey: ["transport-v2"] });
          queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
        }
      }).catch(err => {
        console.error("[TransportSheetV2] Error saving on close:", err);
      }).finally(() => {
        setIsSaving(false);
      });
    }
    
    previousOpenDay.current = openDay;
  }, [openDay, transportDays, selectedWeekString, chantierId, chefId, ficheId, autoSave]);

  // Réinitialiser le flag de copie lors du changement de semaine
  useEffect(() => {
    setHasCopied(false);
    setInitialDataSource(null);
    setIsInitialized(false);
  }, [selectedWeekString]);


  // Initialisation idempotente des 5 jours de la semaine
  useEffect(() => {
    // Ne pas réinitialiser si les données proviennent de la copie
    if (initialDataSource === 'copied') return;

    // Attendre que le fetch soit complet si on a un ficheId
    if (isLoading && ficheId) return;

    // Si cette semaine a déjà été initialisée, ne pas réinitialiser
    if (initializedForWeek.current[selectedWeekString]) return;

    // Toujours générer les 5 jours de la semaine
    const allDays: TransportDayV2[] = [];
    for (let i = 0; i < 5; i++) {
      const currentDate = addDays(selectedWeek, i);
      const dateString = format(currentDate, "yyyy-MM-dd");
      
      // Chercher si ce jour existe déjà dans les données chargées
      const existingDay = existingTransport?.days.find(d => d.date === dateString);
      
      allDays.push({
        date: dateString,
        vehicules: existingDay 
          ? existingDay.vehicules 
          : [{
              id: crypto.randomUUID(),
              immatriculation: "",
              conducteurMatinId: "",
              conducteurMatinNom: "",
              conducteurSoirId: "",
              conducteurSoirNom: "",
            }],
      });
    }
    
    setTransportDays(allDays);
    setHasLoadedData(true);
    setInitialDataSource(existingTransport ? 'existing' : null);
    setIsInitialized(true);
    initializedForWeek.current[selectedWeekString] = true;
  }, [selectedWeek, selectedWeekString, existingTransport, isLoading, initialDataSource, ficheId]);

  // Auto-save immédiat après copie depuis semaine précédente (seulement si l'utilisateur a modifié ensuite)
  useEffect(() => {
    if (initialDataSource === 'copied' && hasLoadedData && transportDays.length > 0) {
      if (!isDirty.current) return; // ne pas auto-sauvegarder juste après une copie
      const timer = setTimeout(async () => {
        console.log("[TransportSheetV2] Auto-saving copied data");
        setIsSaving(true);
        try {
          await autoSave.mutateAsync({
            ficheId: ficheId || "",
            semaine: selectedWeekString,
            chantierId,
            chefId,
            days: transportDays,
            isDirty: isDirty.current,
          });
        } finally {
          setIsSaving(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [initialDataSource, hasLoadedData, transportDays.length]);

  // Auto-save avec debounce pour les modifications
  useEffect(() => {
    if (!hasLoadedData) return;
    if (initialDataSource === 'copied') return; // Déjà sauvegardé par l'effet ci-dessus

    const hasData = transportDays.some((day) => day.vehicules.length > 0);
    if (!hasData) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const result = await autoSave.mutateAsync({
          ficheId: ficheId || "",
          semaine: selectedWeekString,
          chantierId,
          chefId,
          days: transportDays,
        });
        // Invalider SEULEMENT si des données ont été sauvegardées
        if (result?.saved) {
          queryClient.invalidateQueries({ queryKey: ["transport-v2"] });
          queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
        }
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [transportDays, hasLoadedData, selectedWeekString, chantierId, chefId, ficheId, autoSave, initialDataSource]);

  const updateDay = (date: string, updatedDay: TransportDayV2) => {
    isDirty.current = true;
    setTransportDays((prev) =>
      prev.map((day) => (day.date === date ? updatedDay : day))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveTransport.mutateAsync({
        ficheId: ficheId || "",
        semaine: selectedWeekString,
        chantierId,
        chefId,
        days: transportDays,
      });
      
      // Invalider les queries pour actualiser isTransportComplete immédiatement
      queryClient.invalidateQueries({ queryKey: ["transport-v2"] });
      queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      
      // La fiche a été validée manuellement: considérer l'état comme non modifié
      isDirty.current = false;
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Réagir à l'évènement global de purge pour réinitialiser la feuille
  useEffect(() => {
    const handler = (e: any) => {
      const purgedWeek = e?.detail?.semaine;
      if (purgedWeek === selectedWeekString) {
        // Annuler tout debounce en cours et désactiver l'auto-save
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        isDirty.current = false;

        // Recréer 5 jours vides
        const emptyDays: TransportDayV2[] = [];
        for (let i = 0; i < 5; i++) {
          const currentDate = addDays(selectedWeek, i);
          const dateString = format(currentDate, "yyyy-MM-dd");
          emptyDays.push({
            date: dateString,
            vehicules: [{
              id: crypto.randomUUID(),
              immatriculation: "",
              conducteurMatinId: "",
              conducteurMatinNom: "",
              conducteurSoirId: "",
              conducteurSoirNom: "",
            }],
          });
        }
        setTransportDays(emptyDays);
        setHasLoadedData(true);
        setInitialDataSource(null);
        setHasCopied(false);
        setIsInitialized(true);
        setOpenDay("");
        initializedForWeek.current = {};

        // Recharger les données depuis la base (vide après purge)
        queryClient.invalidateQueries({ queryKey: ["transport-v2"] });
        queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      }
    };

    window.addEventListener('transport-purged', handler as EventListener);
    return () => window.removeEventListener('transport-purged', handler as EventListener);
  }, [selectedWeek, selectedWeekString, queryClient]);

  // Vérifier que tous les jours ont au moins 1 véhicule complet
  const isComplete = transportDays.every((day) => {
    if (day.vehicules.length === 0) return false;
    return day.vehicules.every(
      (v) => v.immatriculation && v.conducteurMatinId && v.conducteurSoirId
    );
  });

  const totalVehicules = transportDays.reduce((sum, day) => sum + day.vehicules.length, 0);
  const completedVehicules = transportDays.reduce(
    (sum, day) =>
      sum +
      day.vehicules.filter((v) => v.immatriculation && v.conducteurMatinId && v.conducteurSoirId)
        .length,
    0
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Fiche de Trajet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {totalVehicules === 0
            ? "Aucun véhicule ajouté"
            : `${completedVehicules}/${totalVehicules} véhicule(s) complet(s)`}
        </p>
      </div>

      {/* Bouton pour copier depuis la semaine précédente */}
      {hasPreviousData && !hasExistingData && !hasCopied && (
        <div className="mb-4">
          <Button 
            onClick={handleCopyFromPrevious}
            variant="outline"
            className="w-full"
          >
            📋 Copier les données depuis la semaine précédente
          </Button>
        </div>
      )}

      {hasPreviousData && initialDataSource === 'copied' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ Données copiées depuis la semaine précédente. Modifiez si nécessaire.
          </p>
        </div>
      )}


      <Accordion type="single" collapsible value={openDay} onValueChange={handleOpenDayChange}>
        {transportDays.map((day) => (
          <TransportDayAccordion
            key={day.date}
            day={day}
            chantierId={chantierId}
            semaine={selectedWeekString}
            chefId={chefId}
            conducteurId={conducteurId}
            onUpdate={(updatedDay) => updateDay(day.date, updatedDay)}
            isReadOnly={isReadOnly}
          />
        ))}
      </Accordion>
    </Card>
  );
});

TransportSheetV2.displayName = 'TransportSheetV2';
