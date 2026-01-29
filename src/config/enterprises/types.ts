// Types pour la configuration par entreprise

export interface EnterpriseLabels {
  // Rôles métier
  macon: string;
  macons: string;
  finisseur: string;
  finisseurs: string;
  chef: string;
  chefs: string;
  conducteur: string;
  conducteurs: string;
  grutier: string;
  grutiers: string;
  
  // Entités
  chantier: string;
  chantiers: string;
  fiche: string;
  fiches: string;
  
  // Actions
  saisieHeures: string;
  validation: string;
}

export interface EnterpriseFeatures {
  // Modules activés/désactivés
  finisseurs: boolean;
  grutiers: boolean;
  interimaires: boolean;
  transport: boolean;
  grandDeplacement: boolean;
  
  // Fonctionnalités Rentabilité
  rentabilite: boolean;
  achats: boolean;
  
  // Planning
  ganttPlanning: boolean;
  todos: boolean;
  
  // Workflow
  signatureChef: boolean;
  signatureConducteur: boolean;
  validationRH: boolean;
  
  // Contraintes temporelles
  contrainteVendredi12h: boolean; // Bloque transmission avant vendredi 12h pour semaine courante
  
  // Ratios journaliers (M3 béton, ML voile, M2 coffrage, météo) - Limoge Revillon uniquement
  ratioGlobal: boolean;
  
  // Points météo quotidien basé sur la ville du chantier
  pointsMeteo: boolean;
  
  // Demande de transport matériaux vers le dépôt
  transportMateriaux: boolean;
}

export interface EnterpriseRoutes {
  // Routes personnalisées (null = utiliser route par défaut)
  saisieHeures: string | null;
  validation: string | null;
  signature: string | null;
  
  // Pages spécifiques à cette entreprise
  customPages?: {
    path: string;
    component: string; // Nom du composant à charger
    label: string;
    roles: string[];
  }[];
}

export interface EnterpriseTheme {
  primaryColor: string;
  logo: string;
}

export interface EnterpriseConfig {
  id: string;
  slug: string;
  nom: string;
  shortName: string; // Abréviation courte (2-4 caractères) ex: "LR", "SDER", "EB"
  dossierRef?: string; // Référence dossier pour export Excel RH (ex: "C093195")
  
  // Configuration
  labels: EnterpriseLabels;
  features: EnterpriseFeatures;
  routes: EnterpriseRoutes;
  theme: EnterpriseTheme;
  
  // Métadonnées
  secteur: 'gros-oeuvre' | 'cvc-electricite' | 'autre';
  description?: string;
}

// Config par défaut (base pour toutes les entreprises)
export const defaultLabels: EnterpriseLabels = {
  macon: 'Maçon',
  macons: 'Maçons',
  finisseur: 'Finisseur',
  finisseurs: 'Finisseurs',
  chef: 'Chef de chantier',
  chefs: 'Chefs de chantier',
  conducteur: 'Conducteur de travaux',
  conducteurs: 'Conducteurs de travaux',
  grutier: 'Grutier',
  grutiers: 'Grutiers',
  chantier: 'Chantier',
  chantiers: 'Chantiers',
  fiche: 'Fiche',
  fiches: 'Fiches',
  saisieHeures: 'Saisie des heures',
  validation: 'Validation',
};

export const defaultFeatures: EnterpriseFeatures = {
  finisseurs: true,
  grutiers: true,
  interimaires: true,
  transport: true,
  grandDeplacement: true,
  rentabilite: true,
  achats: true,
  ganttPlanning: true,
  todos: true,
  signatureChef: true,
  signatureConducteur: true,
  validationRH: true,
  contrainteVendredi12h: false, // Désactivé par défaut pour les tests
  ratioGlobal: false, // Désactivé par défaut, activé uniquement pour Limoge Revillon
  pointsMeteo: false, // Désactivé par défaut
  transportMateriaux: true, // Demandes de transport matériaux vers le dépôt
};

export const defaultRoutes: EnterpriseRoutes = {
  saisieHeures: null,
  validation: null,
  signature: null,
  customPages: [],
};
