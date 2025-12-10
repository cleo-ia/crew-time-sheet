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
  
  const tileSize = 256;
  const zoom = 6;
  const size = 200;
  
  // Calculer la tuile pour les coordonnées
  const lon2tile = (lon: number, z: number) => Math.floor((lon + 180) / 360 * Math.pow(2, z));
  const lat2tile = (lat: number, z: number) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
  
  const tileX = lon2tile(longitude, zoom);
  const tileY = lat2tile(latitude, zoom);
  
  // Précharger les images
  useEffect(() => {
    if (!radarData) return;
    
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
      img.src = `${radarData.host}${frame.path}/${tileSize}/${zoom}/${tileX}/${tileY}/2/1_1.png`;
    });
  }, [radarData, tileX, tileY, zoom]);
  
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
  
  if (isLoading) {
    return (
      <div 
        className="w-full h-[200px] rounded-lg bg-muted flex items-center justify-center"
      >
        <div className="text-sm text-muted-foreground">Chargement radar...</div>
      </div>
    );
  }
  
  if (error || !radarData) {
    return (
      <div 
        className="w-full h-[200px] rounded-lg bg-muted flex items-center justify-center"
      >
        <div className="text-sm text-muted-foreground">Radar non disponible</div>
      </div>
    );
  }
  
  const currentFrame = radarData.allFrames[currentFrameIndex];
  const isNowcast = currentFrameIndex >= radarData.pastFrames.length;
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : new Date();
  
  // URL de la tuile OpenStreetMap pour le fond de carte
  const osmUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
  
  // URL de la tuile radar
  const radarUrl = currentFrame 
    ? `${radarData.host}${currentFrame.path}/${tileSize}/${zoom}/${tileX}/${tileY}/2/1_1.png`
    : "";
  
  return (
    <div 
      className="relative w-full h-[200px] rounded-lg overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      {/* Fond de carte OSM */}
      <img 
        src={osmUrl}
        alt="Carte"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: "auto" }}
      />
      
      {/* Overlay radar */}
      {radarUrl && (
        <img 
          src={radarUrl}
          alt="Radar précipitations"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            opacity: 0.7,
            mixBlendMode: "normal",
          }}
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
