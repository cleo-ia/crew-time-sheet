import { useQuery } from "@tanstack/react-query";

export interface HourlyForecast {
  time: Date;
  precipitationProbability: number;
  precipitation: number;
}

async function fetchHourlyForecast(latitude: number, longitude: number): Promise<HourlyForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability,precipitation&forecast_days=1&timezone=Europe%2FParis`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch hourly forecast");
  }
  
  const data = await response.json();
  
  const forecasts: HourlyForecast[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  
  // Get next 12 hours from current hour
  for (let i = currentHour; i < Math.min(currentHour + 12, data.hourly.time.length); i++) {
    forecasts.push({
      time: new Date(data.hourly.time[i]),
      precipitationProbability: data.hourly.precipitation_probability[i] || 0,
      precipitation: data.hourly.precipitation[i] || 0,
    });
  }
  
  return forecasts;
}

export function useHourlyForecast(latitude: number | undefined, longitude: number | undefined) {
  return useQuery({
    queryKey: ["hourly-forecast", latitude, longitude],
    queryFn: () => fetchHourlyForecast(latitude!, longitude!),
    enabled: !!latitude && !!longitude && !isNaN(latitude) && !isNaN(longitude),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}
