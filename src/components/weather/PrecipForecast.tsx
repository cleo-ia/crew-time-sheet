import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { HourlyForecast } from "@/hooks/useHourlyForecast";
import { Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PrecipForecastProps {
  forecasts: HourlyForecast[];
}

export function PrecipForecast({ forecasts }: PrecipForecastProps) {
  if (!forecasts || forecasts.length === 0) return null;
  
  // Calculate max for scaling bars
  const maxProb = Math.max(...forecasts.map(f => f.precipitationProbability), 10);
  
  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      {/* Enhanced title */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <Droplets className="h-4 w-4 text-blue-500" />
        <span>Probabilité de précipitations</span>
        <span className="text-muted-foreground text-xs">(12h)</span>
      </div>
      
      {/* Larger bars with percentages */}
      <div className="flex items-end gap-2 h-24 px-2">
        {forecasts.map((forecast, index) => {
          const height = Math.max((forecast.precipitationProbability / maxProb) * 100, 8);
          const isRainy = forecast.precipitationProbability > 30;
          const isVeryRainy = forecast.precipitationProbability > 60;
          const isCurrentHour = index === 0;
          
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1"
            >
              {/* Percentage above bar if > 0 */}
              <div className="h-4 flex items-end">
                {forecast.precipitationProbability > 0 && (
                  <span className={`text-[10px] font-medium ${
                    isVeryRainy 
                      ? 'text-blue-600' 
                      : isRainy 
                        ? 'text-blue-500' 
                        : 'text-blue-400'
                  }`}>
                    {forecast.precipitationProbability}%
                  </span>
                )}
              </div>
              
              {/* Bar with gradient */}
              <div className="w-full h-14 flex items-end justify-center">
                <div
                  className={`w-3/4 max-w-[16px] rounded-full transition-all ${
                    isVeryRainy 
                      ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                      : isRainy 
                        ? 'bg-gradient-to-t from-blue-500 to-blue-300' 
                        : 'bg-gradient-to-t from-blue-400/60 to-blue-300/40'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${forecast.precipitationProbability}% - ${forecast.precipitation}mm`}
                />
              </div>
              
              {/* Hour label - current hour highlighted */}
              <span className={`text-xs ${
                isCurrentHour 
                  ? 'font-semibold text-foreground' 
                  : 'text-muted-foreground'
              }`}>
                {format(forecast.time, "HH", { locale: fr })}h
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Legend as compact badges */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <div className="w-2 h-2 rounded-full bg-blue-400/60 mr-1.5" />
          Faible
        </Badge>
        <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
          Modéré
        </Badge>
        <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-blue-200 border-blue-400 dark:bg-blue-800/30 dark:border-blue-600">
          <div className="w-2 h-2 rounded-full bg-blue-600 mr-1.5" />
          Élevé
        </Badge>
      </div>
    </div>
  );
}
