import { useState, useEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { useRadarData } from "@/hooks/useRadarData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RadarPreviewProps {
  latitude: number;
  longitude: number;
  onClick: () => void;
}

export function RadarPreview({ latitude, longitude, onClick }: RadarPreviewProps) {
  const { data: radarData, isLoading, error } = useRadarData();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  const size = 250;
  const zoom = 6;
  
  // Vérifier que les coordonnées sont valides
  const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude);
  
  // Précharger les images
  useEffect(() => {
    if (!radarData || !hasValidCoords) return;
    
    let loadedCount = 0;
    const totalFrames = radarData.allFrames.length;
    
    radarData.allFrames.forEach((frame) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalFrames) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalFrames) {
          setImagesLoaded(true);
        }
      };
      // Format URL avec coordonnées directes (lat/lon)
      img.src = `${radarData.host}${frame.path}/${size}/${zoom}/${latitude}/${longitude}/4/1_1.png`;
    });
  }, [radarData, latitude, longitude, hasValidCoords, zoom, size]);
  
  // Animation des frames
  useEffect(() => {
    if (!radarData || !imagesLoaded) return;
    
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
  }, [radarData, imagesLoaded]);
  
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
  
  // URL du radar avec coordonnées directes
  const radarUrl = currentFrame 
    ? `${radarData.host}${currentFrame.path}/${size}/${zoom}/${latitude}/${longitude}/4/1_1.png`
    : "";
  
  return (
    <div 
      className="relative w-full h-[200px] rounded-lg overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Image radar avec fond de carte intégré */}
      {radarUrl && (
        <img 
          src={radarUrl}
          alt="Radar précipitations"
          className="absolute inset-0 w-full h-full object-contain bg-slate-800"
        />
      )}
      
      {/* Indicateur en direct */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
        <Radio className={`h-3 w-3 ${isNowcast ? 'text-orange-500' : 'text-red-500'}`} />
        <span className="text-xs font-medium">
          {isNowcast ? 'Prévision' : 'En direct'}
        </span>
      </div>
      
      {/* Horodatage */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        <span className="text-xs">
          {format(frameTime, "HH:mm", { locale: fr })}
        </span>
      </div>
      
      {/* Overlay au hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Cliquer pour agrandir
        </span>
      </div>
    </div>
  );
}
