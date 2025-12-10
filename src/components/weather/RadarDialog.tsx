import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useRadarData } from "@/hooks/useRadarData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RadarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
  ville: string;
}

export function RadarDialog({ open, onOpenChange, latitude, longitude, ville }: RadarDialogProps) {
  const { data: radarData } = useRadarData();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const size = 350;
  const zoom = 7;
  
  // Vérifier que les coordonnées sont valides
  const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude);
  
  // Animation des frames
  useEffect(() => {
    if (!radarData || !isPlaying || !open || !hasValidCoords) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
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
  }, [radarData, isPlaying, open, hasValidCoords]);
  
  // Reset quand on ouvre
  useEffect(() => {
    if (open) {
      setCurrentFrameIndex(0);
      setIsPlaying(true);
    }
  }, [open]);
  
  if (!radarData || !hasValidCoords) return null;
  
  const currentFrame = radarData.allFrames[currentFrameIndex];
  const isNowcast = currentFrameIndex >= radarData.pastFrames.length;
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : new Date();
  
  // URL du radar avec coordonnées directes (lat/lon)
  const radarUrl = currentFrame 
    ? `${radarData.host}${currentFrame.path}/${size}/${zoom}/${latitude}/${longitude}/4/1_1.png`
    : "";
  
  const handlePrevFrame = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => prev <= 0 ? radarData.allFrames.length - 1 : prev - 1);
  };
  
  const handleNextFrame = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => prev >= radarData.allFrames.length - 1 ? 0 : prev + 1);
  };
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const frameIndex = Math.floor(percentage * radarData.allFrames.length);
    setCurrentFrameIndex(Math.max(0, Math.min(frameIndex, radarData.allFrames.length - 1)));
    setIsPlaying(false);
  };
  
  const progressPercentage = (currentFrameIndex / (radarData.allFrames.length - 1)) * 100;
  const nowcastStartPercentage = (radarData.pastFrames.length / radarData.allFrames.length) * 100;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Radar Précipitations - {ville}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Carte radar */}
          <div className="relative w-full h-[350px] rounded-lg overflow-hidden bg-slate-800">
            {radarUrl && (
              <img 
                src={radarUrl}
                alt="Radar précipitations"
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}
            
            {/* Point central */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg" />
            </div>
          </div>
          
          {/* Contrôles */}
          <div className="flex items-center justify-center gap-2">
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
            
            <div className="ml-4 flex items-center gap-2">
              <span className={`text-sm font-medium ${isNowcast ? 'text-orange-500' : 'text-muted-foreground'}`}>
                {isNowcast ? 'Prévision' : 'Passé'}
              </span>
              <span className="text-sm">
                {format(frameTime, "HH:mm", { locale: fr })}
              </span>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div 
            className="relative h-2 bg-muted rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            {/* Zone passée */}
            <div 
              className="absolute h-full bg-muted-foreground/30 rounded-l-full"
              style={{ width: `${nowcastStartPercentage}%` }}
            />
            {/* Zone nowcast */}
            <div 
              className="absolute h-full bg-orange-500/30 rounded-r-full"
              style={{ left: `${nowcastStartPercentage}%`, width: `${100 - nowcastStartPercentage}%` }}
            />
            {/* Curseur */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow"
              style={{ left: `${progressPercentage}%`, marginLeft: "-6px" }}
            />
          </div>
          
          {/* Labels */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-2h</span>
            <span>Maintenant</span>
            <span>+30min</span>
          </div>
          
          {/* Légende */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Intensité :</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#88c8f7" }} />
              <span className="text-xs">Légère</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#34c759" }} />
              <span className="text-xs">Modérée</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#ffd60a" }} />
              <span className="text-xs">Forte</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#ff3b30" }} />
              <span className="text-xs">Très forte</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
