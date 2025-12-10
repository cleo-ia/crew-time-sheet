import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRadarData } from "@/hooks/useRadarData";
import { useHourlyForecast } from "@/hooks/useHourlyForecast";
import { PrecipForecast } from "./PrecipForecast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Play, Pause, SkipBack, SkipForward, Radio } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface RadarMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
  cityName: string;
  mapboxToken: string;
}

export function RadarMapDialog({ 
  open, 
  onOpenChange, 
  latitude, 
  longitude, 
  cityName,
  mapboxToken 
}: RadarMapDialogProps) {
  const { data: radarData } = useRadarData();
  const { data: hourlyForecast } = useHourlyForecast(latitude, longitude);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude);
  
  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentFrameIndex(0);
      setIsPlaying(true);
      setMapLoaded(false);
    }
  }, [open]);
  
  // Initialize map
  useEffect(() => {
    if (!open || !mapContainer.current || !hasValidCoords || !mapboxToken) return;
    
    // Small delay to ensure dialog is rendered
    const initTimer = setTimeout(() => {
      if (!mapContainer.current) return;
      
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [longitude, latitude],
        zoom: 8,
      });
      
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      
      map.current.on("load", () => {
        setMapLoaded(true);
      });
      
      // Add marker for chantier location
      new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([longitude, latitude])
        .addTo(map.current);
    }, 100);
    
    return () => {
      clearTimeout(initTimer);
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [open, latitude, longitude, mapboxToken, hasValidCoords]);
  
  // Add/update radar layer
  const updateRadarLayer = useCallback(() => {
    if (!map.current || !mapLoaded || !radarData) return;
    
    const currentFrame = radarData.allFrames[currentFrameIndex];
    if (!currentFrame) return;
    
    const radarUrl = `${radarData.host}${currentFrame.path}/256/{z}/{x}/{y}/4/1_1.png`;
    
    // Remove existing radar layer and source
    if (map.current.getLayer("radar-layer")) {
      map.current.removeLayer("radar-layer");
    }
    if (map.current.getSource("radar-source")) {
      map.current.removeSource("radar-source");
    }
    
    // Add new radar source and layer
    map.current.addSource("radar-source", {
      type: "raster",
      tiles: [radarUrl],
      tileSize: 256,
    });
    
    map.current.addLayer({
      id: "radar-layer",
      type: "raster",
      source: "radar-source",
      paint: {
        "raster-opacity": 0.7,
        "raster-fade-duration": 200,
      },
    });
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
    }, 400);
    
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
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!radarData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const frameIndex = Math.floor(percentage * radarData.allFrames.length);
    setCurrentFrameIndex(Math.min(Math.max(0, frameIndex), radarData.allFrames.length - 1));
  };
  
  if (!radarData || !hasValidCoords) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Radar Précipitations - {cityName}</DialogTitle>
          </DialogHeader>
          <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const currentFrame = radarData.allFrames[currentFrameIndex];
  const isNowcast = currentFrameIndex >= radarData.pastFrames.length;
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : new Date();
  const progress = ((currentFrameIndex + 1) / radarData.allFrames.length) * 100;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Radar Précipitations - {cityName}
            <div className="flex items-center gap-1.5 ml-2">
              <Radio className={`h-3 w-3 ${isNowcast ? 'text-orange-500 animate-pulse' : 'text-red-500 animate-pulse'}`} />
              <span className="text-sm font-normal text-muted-foreground">
                {isNowcast ? 'Prévision' : 'En direct'}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Map container */}
          <div className="relative w-full h-[350px] rounded-lg overflow-hidden bg-slate-800">
            <div ref={mapContainer} className="absolute inset-0" />
            
            {/* Loading overlay */}
            {!mapLoaded && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center z-10">
                <div className="text-sm text-white/70">Chargement carte...</div>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="space-y-2">
            {/* Progress bar */}
            <div 
              className="h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
            >
              <div 
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Playback controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {format(frameTime, "HH:mm", { locale: fr })}
              </span>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevFrame}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextFrame}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              
              <span className="text-sm text-muted-foreground">
                {currentFrameIndex + 1} / {radarData.allFrames.length}
              </span>
            </div>
          </div>
          
          {/* Hourly precipitation forecast */}
          {hourlyForecast && hourlyForecast.length > 0 && (
            <div className="pt-2 border-t">
              <PrecipForecast forecasts={hourlyForecast} />
            </div>
          )}
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Intensité :</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-[#00ff00] rounded" />
              <span>Faible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-[#ffff00] rounded" />
              <span>Modérée</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-[#ff0000] rounded" />
              <span>Forte</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
