import { useState, useEffect, useMemo } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { parseISOWeek } from "@/lib/weekUtils";
import { useRatiosJournaliers, useSaveRatioJournalier, type RatioJournalier } from "@/hooks/useRatiosJournaliers";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const METEO_OPTIONS = [
  { value: "ensoleille", label: "☀️ Ensoleillé" },
  { value: "nuageux", label: "⛅ Nuageux" },
  { value: "pluie_legere", label: "🌧️ Pluie légère" },
  { value: "pluie_forte", label: "🌧️ Pluie forte" },
  { value: "neige", label: "❄️ Neige" },
  { value: "gel", label: "🥶 Gel" },
  { value: "vent_fort", label: "💨 Vent fort" },
];

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

interface RatioGlobalSheetProps {
  selectedWeek: string;
  chantierId: string | null;
  ficheId: string | null;
  isReadOnly?: boolean;
}

interface DayData {
  date: string;
  m3_beton: string;
  ml_voile: string;
  m2_coffrage: string;
  meteo: string;
  observations: string;
  incident: string;
}

export const RatioGlobalSheet = ({ 
  selectedWeek, 
  chantierId, 
  ficheId, 
  isReadOnly = false 
}: RatioGlobalSheetProps) => {
  const { data: existingRatios = [], isLoading } = useRatiosJournaliers(ficheId);
  const saveRatio = useSaveRatioJournalier();
  
  // Générer les dates de la semaine
  const weekDates = useMemo(() => {
    const monday = parseISOWeek(selectedWeek);
    return DAYS.map((_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  }, [selectedWeek]);
  
  // État local pour les données du formulaire
  const [formData, setFormData] = useState<Record<string, DayData>>({});
  
  // Créer une clé stable pour détecter les vrais changements (évite boucle infinie)
  const ratiosKey = useMemo(
    () => existingRatios.map(r => `${r.date}:${r.m3_beton}:${r.ml_voile}:${r.m2_coffrage}:${r.meteo}:${r.observations}:${r.incident}`).join('|'),
    [existingRatios]
  );
  
  // Initialiser les données du formulaire
  useEffect(() => {
    const newFormData: Record<string, DayData> = {};
    
    weekDates.forEach((date) => {
      const existing = existingRatios.find(r => r.date === date);
      newFormData[date] = {
        date,
        m3_beton: existing?.m3_beton?.toString() ?? "",
        ml_voile: existing?.ml_voile?.toString() ?? "",
        m2_coffrage: existing?.m2_coffrage?.toString() ?? "",
        meteo: existing?.meteo ?? "",
        observations: existing?.observations ?? "",
        incident: existing?.incident ?? "",
      };
    });
    
    setFormData(newFormData);
  }, [weekDates, ratiosKey]); // Utiliser la clé stable au lieu de existingRatios
  
  // Fonction pour sauvegarder un champ
  const handleFieldChange = (date: string, field: keyof DayData, value: string) => {
    if (!ficheId || isReadOnly) return;
    
    setFormData(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      }
    }));
  };
  
  // Auto-save au blur
  const handleBlur = (date: string) => {
    if (!ficheId || isReadOnly) return;
    
    const dayData = formData[date];
    if (!dayData) return;
    
    // Ne sauvegarder que si au moins un champ est rempli
    const hasData = dayData.m3_beton || dayData.ml_voile || dayData.m2_coffrage || 
                    dayData.meteo || dayData.observations || dayData.incident;
    
    if (!hasData) return;
    
    saveRatio.mutate({
      fiche_id: ficheId,
      date,
      m3_beton: dayData.m3_beton ? parseFloat(dayData.m3_beton) : null,
      ml_voile: dayData.ml_voile ? parseFloat(dayData.ml_voile) : null,
      m2_coffrage: dayData.m2_coffrage ? parseFloat(dayData.m2_coffrage) : null,
      meteo: dayData.meteo || null,
      observations: dayData.observations || null,
      incident: dayData.incident || null,
    });
  };
  
  // Formater la date pour affichage
  const formatDayLabel = (dateStr: string, dayIndex: number) => {
    const date = new Date(dateStr);
    return `${DAYS[dayIndex]} ${format(date, "dd/MM", { locale: fr })}`;
  };
  
  if (!ficheId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Sélectionnez un chantier et une semaine pour afficher les ratios</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Chargement...</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Jour</TableHead>
            <TableHead className="w-24">M³ béton</TableHead>
            <TableHead className="w-24">ML voile</TableHead>
            <TableHead className="w-24">M² coffrage</TableHead>
            <TableHead className="w-36">Météo</TableHead>
            <TableHead className="min-w-[150px]">Observations</TableHead>
            <TableHead className="min-w-[150px]">Incident</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekDates.map((date, index) => {
            const dayData = formData[date] || {
              date,
              m3_beton: "",
              ml_voile: "",
              m2_coffrage: "",
              meteo: "",
              observations: "",
              incident: "",
            };
            
            return (
              <TableRow key={date}>
                <TableCell className="font-medium text-sm">
                  {formatDayLabel(date, index)}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="—"
                    value={dayData.m3_beton}
                    onChange={(e) => handleFieldChange(date, "m3_beton", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 w-20 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="—"
                    value={dayData.ml_voile}
                    onChange={(e) => handleFieldChange(date, "ml_voile", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 w-20 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="—"
                    value={dayData.m2_coffrage}
                    onChange={(e) => handleFieldChange(date, "m2_coffrage", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 w-20 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={dayData.meteo}
                    onValueChange={(value) => {
                      handleFieldChange(date, "meteo", value);
                      // Auto-save immédiat pour le select
                      if (ficheId && !isReadOnly) {
                        saveRatio.mutate({
                          fiche_id: ficheId,
                          date,
                          m3_beton: dayData.m3_beton ? parseFloat(dayData.m3_beton) : null,
                          ml_voile: dayData.ml_voile ? parseFloat(dayData.ml_voile) : null,
                          m2_coffrage: dayData.m2_coffrage ? parseFloat(dayData.m2_coffrage) : null,
                          meteo: value || null,
                          observations: dayData.observations || null,
                          incident: dayData.incident || null,
                        });
                      }
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="h-8 w-32 text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {METEO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Textarea
                    placeholder="Observations..."
                    value={dayData.observations}
                    onChange={(e) => handleFieldChange(date, "observations", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 min-h-8 text-sm resize-none"
                    rows={1}
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    placeholder="Incident..."
                    value={dayData.incident}
                    onChange={(e) => handleFieldChange(date, "incident", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 min-h-8 text-sm resize-none"
                    rows={1}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
