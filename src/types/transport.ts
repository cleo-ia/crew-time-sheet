export interface TransportDay {
  date: string;
  conducteurAllerId: string;
  conducteurAllerNom: string;
  conducteurRetourId: string;
  conducteurRetourNom: string;
  immatriculation: string;
}

export interface TransportSheet {
  id?: string;
  ficheId: string;
  semaine: string;
  chantierId: string;
  days: TransportDay[];
}

export interface SaveTransportParams {
  ficheId: string;
  semaine: string;
  chantierId: string;
  chefId: string;
  days: TransportDay[];
}

// NOUVEAUX TYPES V2 pour multi-véhicules
export interface TransportVehicle {
  id: string; // UUID temporaire pour React
  immatriculation: string;
  conducteurMatinId: string;
  conducteurMatinNom: string;
  conducteurSoirId: string;
  conducteurSoirNom: string;
}

export interface TransportDayV2 {
  date: string; // format "yyyy-MM-dd"
  vehicules: TransportVehicle[];
}

export interface TransportSheetV2 {
  id?: string;
  ficheId: string;
  semaine: string;
  chantierId: string | null;
  days: TransportDayV2[]; // 5 jours
}

export interface SaveTransportParamsV2 {
  ficheId: string;
  semaine: string;
  chantierId: string | null;
  chefId: string;
  days: TransportDayV2[];
  isDirty?: boolean;
}

// ===== TYPES POUR LES FINISSEURS =====
export interface TransportFinisseurDay {
  date: string; // format "yyyy-MM-dd"
  conducteurMatinId: string; // Toujours le finisseur
  conducteurSoirId: string;  // Toujours le finisseur
  immatriculation: string;   // Véhicule du jour (peut changer chaque jour)
  trajetPerso?: boolean;     // Indique si trajet personnel (voiture perso)
}

export interface TransportSheetFinisseur {
  id?: string;
  ficheId: string;
  finisseurId: string;
  semaine: string;
  days: TransportFinisseurDay[]; // 5 jours (Lundi-Vendredi)
}

export interface SaveTransportFinisseurParams {
  ficheId: string;
  finisseurId: string;
  conducteurId: string; // Le conducteur qui manage le finisseur
  semaine: string;
  days: TransportFinisseurDay[];
}
