import { useState, useEffect, useRef, useCallback } from "react";
import { Radio } from "lucide-react";
import { useRadarData } from "@/hooks/useRadarData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RadarLeafletPreviewProps {
  latitude: number;
  longitude: number;
  onClick: () => void;
}

export function RadarLeafletPreview({ latitude, longitude, onClick }: RadarLeafletPreviewProps) {
  const { data: radarData, isLoading, error } = useRadarData();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const radarLayer = useRef<L.TileLayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !hasValidCoords) return;
    
    // Create map
    map.current = L.map(mapContainer.current, {
      center: [latitude, longitude],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    
    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map.current);
    
    // Add marker for chantier location
    const redIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width: 12px; height: 12px; background: #ef4444; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    
    L.marker([latitude, longitude], { icon: redIcon }).addTo(map.current);
    
    setMapLoaded(true);
    
    return () => {
      map.current?.remove();
      map.current = null;
      radarLayer.current = null;
      setMapLoaded(false);
    };
  }, [latitude, longitude, hasValidCoords]);
  
  // Update radar layer when frame changes
  const updateRadarLayer = useCallback(() => {
    if (!map.current || !mapLoaded || !radarData) return;
    
    const currentFrame = radarData.allFrames[currentFrameIndex];
    if (!currentFrame) return;
    
    const radarUrl = `${radarData.host}${currentFrame.path}/256/{z}/{x}/{y}/4/1_1.png`;
    
    // Remove existing radar layer
    if (radarLayer.current) {
      map.current.removeLayer(radarLayer.current);
    }
    
    // Add new radar layer
    radarLayer.current = L.tileLayer(radarUrl, {
      opacity: 0.7,
      zIndex: 1000,
    }).addTo(map.current);
  }, [radarData, currentFrameIndex, mapLoaded]);
  
  useEffect(() => {
    updateRadarLayer();
  }, [updateRadarLayer]);
  
  // Animation loop
  useEffect(() => {
    if (!radarData || !mapLoaded) return;
    
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
  }, [radarData, mapLoaded]);
  
  if (isLoading || !hasValidCoords) {
    return (
      <div className="w-full h-[200px] rounded-lg bg-muted flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Chargement radar...</div>
      </div>
    );
  }
  
  if (error || !radarData) {
    return (
      <div className="w-full h-[200px] rounded-lg bg-muted flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Radar non disponible</div>
      </div>
    );
  }
  
  const currentFrame = radarData.allFrames[currentFrameIndex];
  const isNowcast = currentFrameIndex >= radarData.pastFrames.length;
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : new Date();
  
  return (
    <div 
      className="relative w-full h-[200px] rounded-lg overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Chargement carte...</div>
        </div>
      )}
      
      {/* Live indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 z-[1000]">
        <Radio className={`h-3 w-3 ${isNowcast ? 'text-orange-500' : 'text-red-500'}`} />
        <span className="text-xs font-medium">
          {isNowcast ? 'Prévision' : 'En direct'}
        </span>
      </div>
      
      {/* Timestamp */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 z-[1000]">
        <span className="text-xs">
          {format(frameTime, "HH:mm", { locale: fr })}
        </span>
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-[1000]">
        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Cliquer pour agrandir
        </span>
      </div>
    </div>
  );
}
