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
  nb_personnes_beton: string;
  nb_personnes_voile: string;
  nb_personnes_coffrage: string;
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
  
  // Créer une clé stable pour détecter les vrais changements
  const ratiosKey = useMemo(
    () => existingRatios.map(r => 
      `${r.date}:${r.m3_beton}:${r.ml_voile}:${r.m2_coffrage}:${r.nb_personnes_beton}:${r.nb_personnes_voile}:${r.nb_personnes_coffrage}:${r.meteo}:${r.observations}:${r.incident}`
    ).join('|'),
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
        nb_personnes_beton: existing?.nb_personnes_beton?.toString() ?? "",
        nb_personnes_voile: existing?.nb_personnes_voile?.toString() ?? "",
        nb_personnes_coffrage: existing?.nb_personnes_coffrage?.toString() ?? "",
        meteo: existing?.meteo ?? "",
        observations: existing?.observations ?? "",
        incident: existing?.incident ?? "",
      };
    });
    
    setFormData(newFormData);
  }, [weekDates, ratiosKey]);
  
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
  
  // Construire l'objet ratio à partir des données du jour
  const buildRatioPayload = (date: string, dayData: DayData): RatioJournalier => ({
    fiche_id: ficheId!,
    date,
    m3_beton: dayData.m3_beton ? parseFloat(dayData.m3_beton) : null,
    ml_voile: dayData.ml_voile ? parseFloat(dayData.ml_voile) : null,
    m2_coffrage: dayData.m2_coffrage ? parseFloat(dayData.m2_coffrage) : null,
    nb_personnes_beton: dayData.nb_personnes_beton ? parseInt(dayData.nb_personnes_beton) : null,
    nb_personnes_voile: dayData.nb_personnes_voile ? parseInt(dayData.nb_personnes_voile) : null,
    nb_personnes_coffrage: dayData.nb_personnes_coffrage ? parseInt(dayData.nb_personnes_coffrage) : null,
    meteo: dayData.meteo || null,
    observations: dayData.observations || null,
    incident: dayData.incident || null,
  });
  
  // Auto-save au blur
  const handleBlur = (date: string) => {
    if (!ficheId || isReadOnly) return;
    
    const dayData = formData[date];
    if (!dayData) return;
    
    // Ne sauvegarder que si au moins un champ est rempli
    const hasData = dayData.m3_beton || dayData.ml_voile || dayData.m2_coffrage || 
                    dayData.nb_personnes_beton || dayData.nb_personnes_voile || dayData.nb_personnes_coffrage ||
                    dayData.meteo || dayData.observations || dayData.incident;
    
    if (!hasData) return;
    
    saveRatio.mutate(buildRatioPayload(date, dayData));
  };
  
  // Formater la date pour affichage
  const formatDayLabel = (dateStr: string, dayIndex: number) => {
    const date = new Date(dateStr);
    return `${DAYS[dayIndex]} ${format(date, "dd/MM", { locale: fr })}`;
  };
  
  // Calculer les totaux et ratios
  const totals = useMemo(() => {
    const values = Object.values(formData);
    
    const totalBeton = values.reduce((sum, d) => sum + (parseFloat(d.m3_beton) || 0), 0);
    const totalVoile = values.reduce((sum, d) => sum + (parseFloat(d.ml_voile) || 0), 0);
    const totalCoffrage = values.reduce((sum, d) => sum + (parseFloat(d.m2_coffrage) || 0), 0);
    
    // Calculer la moyenne des personnes (seulement jours avec nb > 0)
    const betonDays = values.filter(d => parseInt(d.nb_personnes_beton) > 0);
    const voileDays = values.filter(d => parseInt(d.nb_personnes_voile) > 0);
    const coffrageDays = values.filter(d => parseInt(d.nb_personnes_coffrage) > 0);
    
    const avgBeton = betonDays.length > 0 
      ? betonDays.reduce((sum, d) => sum + parseInt(d.nb_personnes_beton), 0) / betonDays.length 
      : 0;
    const avgVoile = voileDays.length > 0 
      ? voileDays.reduce((sum, d) => sum + parseInt(d.nb_personnes_voile), 0) / voileDays.length 
      : 0;
    const avgCoffrage = coffrageDays.length > 0 
      ? coffrageDays.reduce((sum, d) => sum + parseInt(d.nb_personnes_coffrage), 0) / coffrageDays.length 
      : 0;
    
    return {
      totalBeton,
      totalVoile,
      totalCoffrage,
      ratioBeton: avgBeton > 0 ? totalBeton / avgBeton : null,
      ratioVoile: avgVoile > 0 ? totalVoile / avgVoile : null,
      ratioCoffrage: avgCoffrage > 0 ? totalCoffrage / avgCoffrage : null,
    };
  }, [formData]);
  
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
            <TableHead className="w-20">M³ béton</TableHead>
            <TableHead className="w-14">Nb</TableHead>
            <TableHead className="w-20">ML voile</TableHead>
            <TableHead className="w-14">Nb</TableHead>
            <TableHead className="w-20">M² coffrage</TableHead>
            <TableHead className="w-14">Nb</TableHead>
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
              nb_personnes_beton: "",
              nb_personnes_voile: "",
              nb_personnes_coffrage: "",
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
                    className="h-8 w-16 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="—"
                    value={dayData.nb_personnes_beton}
                    onChange={(e) => handleFieldChange(date, "nb_personnes_beton", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 w-12 text-sm text-center"
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
                    className="h-8 w-16 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="—"
                    value={dayData.nb_personnes_voile}
                    onChange={(e) => handleFieldChange(date, "nb_personnes_voile", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 w-12 text-sm text-center"
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
                    className="h-8 w-16 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="—"
                    value={dayData.nb_personnes_coffrage}
                    onChange={(e) => handleFieldChange(date, "nb_personnes_coffrage", e.target.value)}
                    onBlur={() => handleBlur(date)}
                    disabled={isReadOnly}
                    className="h-8 w-12 text-sm text-center"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={dayData.meteo}
                    onValueChange={(value) => {
                      handleFieldChange(date, "meteo", value);
                      // Auto-save immédiat pour le select
                      if (ficheId && !isReadOnly) {
                        const updatedDayData = { ...dayData, meteo: value };
                        saveRatio.mutate(buildRatioPayload(date, updatedDayData));
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
          {/* Ligne des totaux */}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="text-sm">Total</TableCell>
            <TableCell className="text-sm">{totals.totalBeton.toFixed(2)} m³</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-sm">{totals.totalVoile.toFixed(2)} ml</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-sm">{totals.totalCoffrage.toFixed(2)} m²</TableCell>
            <TableCell colSpan={4}></TableCell>
          </TableRow>
          {/* Ligne des ratios par personne */}
          <TableRow className="bg-primary/10 font-semibold">
            <TableCell className="text-sm">Ratio/pers</TableCell>
            <TableCell className="text-sm text-primary">
              {totals.ratioBeton !== null ? `${totals.ratioBeton.toFixed(2)} m³/p` : "—"}
            </TableCell>
            <TableCell></TableCell>
            <TableCell className="text-sm text-primary">
              {totals.ratioVoile !== null ? `${totals.ratioVoile.toFixed(2)} ml/p` : "—"}
            </TableCell>
            <TableCell></TableCell>
            <TableCell className="text-sm text-primary">
              {totals.ratioCoffrage !== null ? `${totals.ratioCoffrage.toFixed(2)} m²/p` : "—"}
            </TableCell>
            <TableCell colSpan={4}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
