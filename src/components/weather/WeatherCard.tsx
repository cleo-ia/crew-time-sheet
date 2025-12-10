import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshCw, Droplets, Wind, CloudRain, Gauge, Cloud, Sun as SunIcon, ThermometerSun, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WeatherData } from "@/hooks/useWeather";
import { getWeatherInfo, getWindDirection, getSeverityColor } from "@/lib/weatherUtils";
import { RadarLeafletPreview } from "./RadarLeafletPreview";
import { RadarLeafletDialog } from "./RadarLeafletDialog";

interface WeatherCardProps {
  weather: WeatherData;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function WeatherCard({ weather, onRefresh, isRefreshing }: WeatherCardProps) {
  const [radarOpen, setRadarOpen] = useState(false);
  
  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const WeatherIcon = weatherInfo.icon;
  const windDir = getWindDirection(weather.ventDirection);
  
  // UV Index description
  const getUvDescription = (uv: number | null) => {
    if (uv === null) return "N/A";
    if (uv <= 2) return `${uv} (Faible)`;
    if (uv <= 5) return `${uv} (Modéré)`;
    if (uv <= 7) return `${uv} (Élevé)`;
    if (uv <= 10) return `${uv} (Très élevé)`;
    return `${uv} (Extrême)`;
  };

  return (
    <div className="w-80 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Points Météo</h3>
          <p className="text-sm text-muted-foreground">{weather.ville}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Mise à jour */}
      <p className="text-xs text-muted-foreground">
        Mis à jour : {format(weather.updatedAt, "dd/MM à HH:mm", { locale: fr })}
      </p>
      
      <Separator />
      
      {/* Conditions principales */}
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-muted ${getSeverityColor(weatherInfo.severity)}`}>
          <WeatherIcon className="h-12 w-12" />
        </div>
        <div>
          <p className="text-3xl font-bold">{weather.temperature}°C</p>
          <p className="text-sm text-muted-foreground">{weatherInfo.description}</p>
        </div>
      </div>
      
      <Separator />
      
      {/* Détails */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <ThermometerSun className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-muted-foreground">Ressenti</p>
            <p className="font-medium">{weather.temperatureApparente}°C</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-muted-foreground">Humidité</p>
            <p className="font-medium">{weather.humidite}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-cyan-500" />
          <div>
            <p className="text-muted-foreground">Vent</p>
            <p className="font-medium">{weather.ventVitesse} km/h {windDir}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <CloudRain className="h-4 w-4 text-indigo-500" />
          <div>
            <p className="text-muted-foreground">Précip.</p>
            <p className="font-medium">{weather.precipitations} mm</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-muted-foreground">Nuages</p>
            <p className="font-medium">{weather.nuages}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <SunIcon className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="text-muted-foreground">UV</p>
            <p className="font-medium">{getUvDescription(weather.uvIndex)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 col-span-2">
          <Gauge className="h-4 w-4 text-purple-500" />
          <div>
            <p className="text-muted-foreground">Pression</p>
            <p className="font-medium">{weather.pression} hPa</p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Section Radar - hidden when dialog is open */}
      {!radarOpen && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500" />
            <span className="font-medium text-sm">Radar Précipitations</span>
          </div>
          
          <RadarLeafletPreview
            latitude={weather.latitude}
            longitude={weather.longitude}
            onClick={() => setRadarOpen(true)}
          />
        </div>
      )}
      
      {/* Dialog */}
      <RadarLeafletDialog
        open={radarOpen}
        onOpenChange={setRadarOpen}
        latitude={weather.latitude}
        longitude={weather.longitude}
        cityName={weather.ville}
      />
    </div>
  );
}
