import { EnterpriseConfig, defaultLabels, defaultFeatures, defaultRoutes } from './types';
import logoSder from '@/assets/logo-sder.png';

export const sderConfig: EnterpriseConfig = {
  id: 'sder-id', // Sera remplacé par l'UUID réel
  slug: 'sder',
  nom: 'SDER',
  
  labels: {
    ...defaultLabels,
    // Mêmes labels que Limoge Revillon (même secteur)
  },
  
  features: {
    ...defaultFeatures,
    // Mêmes fonctionnalités que Limoge Revillon (même secteur)
    // Points météo activé pour SDER
    pointsMeteo: true,
  },
  
  routes: {
    ...defaultRoutes,
    // Routes par défaut
  },
  
  theme: {
    primaryColor: '#ea580c', // Orange (peut être personnalisé)
    logo: logoSder,
  },
  
  secteur: 'gros-oeuvre',
  description: 'Entreprise de gros œuvre - Construction',
};
