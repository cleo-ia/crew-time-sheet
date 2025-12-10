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
  
  // Get current hour to highlight
  const currentHour = new Date().getHours();
  
  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Droplets className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">Précipitations</span>
        <span className="text-xs text-muted-foreground">12 prochaines heures</span>
      </div>
      
      {/* Chart container */}
      <div className="bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent rounded-xl p-3 pb-2">
        {/* Bars */}
        <div className="flex items-end gap-1.5 h-20">
          {forecasts.map((forecast, index) => {
            const height = Math.max((forecast.precipitationProbability / maxProb) * 100, 6);
            const prob = forecast.precipitationProbability;
            const forecastHour = new Date(forecast.time).getHours();
            const isCurrentHour = forecastHour === currentHour;
            
            // Color intensity based on probability
            const getBarColor = () => {
              if (prob > 60) return 'bg-blue-500';
              if (prob > 30) return 'bg-blue-400';
              return 'bg-blue-300/70';
            };
            
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center"
              >
                {/* Bar container */}
                <div className="w-full h-16 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[10px] rounded-t-sm ${getBarColor()} transition-all hover:opacity-80`}
                    style={{ height: `${height}%` }}
                    title={`${prob}% - ${forecast.precipitation}mm`}
                  />
                </div>
                
                {/* Hour label */}
                <div className={`mt-1.5 text-center ${isCurrentHour ? 'font-semibold' : ''}`}>
                  <span className={`text-[11px] ${isCurrentHour ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                    {format(forecast.time, "HH", { locale: fr })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Scale indicator */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-blue-300/70" />
              <span className="text-[10px] text-muted-foreground">&lt;30%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-blue-400" />
              <span className="text-[10px] text-muted-foreground">30-60%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">&gt;60%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
