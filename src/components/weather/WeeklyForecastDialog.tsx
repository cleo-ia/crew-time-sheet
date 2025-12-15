import { useRef, useState } from "react";
import { format, parseISO, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { Cloud, Download, AlertTriangle, Loader2, Sun, CloudSun, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChantiers } from "@/hooks/useChantiers";
import { useWeeklyForecast, ChantierForecast, DailyForecast } from "@/hooks/useWeeklyForecast";
import { getWeatherInfo } from "@/lib/weatherUtils";
import { generateWeatherPdf } from "@/lib/weatherPdfExport";

// Légende des icônes météo (icônes uniques)
const weatherIconsLegend = [
  { icon: Sun, label: "Ensoleillé" },
  { icon: CloudSun, label: "Partiellement nuageux" },
  { icon: Cloud, label: "Couvert" },
  { icon: CloudFog, label: "Brouillard" },
  { icon: CloudDrizzle, label: "Bruine" },
  { icon: CloudRain, label: "Pluie" },
  { icon: CloudSnow, label: "Neige" },
  { icon: Snowflake, label: "Grains de neige" },
  { icon: CloudLightning, label: "Orage" },
];

interface WeeklyForecastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPrecipProbabilityColor(prob: number): string {
  if (prob > 60) return "text-red-500";
  if (prob > 30) return "text-orange-500";
  return "text-green-500";
}

function WeatherIcon({ code }: { code: number }) {
  const info = getWeatherInfo(code);
  const IconComponent = info.icon;
  return <IconComponent className="h-5 w-5 text-muted-foreground" />;
}

function ForecastCell({ forecast }: { forecast: DailyForecast }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-1 text-center min-w-[85px]">
      <WeatherIcon code={forecast.weatherCode} />
      <span className="text-xs font-semibold">
        {forecast.temperatureMin}° / {forecast.temperatureMax}°
      </span>
      <span className="text-[10px] text-muted-foreground">
        Vent: {forecast.windGustsMax} km/h
      </span>
      <span className={`text-[10px] font-medium ${getPrecipProbabilityColor(forecast.precipitationProbabilityMax)}`}>
        {forecast.precipitationProbabilityMax}%
      </span>
      <span className="text-[10px] text-blue-500">
        {forecast.precipitationSum} mm
      </span>
    </div>
  );
}

function ChantierRow({ chantier }: { chantier: ChantierForecast }) {
  if (chantier.error) {
    return (
      <tr className="border-b">
        <td className="p-2">
          <div className="font-medium text-sm">{chantier.chantierNom}</div>
          <div className="text-xs text-muted-foreground">{chantier.ville || "-"}</div>
        </td>
        <td className="p-2 text-xs text-muted-foreground">{chantier.codeChantier || "-"}</td>
        <td className="p-2 text-xs text-muted-foreground">{chantier.conducteurNom || "-"}</td>
        <td colSpan={5} className="p-2">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            {chantier.error}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="px-1.5 py-2 max-w-[110px]">
        <div className="font-medium text-sm truncate">{chantier.chantierNom}</div>
        <div className="text-xs text-muted-foreground truncate">{chantier.ville}</div>
      </td>
      <td className="px-1.5 py-2 text-xs text-muted-foreground">{chantier.codeChantier || "-"}</td>
      <td className="px-1.5 py-2 text-xs text-muted-foreground max-w-[90px] truncate">{chantier.conducteurNom || "-"}</td>
      {chantier.forecasts.map((forecast, idx) => (
        <td key={idx} className="p-0 border-l">
          <ForecastCell forecast={forecast} />
        </td>
      ))}
    </tr>
  );
}

export function WeeklyForecastDialog({ open, onOpenChange }: WeeklyForecastDialogProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { data: chantiers } = useChantiers();
  const { data: forecasts, isLoading, error } = useWeeklyForecast(chantiers, open);

  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  const weekLabel = `S${format(nextWeekStart, "ww", { locale: fr })} - ${format(nextWeekStart, "dd MMMM yyyy", { locale: fr })}`;

  const handleDownloadPdf = async () => {
    if (tableRef.current && forecasts) {
      setIsGeneratingPdf(true);
      try {
        await generateWeatherPdf(tableRef.current, weekLabel);
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  // Get dates from first forecast with data
  const firstWithData = forecasts?.find(f => f.forecasts.length > 0);
  const dates = firstWithData?.forecasts.map(f => f.date) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Prévisions Météo Semaine - {weekLabel}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!forecasts || forecasts.length === 0 || isGeneratingPdf}
              className="mr-10"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGeneratingPdf ? "Génération..." : "Télécharger PDF"}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement des prévisions...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-destructive">
              <AlertTriangle className="h-6 w-6 mr-2" />
              Erreur lors du chargement des prévisions
            </div>
          ) : !forecasts || forecasts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              Aucun chantier actif trouvé
            </div>
          ) : (
            <div ref={tableRef} className="overflow-x-auto bg-white p-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="px-1.5 py-2 text-left text-sm font-semibold min-w-[110px]">Chantier</th>
                    <th className="px-1.5 py-2 text-left text-sm font-semibold min-w-[55px]">Code</th>
                    <th className="px-1.5 py-2 text-left text-sm font-semibold min-w-[85px]">Conducteur</th>
                    {dates.map((date, idx) => (
                      <th key={idx} className="p-2 text-center text-sm font-semibold min-w-[80px] border-l border-orange-400">
                        {format(parseISO(date), "EEE dd/MM", { locale: fr })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((chantier) => (
                    <ChantierRow key={chantier.chantierId} chantier={chantier} />
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="mt-4 p-3 bg-gray-100 rounded-lg space-y-3">
                {/* Légende icônes météo */}
                <div>
                  <div className="text-xs font-medium mb-2 text-gray-900">Légende icônes météo :</div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {weatherIconsLegend.map(({ icon: Icon, label }) => (
                      <span key={label} className="flex items-center gap-1 text-gray-600">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Légende précipitations */}
                <div>
                  <div className="text-xs font-medium mb-2 text-gray-900">Légende probabilité précipitations :</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      0-30% Faible
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      30-60% Modéré
                    </span>
                    <span className="text-red-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      &gt;60% Élevé
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
