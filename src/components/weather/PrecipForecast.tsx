import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { HourlyForecast } from "@/hooks/useHourlyForecast";
import { Droplets } from "lucide-react";

interface PrecipForecastProps {
  forecasts: HourlyForecast[];
}

export function PrecipForecast({ forecasts }: PrecipForecastProps) {
  if (!forecasts || forecasts.length === 0) return null;
  
  // Calculate max for scaling bars
  const maxProb = Math.max(...forecasts.map(f => f.precipitationProbability), 10);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Droplets className="h-4 w-4" />
        <span>Probabilité de précipitations (12h)</span>
      </div>
      
      <div className="flex items-end gap-1 h-16 px-1">
        {forecasts.map((forecast, index) => {
          const height = Math.max((forecast.precipitationProbability / maxProb) * 100, 5);
          const isRainy = forecast.precipitationProbability > 30;
          const isVeryRainy = forecast.precipitationProbability > 60;
          
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1"
            >
              {/* Bar */}
              <div className="w-full flex items-end justify-center h-10">
                <div
                  className={`w-full max-w-[20px] rounded-t transition-all ${
                    isVeryRainy 
                      ? 'bg-blue-500' 
                      : isRainy 
                        ? 'bg-blue-400' 
                        : 'bg-blue-300/50'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${forecast.precipitationProbability}% - ${forecast.precipitation}mm`}
                />
              </div>
              
              {/* Hour label */}
              <span className="text-[10px] text-muted-foreground">
                {format(forecast.time, "HH", { locale: fr })}h
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-blue-300/50" />
          <span>&lt;30%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-blue-400" />
          <span>30-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-blue-500" />
          <span>&gt;60%</span>
        </div>
      </div>
    </div>
  );
}
