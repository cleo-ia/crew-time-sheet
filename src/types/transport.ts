// ===== TYPES DE CODE TRAJET =====
export type CodeTrajet = 
  | "A_COMPLETER"  // À compléter par RH
  | "T_PERSO"      // Voiture personnelle
  | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "T8" | "T9" 
  | "T10" | "T11" | "T12" | "T13" | "T14" | "T15" | "T16" | "T17"
  | "T31" | "T35"  // Trajets spéciaux
  | "GD";          // Grand déplacement

export const CODE_TRAJET_OPTIONS: { value: CodeTrajet | "AUCUN"; label: string }[] = [
  { value: "AUCUN", label: "Aucun" },
  { value: "A_COMPLETER", label: "⚠️ À compléter (RH)" },
  { value: "T_PERSO", label: "T Perso (voiture perso)" },
  { value: "T1", label: "T1" },
  { value: "T2", label: "T2" },
  { value: "T3", label: "T3" },
  { value: "T4", label: "T4" },
  { value: "T5", label: "T5" },
  { value: "T6", label: "T6" },
  { value: "T7", label: "T7" },
  { value: "T8", label: "T8" },
  { value: "T9", label: "T9" },
  { value: "T10", label: "T10" },
  { value: "T11", label: "T11" },
  { value: "T12", label: "T12" },
  { value: "T13", label: "T13" },
  { value: "T14", label: "T14" },
  { value: "T15", label: "T15" },
  { value: "T16", label: "T16" },
  { value: "T17", label: "T17" },
  { value: "T31", label: "T31" },
  { value: "T35", label: "T35" },
  { value: "GD", label: "GD (grand déplacement)" },
];

export interface TransportDay {
  date: string;
  conducteurAllerId: string;
  conducteurAllerNom: string;
  conducteurRetourId: string;
  conducteurRetourNom: string;
  immatriculation: string;
  codeChantierDuJour?: string;
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
