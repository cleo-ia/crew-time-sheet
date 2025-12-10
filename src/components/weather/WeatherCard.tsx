import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshCw, Droplets, Wind, CloudRain, Gauge, Cloud, Sun as SunIcon, ThermometerSun, Radio, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeatherData } from "@/hooks/useWeather";
import { getWeatherInfo, getWindDirection, getSeverityColor } from "@/lib/weatherUtils";
import { RadarPreview } from "./RadarPreview";
import { RadarDialog } from "./RadarDialog";
import { RadarMapPreview } from "./RadarMapPreview";
import { RadarMapDialog } from "./RadarMapDialog";

interface WeatherCardProps {
  weather: WeatherData;
  onRefresh: () => void;
  isRefreshing: boolean;
}

// Storage key for Mapbox token
const MAPBOX_TOKEN_KEY = "mapbox_public_token";

export function WeatherCard({ weather, onRefresh, isRefreshing }: WeatherCardProps) {
  const [radarOpen, setRadarOpen] = useState(false);
  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem(MAPBOX_TOKEN_KEY) || ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(!mapboxToken);
  
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
  
  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setShowTokenInput(false);
      setTokenInput("");
    }
  };
  
  const handleClearToken = () => {
    localStorage.removeItem(MAPBOX_TOKEN_KEY);
    setMapboxToken("");
    setShowTokenInput(true);
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
      
      {/* Section Radar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500" />
            <span className="font-medium text-sm">Radar Précipitations</span>
          </div>
          {mapboxToken && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={handleClearToken}
            >
              <Map className="h-3 w-3 mr-1" />
              Changer token
            </Button>
          )}
        </div>
        
        {/* Mapbox token input */}
        {showTokenInput && !mapboxToken ? (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="mapbox-token" className="text-xs text-muted-foreground">
              Token Mapbox (pour carte interactive)
            </Label>
            <div className="flex gap-2">
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.ey..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="h-8 text-xs"
              />
              <Button 
                size="sm" 
                onClick={handleSaveToken}
                disabled={!tokenInput.trim()}
                className="h-8"
              >
                OK
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Obtenez un token gratuit sur{" "}
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                mapbox.com
              </a>
            </p>
            {/* Fallback to simple radar */}
            <RadarPreview
              latitude={weather.latitude}
              longitude={weather.longitude}
              onClick={() => setRadarOpen(true)}
            />
          </div>
        ) : mapboxToken ? (
          <RadarMapPreview
            latitude={weather.latitude}
            longitude={weather.longitude}
            mapboxToken={mapboxToken}
            onClick={() => setRadarOpen(true)}
          />
        ) : (
          <RadarPreview
            latitude={weather.latitude}
            longitude={weather.longitude}
            onClick={() => setRadarOpen(true)}
          />
        )}
      </div>
      
      {/* Dialog - use Mapbox version if token is available */}
      {mapboxToken ? (
        <RadarMapDialog
          open={radarOpen}
          onOpenChange={setRadarOpen}
          latitude={weather.latitude}
          longitude={weather.longitude}
          cityName={weather.ville}
          mapboxToken={mapboxToken}
        />
      ) : (
        <RadarDialog
          open={radarOpen}
          onOpenChange={setRadarOpen}
          latitude={weather.latitude}
          longitude={weather.longitude}
          ville={weather.ville}
        />
      )}
    </div>
  );
}
