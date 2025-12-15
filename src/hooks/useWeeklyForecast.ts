import { useQuery } from "@tanstack/react-query";

export interface DailyForecast {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windGustsMax: number;
  weatherCode: number;
}

export interface ChantierForecast {
  chantierId: string;
  chantierNom: string;
  codeChantier: string | null;
  conducteurNom: string | null;
  ville: string;
  forecasts: DailyForecast[];
  error?: string;
}

interface GeocodingResult {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}

interface ForecastApiResponse {
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_gusts_10m_max: number[];
    weather_code: number[];
  };
}

async function geocodeCity(ville: string): Promise<{ lat: number; lng: number } | null> {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr&format=json`
  );
  
  if (!response.ok) return null;
  
  const data: GeocodingResult = await response.json();
  
  if (!data.results || data.results.length === 0) return null;
  
  return {
    lat: data.results[0].latitude,
    lng: data.results[0].longitude,
  };
}

async function fetchWeeklyForecast(lat: number, lng: number): Promise<DailyForecast[]> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,weather_code&timezone=Europe/Paris&forecast_days=14`
  );
  
  if (!response.ok) {
    throw new Error("Erreur lors de la récupération des prévisions");
  }
  
  const data: ForecastApiResponse = await response.json();
  
  // Filter only weekdays (Monday=1 to Friday=5)
  return data.daily.time
    .map((date, index) => ({
      date,
      temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
      temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
      precipitationSum: Math.round(data.daily.precipitation_sum[index] * 10) / 10,
      precipitationProbabilityMax: Math.round(data.daily.precipitation_probability_max[index]),
      windGustsMax: Math.round(data.daily.wind_gusts_10m_max[index]),
      weatherCode: data.daily.weather_code[index],
    }))
    .filter(forecast => {
      const dayOfWeek = new Date(forecast.date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    })
    .slice(0, 5); // Next 5 weekdays
}

interface Chantier {
  id: string;
  nom: string;
  code_chantier: string | null;
  ville: string | null;
  actif: boolean | null;
  conducteur?: { id: string; nom: string | null; prenom: string | null } | null;
}

function getConducteurNom(chantier: Chantier): string | null {
  if (!chantier.conducteur) return null;
  const { prenom, nom } = chantier.conducteur;
  if (prenom && nom) return `${prenom} ${nom}`;
  return prenom || nom || null;
}

async function fetchAllChantierForecasts(chantiers: Chantier[]): Promise<ChantierForecast[]> {
  const activeChantiers = chantiers.filter(c => c.actif !== false);
  
  const results = await Promise.all(
    activeChantiers.map(async (chantier): Promise<ChantierForecast> => {
      const conducteurNom = getConducteurNom(chantier);
      
      if (!chantier.ville) {
        return {
          chantierId: chantier.id,
          chantierNom: chantier.nom,
          codeChantier: chantier.code_chantier,
          conducteurNom,
          ville: "",
          forecasts: [],
          error: "Ville non renseignée",
        };
      }
      
      const coords = await geocodeCity(chantier.ville);
      
      if (!coords) {
        return {
          chantierId: chantier.id,
          chantierNom: chantier.nom,
          codeChantier: chantier.code_chantier,
          conducteurNom,
          ville: chantier.ville,
          forecasts: [],
          error: `Ville "${chantier.ville}" introuvable`,
        };
      }
      
      try {
        const forecasts = await fetchWeeklyForecast(coords.lat, coords.lng);
        return {
          chantierId: chantier.id,
          chantierNom: chantier.nom,
          codeChantier: chantier.code_chantier,
          conducteurNom,
          ville: chantier.ville,
          forecasts,
        };
      } catch {
        return {
          chantierId: chantier.id,
          chantierNom: chantier.nom,
          codeChantier: chantier.code_chantier,
          conducteurNom,
          ville: chantier.ville,
          forecasts: [],
          error: "Erreur de récupération des données météo",
        };
      }
    })
  );
  
  return results;
}

export function useWeeklyForecast(chantiers: Chantier[] | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["weekly-forecast", chantiers?.map(c => c.id).join(",")],
    queryFn: () => fetchAllChantierForecasts(chantiers || []),
    enabled: enabled && !!chantiers && chantiers.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 heure
    retry: 1,
  });
}
