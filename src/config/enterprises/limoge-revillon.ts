import { EnterpriseConfig, defaultLabels, defaultFeatures, defaultRoutes } from './types';
import logoLimogeRevillon from '@/assets/logo-limoge-revillon.png';

export const limogeRevillonConfig: EnterpriseConfig = {
  id: 'limoge-revillon-id', // Sera remplacé par l'UUID réel
  slug: 'limoge-revillon',
  nom: 'Limoge Revillon',
  
  labels: {
    ...defaultLabels,
    // Personnalisations spécifiques si nécessaire
  },
  
  features: {
    ...defaultFeatures,
    // Toutes les fonctionnalités activées pour Limoge Revillon
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
