import { Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog, Wind, Snowflake } from "lucide-react";

// Mapping des codes météo Open-Meteo vers les icônes et descriptions
// https://open-meteo.com/en/docs#weathervariables

export interface WeatherInfo {
  icon: typeof Sun;
  description: string;
  severity: 'good' | 'moderate' | 'bad';
}

export const weatherCodeMap: Record<number, WeatherInfo> = {
  // Clear sky
  0: { icon: Sun, description: "Ciel dégagé", severity: 'good' },
  
  // Mainly clear, partly cloudy, overcast
  1: { icon: CloudSun, description: "Principalement dégagé", severity: 'good' },
  2: { icon: CloudSun, description: "Partiellement nuageux", severity: 'good' },
  3: { icon: Cloud, description: "Couvert", severity: 'moderate' },
  
  // Fog
  45: { icon: CloudFog, description: "Brouillard", severity: 'moderate' },
  48: { icon: CloudFog, description: "Brouillard givrant", severity: 'bad' },
  
  // Drizzle
  51: { icon: CloudDrizzle, description: "Bruine légère", severity: 'moderate' },
  53: { icon: CloudDrizzle, description: "Bruine modérée", severity: 'moderate' },
  55: { icon: CloudDrizzle, description: "Bruine dense", severity: 'bad' },
  
  // Freezing drizzle
  56: { icon: CloudDrizzle, description: "Bruine verglaçante légère", severity: 'bad' },
  57: { icon: CloudDrizzle, description: "Bruine verglaçante dense", severity: 'bad' },
  
  // Rain
  61: { icon: CloudRain, description: "Pluie légère", severity: 'moderate' },
  63: { icon: CloudRain, description: "Pluie modérée", severity: 'moderate' },
  65: { icon: CloudRain, description: "Pluie forte", severity: 'bad' },
  
  // Freezing rain
  66: { icon: CloudRain, description: "Pluie verglaçante légère", severity: 'bad' },
  67: { icon: CloudRain, description: "Pluie verglaçante forte", severity: 'bad' },
  
  // Snow
  71: { icon: CloudSnow, description: "Neige légère", severity: 'moderate' },
  73: { icon: CloudSnow, description: "Neige modérée", severity: 'bad' },
  75: { icon: CloudSnow, description: "Neige forte", severity: 'bad' },
  
  // Snow grains
  77: { icon: Snowflake, description: "Grains de neige", severity: 'moderate' },
  
  // Rain showers
  80: { icon: CloudRain, description: "Averses légères", severity: 'moderate' },
  81: { icon: CloudRain, description: "Averses modérées", severity: 'moderate' },
  82: { icon: CloudRain, description: "Averses violentes", severity: 'bad' },
  
  // Snow showers
  85: { icon: CloudSnow, description: "Averses de neige légères", severity: 'moderate' },
  86: { icon: CloudSnow, description: "Averses de neige fortes", severity: 'bad' },
  
  // Thunderstorm
  95: { icon: CloudLightning, description: "Orage", severity: 'bad' },
  96: { icon: CloudLightning, description: "Orage avec grêle légère", severity: 'bad' },
  99: { icon: CloudLightning, description: "Orage avec grêle forte", severity: 'bad' },
};

export function getWeatherInfo(code: number): WeatherInfo {
  return weatherCodeMap[code] || { icon: Cloud, description: "Conditions inconnues", severity: 'moderate' };
}

// Direction du vent en français
export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Couleur selon la sévérité
export function getSeverityColor(severity: 'good' | 'moderate' | 'bad'): string {
  switch (severity) {
    case 'good':
      return 'text-green-500';
    case 'moderate':
      return 'text-amber-500';
    case 'bad':
      return 'text-red-500';
  }
}
