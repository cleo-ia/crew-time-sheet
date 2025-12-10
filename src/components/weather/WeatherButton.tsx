import { useState } from "react";
import { Loader2, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWeather } from "@/hooks/useWeather";
import { getWeatherInfo, getSeverityColor } from "@/lib/weatherUtils";
import { WeatherCard } from "./WeatherCard";

interface WeatherButtonProps {
  ville: string | null | undefined;
}

export function WeatherButton({ ville }: WeatherButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data: weather, isLoading, isError, refetch, isFetching } = useWeather(ville);
  
  // Si pas de ville, ne rien afficher
  if (!ville) {
    return null;
  }
  
  // État de chargement
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Météo...</span>
      </Button>
    );
  }
  
  // Erreur
  if (isError || !weather) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2 text-muted-foreground">
        <CloudOff className="h-4 w-4" />
        <span className="text-sm">Météo indisponible</span>
      </Button>
    );
  }
  
  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const WeatherIcon = weatherInfo.icon;
  
  // Close popover when radar dialog opens
  const handleRadarDialogChange = (open: boolean) => {
    if (open) {
      setPopoverOpen(false);
    }
  };
  
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${getSeverityColor(weatherInfo.severity)} border-border/50 hover:bg-muted/50`}
        >
          <WeatherIcon className="h-4 w-4" />
          <span className="font-medium">{weather.temperature}°C</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {weather.ville}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <WeatherCard 
          weather={weather} 
          onRefresh={() => refetch()} 
          isRefreshing={isFetching}
          onRadarDialogChange={handleRadarDialogChange}
        />
      </PopoverContent>
    </Popover>
  );
}
