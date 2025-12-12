import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  RefreshCw, Droplets, Wind, CloudRain, Gauge, Cloud, 
  Sun as SunIcon, ThermometerSun, Radio, Pause, Play, 
  SkipBack, SkipForward, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WeatherData } from "@/hooks/useWeather";
import { useRadarData } from "@/hooks/useRadarData";
import { useHourlyForecast } from "@/hooks/useHourlyForecast";
import { getWeatherInfo, getWindDirection, getSeverityColor } from "@/lib/weatherUtils";
import { PrecipForecast } from "./PrecipForecast";
import L from "leaflet";

interface WeatherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weather: WeatherData;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function WeatherSheet({ 
  open, 
  onOpenChange, 
  weather, 
  onRefresh, 
  isRefreshing 
}: WeatherSheetProps) {
  const { data: radarData, isLoading: radarLoading } = useRadarData();
  const { data: hourlyData } = useHourlyForecast(weather.latitude, weather.longitude);
  
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const radarLayer = useRef<L.TileLayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const WeatherIcon = weatherInfo.icon;
  const windDir = getWindDirection(weather.ventDirection);
  
  const hasValidCoords = weather.latitude && weather.longitude && 
    !isNaN(weather.latitude) && !isNaN(weather.longitude);
  
  // UV Index description
  const getUvDescription = (uv: number | null) => {
    if (uv === null) return "N/A";
    if (uv <= 2) return `${uv} (Faible)`;
    if (uv <= 5) return `${uv} (Modéré)`;
    if (uv <= 7) return `${uv} (Élevé)`;
    if (uv <= 10) return `${uv} (Très élevé)`;
    return `${uv} (Extrême)`;
  };
  
  // Reset state when sheet opens
  useEffect(() => {
    if (open && radarData) {
      const liveFrameIndex = radarData.pastFrames.length - 1;
      setCurrentFrameIndex(Math.max(0, liveFrameIndex));
      setIsPlaying(false);
    }
  }, [open, radarData]);
  
  // Initialize map when sheet opens
  useEffect(() => {
    if (!open || !hasValidCoords) return;
    
    const timer = setTimeout(() => {
      if (!mapContainer.current || map.current) return;
      
      const rect = mapContainer.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      map.current = L.map(mapContainer.current, {
        center: [weather.latitude, weather.longitude],
        zoom: 8,
        zoomControl: true,
      });
      
      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map.current);
      
      setTimeout(() => {
        map.current?.invalidateSize();
      }, 100);
      
      const fallbackId = setTimeout(() => {
        setMapLoaded(true);
      }, 3000);
      
      osmLayer.on('load', () => {
        clearTimeout(fallbackId);
        setMapLoaded(true);
      });
      
      const redIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width: 16px; height: 16px; background: #ef4444; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      
      L.marker([weather.latitude, weather.longitude], { icon: redIcon }).addTo(map.current);
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      radarLayer.current = null;
      setMapLoaded(false);
    };
  }, [open, weather.latitude, weather.longitude, hasValidCoords]);
  
  // Update radar layer
  const updateRadarLayer = useCallback(() => {
    if (!map.current || !mapLoaded || !radarData) return;
    
    const currentFrame = radarData.allFrames[currentFrameIndex];
    if (!currentFrame) return;
    
    const radarUrl = `${radarData.host}${currentFrame.path}/256/{z}/{x}/{y}/4/1_1.png`;
    const oldLayer = radarLayer.current;
    
    const newLayer = L.tileLayer(radarUrl, {
      opacity: 0,
      zIndex: 1000,
      className: 'radar-tile-layer',
    }).addTo(map.current!);
    
    requestAnimationFrame(() => {
      newLayer.setOpacity(0.7);
    });
    
    if (oldLayer) {
      setTimeout(() => {
        map.current?.removeLayer(oldLayer);
      }, 200);
    }
    
    radarLayer.current = newLayer;
  }, [radarData, currentFrameIndex, mapLoaded]);
  
  useEffect(() => {
    updateRadarLayer();
  }, [updateRadarLayer]);
  
  // Animation loop
  useEffect(() => {
    if (!radarData || !mapLoaded || !isPlaying) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => 
        prev >= radarData.allFrames.length - 1 ? 0 : prev + 1
      );
    }, 500);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [radarData, mapLoaded, isPlaying]);
  
  const handlePrevFrame = () => {
    if (!radarData) return;
    setCurrentFrameIndex((prev) => 
      prev <= 0 ? radarData.allFrames.length - 1 : prev - 1
    );
  };
  
  const handleNextFrame = () => {
    if (!radarData) return;
    setCurrentFrameIndex((prev) => 
      prev >= radarData.allFrames.length - 1 ? 0 : prev + 1
    );
  };
  
  const currentFrame = radarData?.allFrames[currentFrameIndex];
  const isNowcast = radarData ? currentFrameIndex >= radarData.pastFrames.length : false;
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : new Date();
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto p-0"
      >
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Points Météo - {weather.ville}
            </SheetTitle>
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
          <p className="text-xs text-muted-foreground">
            Mis à jour : {format(weather.updatedAt, "dd/MM à HH:mm", { locale: fr })}
          </p>
        </SheetHeader>
        
        <div className="p-4 space-y-4">
          {/* Layout responsive: 2 colonnes sur tablette, 1 colonne sur mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Colonne gauche: Conditions météo */}
            <div className="space-y-4">
              {/* Conditions principales */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className={`p-3 rounded-xl bg-background ${getSeverityColor(weatherInfo.severity)}`}>
                  <WeatherIcon className="h-12 w-12" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{weather.temperature}°C</p>
                  <p className="text-sm text-muted-foreground">{weatherInfo.description}</p>
                </div>
              </div>
              
              {/* Détails météo */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <ThermometerSun className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Ressenti</p>
                    <p className="font-medium">{weather.temperatureApparente}°C</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Humidité</p>
                    <p className="font-medium">{weather.humidite}%</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Wind className="h-4 w-4 text-cyan-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Vent</p>
                    <p className="font-medium truncate">{weather.ventVitesse} km/h {windDir}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <CloudRain className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Précip.</p>
                    <p className="font-medium">{weather.precipitations} mm</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Cloud className="h-4 w-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Nuages</p>
                    <p className="font-medium">{weather.nuages}%</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <SunIcon className="h-4 w-4 text-yellow-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">UV</p>
                    <p className="font-medium truncate">{getUvDescription(weather.uvIndex)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 col-span-2">
                  <Gauge className="h-4 w-4 text-purple-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Pression</p>
                    <p className="font-medium">{weather.pression} hPa</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Colonne droite: Radar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">Radar Précipitations</span>
              </div>
              
              {/* Map */}
              <div className="relative w-full h-[250px] md:h-[280px] rounded-lg overflow-hidden bg-muted">
                <div ref={mapContainer} className="absolute inset-0" />
                
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground text-sm">
                      {radarLoading ? "Chargement radar..." : "Chargement carte..."}
                    </p>
                  </div>
                )}
                
                {/* Live indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 z-[1000]">
                  <Radio className={`h-3 w-3 ${isNowcast ? 'text-orange-500' : 'text-red-500'}`} />
                  <span className="text-xs font-medium">
                    {isNowcast ? 'Prévision' : 'En direct'}
                  </span>
                </div>
              </div>
              
              {/* Controls */}
              {radarData && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevFrame}>
                      <SkipBack className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextFrame}>
                      <SkipForward className="h-3 w-3" />
                    </Button>
                    
                    <div className="flex-1 flex flex-col gap-1">
                      <Slider
                        value={[currentFrameIndex]}
                        max={radarData.allFrames.length - 1}
                        step={1}
                        onValueChange={(value) => {
                          setIsPlaying(false);
                          setCurrentFrameIndex(value[0]);
                        }}
                      />
                      
                      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                        <span>{format(new Date(radarData.allFrames[0].time * 1000), "HH:mm", { locale: fr })}</span>
                        <span className="text-foreground font-medium">
                          {format(frameTime, "HH:mm", { locale: fr })}
                        </span>
                        <span>{format(new Date(radarData.allFrames[radarData.allFrames.length - 1].time * 1000), "HH:mm", { locale: fr })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span>Faible</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span>Modéré</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Fort</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Intense</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Prévisions horaires - pleine largeur */}
          {hourlyData && hourlyData.length > 0 && (
            <>
              <Separator />
              <PrecipForecast forecasts={hourlyData} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
