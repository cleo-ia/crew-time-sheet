import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pause, Play, SkipBack, SkipForward, Radio } from "lucide-react";
import { useRadarData } from "@/hooks/useRadarData";
import { useHourlyForecast } from "@/hooks/useHourlyForecast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PrecipForecast } from "./PrecipForecast";
import L from "leaflet";

interface RadarLeafletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
  cityName: string;
}

export function RadarLeafletDialog({ 
  open, 
  onOpenChange, 
  latitude, 
  longitude, 
  cityName 
}: RadarLeafletDialogProps) {
  const { data: radarData, isLoading } = useRadarData();
  const { data: hourlyData } = useHourlyForecast(latitude, longitude);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const radarLayer = useRef<L.TileLayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentFrameIndex(0);
      setIsPlaying(true);
    }
  }, [open]);
  
  // Initialize map when dialog opens
  useEffect(() => {
    if (!open || !hasValidCoords) return;
    
    // Longer delay to ensure dialog container is fully mounted and sized
    const timer = setTimeout(() => {
      if (!mapContainer.current || map.current) return;
      
      // Check container has dimensions
      const rect = mapContainer.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('[RadarDialog] Container has no dimensions, retrying...');
        return;
      }
      
      map.current = L.map(mapContainer.current, {
        center: [latitude, longitude],
        zoom: 8,
        zoomControl: true,
      });
      
      // Add OpenStreetMap tile layer with load event
      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map.current);
      
      // Force map to recalculate size after a short delay
      setTimeout(() => {
        map.current?.invalidateSize();
      }, 100);
      
      // Fallback timeout in case tiles don't fire load event
      const fallbackId = setTimeout(() => {
        setMapLoaded(true);
      }, 3000);
      
      // Listen for tile load completion
      osmLayer.on('load', () => {
        clearTimeout(fallbackId);
        setMapLoaded(true);
      });
      
      // Add marker for location
      const redIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width: 16px; height: 16px; background: #ef4444; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      
      L.marker([latitude, longitude], { icon: redIcon }).addTo(map.current);
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
  }, [open, latitude, longitude, hasValidCoords]);
  
  // Update radar layer when frame changes - with smooth transition
  const updateRadarLayer = useCallback(() => {
    if (!map.current || !mapLoaded || !radarData) return;
    
    const currentFrame = radarData.allFrames[currentFrameIndex];
    if (!currentFrame) return;
    
    const radarUrl = `${radarData.host}${currentFrame.path}/256/{z}/{x}/{y}/4/1_1.png`;
    const oldLayer = radarLayer.current;
    
    // Create new layer with opacity 0 for smooth transition
    const newLayer = L.tileLayer(radarUrl, {
      opacity: 0,
      zIndex: 1000,
      className: 'radar-tile-layer',
    }).addTo(map.current!);
    
    // Fade in new layer immediately (CSS handles transition)
    requestAnimationFrame(() => {
      newLayer.setOpacity(0.7);
    });
    
    // Remove old layer after transition
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
    }, 500); // Slightly slower for smoother transitions
    
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
    const percent = x / rect.width;
    const newIndex = Math.floor(percent * radarData.allFrames.length);
    setCurrentFrameIndex(Math.min(Math.max(0, newIndex), radarData.allFrames.length - 1));
  };
  
  if (!radarData || !hasValidCoords) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Radar Précipitations - {cityName}</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">
              {isLoading ? "Chargement..." : "Radar non disponible"}
            </p>
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            Radar Précipitations - {cityName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Map */}
          <div className="relative w-full h-[400px] rounded-lg overflow-hidden bg-muted">
            <div ref={mapContainer} className="absolute inset-0" />
            
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">Chargement de la carte...</p>
              </div>
            )}
            
            {/* Live indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 z-[1000]">
              <Radio className={`h-4 w-4 ${isNowcast ? 'text-orange-500' : 'text-red-500'}`} />
              <span className="text-sm font-medium">
                {isNowcast ? 'Prévision' : 'En direct'}
              </span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="space-y-2">
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
              
              <div 
                className="flex-1 h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <span className="text-sm font-medium min-w-[50px] text-right">
                {format(frameTime, "HH:mm", { locale: fr })}
              </span>
            </div>
          </div>
          
          {/* Hourly forecast */}
          {hourlyData && hourlyData.length > 0 && (
            <PrecipForecast forecasts={hourlyData} />
          )}
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span>Faible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <span>Modéré</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Fort</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Intense</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
