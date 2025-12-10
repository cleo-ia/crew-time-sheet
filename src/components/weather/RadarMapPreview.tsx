import { useState, useEffect, useRef, useCallback } from "react";
import { Radio } from "lucide-react";
import { useRadarData } from "@/hooks/useRadarData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface RadarMapPreviewProps {
  latitude: number;
  longitude: number;
  mapboxToken: string;
  onClick: () => void;
}

export function RadarMapPreview({ latitude, longitude, mapboxToken, onClick }: RadarMapPreviewProps) {
  const { data: radarData, isLoading, error } = useRadarData();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !hasValidCoords || !mapboxToken) return;
    
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: 7,
      interactive: false, // Preview is not interactive
    });
    
    map.current.on("load", () => {
      setMapLoaded(true);
    });
    
    // Add marker for chantier location
    new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat([longitude, latitude])
      .addTo(map.current);
    
    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [latitude, longitude, mapboxToken, hasValidCoords]);
  
  // Add/update radar layer when map is loaded and radar data is available
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
  
  if (isLoading || !hasValidCoords || !mapboxToken) {
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
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
          <div className="text-sm text-white/70">Chargement carte...</div>
        </div>
      )}
      
      {/* Live indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 z-10">
        <Radio className={`h-3 w-3 ${isNowcast ? 'text-orange-500' : 'text-red-500'}`} />
        <span className="text-xs font-medium">
          {isNowcast ? 'Prévision' : 'En direct'}
        </span>
      </div>
      
      {/* Timestamp */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 z-10">
        <span className="text-xs">
          {format(frameTime, "HH:mm", { locale: fr })}
        </span>
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-10">
        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Cliquer pour agrandir
        </span>
      </div>
    </div>
  );
}
