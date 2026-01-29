import { EnterpriseConfig, defaultLabels, defaultFeatures, defaultRoutes } from './types';
import logoLimogeRevillon from '@/assets/logo-limoge-revillon.png';

export const limogeRevillonConfig: EnterpriseConfig = {
  id: 'limoge-revillon-id', // Sera remplacé par l'UUID réel
  slug: 'limoge-revillon',
  nom: 'Limoge Revillon',
  shortName: 'LR',
  dossierRef: 'C093195', // Référence dossier pour export Excel RH
  
  labels: {
    ...defaultLabels,
    // Personnalisations spécifiques si nécessaire
  },
  
  features: {
    ...defaultFeatures,
    contrainteVendredi12h: false, // TEMPORAIREMENT DÉSACTIVÉ pour test - remettre à true après
    ratioGlobal: true, // Actif: saisie des ratios journaliers (M3 béton, ML voile, M2 coffrage, météo)
    pointsMeteo: true, // Actif: bouton météo avec radar et prévisions 12h
  },
  
  routes: {
    ...defaultRoutes,
    // Routes par défaut
  },
  
  theme: {
    primaryColor: '#ea580c', // Orange
    logo: logoLimogeRevillon,
  },
  
  secteur: 'gros-oeuvre',
  description: 'Entreprise de gros œuvre - Construction',
};
