import { useQuery } from "@tanstack/react-query";

export interface WeatherData {
  temperature: number;
  temperatureApparente: number;
  humidite: number;
  ventVitesse: number;
  ventDirection: number;
  precipitations: number;
  weatherCode: number;
  uvIndex: number | null;
  nuages: number;
  pression: number;
  ville: string;
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

interface GeocodingResult {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}

interface CurrentWeatherResult {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    surface_pressure: number;
  };
  daily?: {
    uv_index_max?: number[];
  };
}

async function fetchWeather(ville: string): Promise<WeatherData> {
  // 1. Géocodage : convertir la ville en coordonnées
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr&format=json`
  );
  
  if (!geoResponse.ok) {
    throw new Error("Erreur lors du géocodage");
  }
  
  const geoData: GeocodingResult = await geoResponse.json();
  
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Ville "${ville}" non trouvée`);
  }
  
  const { latitude, longitude, name } = geoData.results[0];
  
  // 2. Récupérer la météo actuelle
  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&daily=uv_index_max&timezone=Europe/Paris`
  );
  
  if (!weatherResponse.ok) {
    throw new Error("Erreur lors de la récupération de la météo");
  }
  
  const weatherData: CurrentWeatherResult = await weatherResponse.json();
  
  return {
    temperature: Math.round(weatherData.current.temperature_2m),
    temperatureApparente: Math.round(weatherData.current.apparent_temperature),
    humidite: Math.round(weatherData.current.relative_humidity_2m),
    ventVitesse: Math.round(weatherData.current.wind_speed_10m),
    ventDirection: weatherData.current.wind_direction_10m,
    precipitations: weatherData.current.precipitation,
    weatherCode: weatherData.current.weather_code,
    uvIndex: weatherData.daily?.uv_index_max?.[0] ?? null,
    nuages: weatherData.current.cloud_cover,
    pression: Math.round(weatherData.current.surface_pressure),
    ville: name,
    latitude,
    longitude,
    updatedAt: new Date(),
  };
}

export function useWeather(ville: string | null | undefined) {
  return useQuery({
    queryKey: ["weather", ville],
    queryFn: () => fetchWeather(ville!),
    enabled: !!ville && ville.trim().length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 heure
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
