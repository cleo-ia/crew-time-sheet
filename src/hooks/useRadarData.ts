import { useQuery } from "@tanstack/react-query";

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarData {
  host: string;
  pastFrames: RadarFrame[];
  nowcastFrames: RadarFrame[];
  allFrames: RadarFrame[];
}

interface RainViewerResponse {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: { time: number; path: string }[];
    nowcast: { time: number; path: string }[];
  };
}

async function fetchRadarData(): Promise<RadarData> {
  const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
  
  if (!response.ok) {
    throw new Error("Erreur lors de la récupération des données radar");
  }
  
  const data: RainViewerResponse = await response.json();
  
  const pastFrames = data.radar.past.map(frame => ({
    time: frame.time,
    path: frame.path,
  }));
  
  const nowcastFrames = data.radar.nowcast.map(frame => ({
    time: frame.time,
    path: frame.path,
  }));
  
  return {
    host: data.host,
    pastFrames,
    nowcastFrames,
    allFrames: [...pastFrames, ...nowcastFrames],
  };
}

export function useRadarData() {
  return useQuery({
    queryKey: ["radar-data"],
    queryFn: fetchRadarData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
