import { useState, useEffect, useRef } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConducteurCombobox } from "@/components/transport/ConducteurCombobox";
import { VehiculeCombobox } from "@/components/transport/VehiculeCombobox";
import { TransportDay } from "@/types/transport";
import { useSaveTransport } from "@/hooks/useSaveTransport";
import { useTransportData } from "@/hooks/useTransportData";
import { useAutoSaveTransport } from "@/hooks/useAutoSaveTransport";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { useMaconsAllChantiersByChef } from "@/hooks/useMaconsAllChantiersByChef";

interface TransportSheetProps {
  selectedWeek: Date;
  selectedWeekString: string;
  chantierId: string;
  chefId: string;
  ficheId?: string | null;
}

export const TransportSheet = ({ selectedWeek, selectedWeekString, chantierId, chefId, ficheId }: TransportSheetProps) => {
  const [transportDays, setTransportDays] = useState<TransportDay[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const saveTransport = useSaveTransport();
  const autoSave = useAutoSaveTransport();
  const { data: existingTransport } = useTransportData(ficheId || null);
  const { data: macons = [] } = useMaconsByChantier(chantierId, selectedWeekString, chefId);
  const { isMultiChantier, allMacons } = useMaconsAllChantiersByChef(chefId, selectedWeekString);
  const maconsForCombobox = isMultiChantier ? allMacons : macons;
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Générer les 5 jours de la semaine (lundi à vendredi) si pas de données existantes OU si fiche vide
  useEffect(() => {
    if (!existingTransport || (existingTransport && existingTransport.days.length === 0)) {
      // selectedWeek est déjà le lundi de la semaine ISO, pas besoin de startOfWeek
      const weekStart = selectedWeek;
      const days: TransportDay[] = [];

      for (let i = 0; i < 5; i++) {
        const currentDate = addDays(weekStart, i);
        days.push({
          date: format(currentDate, "yyyy-MM-dd"),
          conducteurAllerId: "",
          conducteurAllerNom: "",
          conducteurRetourId: "",
          conducteurRetourNom: "",
          immatriculation: "",
        });
      }

      setTransportDays(days);
      setHasLoadedData(true);
    }
  }, [selectedWeek, existingTransport]);

  // Charger les données existantes seulement si elles contiennent des jours
  useEffect(() => {
    if (existingTransport && existingTransport.days.length > 0) {
      setTransportDays(existingTransport.days);
      setHasLoadedData(true);
    }
  }, [existingTransport]);

  // Auto-réparation des dates erronées existantes
  useEffect(() => {
    if (!existingTransport || existingTransport.days.length !== 5) return;

    const expectedDates = Array.from({ length: 5 }, (_, i) =>
      format(addDays(selectedWeek, i), "yyyy-MM-dd")
    );

    const currentDates = existingTransport.days.map((d) => d.date);
    const mismatch = expectedDates.some((d, i) => d !== currentDates[i]);

    if (mismatch) {
      const corrected = existingTransport.days.map((day, i) => ({
        ...day,
        date: expectedDates[i],
      }));

      setTransportDays(corrected);

      (async () => {
        try {
          setIsSaving(true);
          await autoSave.mutateAsync({
            ficheId: ficheId || "",
            semaine: selectedWeekString,
            chantierId,
            chefId,
            days: corrected,
          });
        } finally {
          setIsSaving(false);
        }
      })();
    }
  }, [existingTransport, selectedWeek, selectedWeekString, chantierId, chefId, ficheId, autoSave]);

  // Auto-save avec debounce
  useEffect(() => {
    // Ne pas auto-sauvegarder tant que les données ne sont pas chargées
    if (!hasLoadedData) return;

    // Ne pas auto-sauvegarder si toutes les données sont vides
    const hasData = transportDays.some(day => 
      day.conducteurAllerId || day.conducteurRetourId || day.immatriculation
    );

    if (!hasData) return;

    // Nettoyer le timer précédent
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Démarrer un nouveau timer
    debounceTimer.current = setTimeout(async () => {
      setIsSaving(true);
      const semaine = selectedWeekString;
      
      try {
        await autoSave.mutateAsync({
          ficheId: ficheId || "",
          semaine,
          chantierId,
          chefId,
          days: transportDays,
        });
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [transportDays, hasLoadedData, selectedWeek, chantierId, chefId, ficheId, autoSave]);

  const updateDay = (index: number, field: keyof TransportDay, value: string) => {
    setTransportDays((prev) =>
      prev.map((day, i) => (i === index ? { ...day, [field]: value } : day))
    );
  };


  const handleSave = async () => {
    const semaine = selectedWeekString;

    await saveTransport.mutateAsync({
      ficheId: ficheId || "",
      semaine,
      chantierId,
      chefId,
      days: transportDays,
    });
  };

  const isComplete = transportDays.every(
    (day) =>
      day.conducteurAllerId &&
      day.conducteurRetourId &&
      day.immatriculation.trim() !== ""
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Fiche de Trajet</h2>
        <Button onClick={handleSave} disabled={!isComplete || saveTransport.isPending}>
          {saveTransport.isPending ? "Enregistrement..." : "Valider la fiche"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jour</TableHead>
            <TableHead>Conducteur Aller</TableHead>
            <TableHead>Conducteur Retour</TableHead>
            <TableHead>Immatriculation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transportDays.map((day, index) => (
            <TableRow key={day.date}>
              <TableCell className="font-medium">
                {format(new Date(day.date), "EEEE dd/MM", { locale: fr })}
              </TableCell>
              <TableCell>
                <ConducteurCombobox
                  macons={maconsForCombobox}
                  date={day.date}
                  value={day.conducteurAllerId}
                  onChange={(value) => updateDay(index, "conducteurAllerId", value)}
                  currentChantierId={chantierId}
                />
              </TableCell>
              <TableCell>
                <ConducteurCombobox
                  macons={maconsForCombobox}
                  date={day.date}
                  value={day.conducteurRetourId}
                  onChange={(value) => updateDay(index, "conducteurRetourId", value)}
                  currentChantierId={chantierId}
                />
              </TableCell>
              <TableCell>
                <VehiculeCombobox
                  value={day.immatriculation}
                  onChange={(value) => updateDay(index, "immatriculation", value)}
                  date={day.date}
                  semaine={selectedWeekString}
                  currentChantierId={chantierId}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
