import { EnterpriseConfig, defaultLabels, defaultFeatures, defaultRoutes } from './types';
import logoEngoBourgogne from '@/assets/logo-engo-bourgogne.png';

export const engoBourgogneConfig: EnterpriseConfig = {
  id: 'engo-bourgogne-id', // Sera remplacé par l'UUID réel
  slug: 'engo-bourgogne',
  nom: 'Engo Bourgogne',
  shortName: 'EB',
  
  labels: {
    ...defaultLabels,
    // Labels adaptés au secteur CVC/Électricité
    macon: 'Technicien',
    macons: 'Techniciens',
    finisseur: 'Technicien spécialisé',
    finisseurs: 'Techniciens spécialisés',
    chantier: 'Intervention',
    chantiers: 'Interventions',
    fiche: 'Rapport',
    fiches: 'Rapports',
    saisieHeures: 'Saisie des interventions',
  },
  
  features: {
    ...defaultFeatures,
    // Fonctionnalités adaptées au secteur CVC/Électricité
    finisseurs: false, // Pas de finisseurs dans ce secteur
    grutiers: false, // Pas de grutiers
    grandDeplacement: false, // À confirmer
    
    // Fonctionnalités potentiellement spécifiques à ajouter :
    // interventions: true,
    // contratsMaintenance: true,
  },
  
  routes: {
    ...defaultRoutes,
    // Routes potentiellement personnalisées
    // saisieHeures: '/interventions',
    
    // Pages spécifiques à Engo Bourgogne (à implémenter)
    customPages: [
      // Exemples de pages futures :
      // {
      //   path: '/interventions',
      //   component: 'InterventionsPage',
      //   label: 'Interventions',
      //   roles: ['chef', 'conducteur'],
      // },
      // {
      //   path: '/contrats-maintenance',
      //   component: 'ContratsMaintenance',
      //   label: 'Contrats de maintenance',
      //   roles: ['admin', 'rh'],
      // },
    ],
  },
  
  theme: {
    primaryColor: '#ea580c', // À personnaliser si besoin
    logo: logoEngoBourgogne,
  },
  
  secteur: 'cvc-electricite',
  description: 'CVC • Plomberie • Ventilation • Électricité • Photovoltaïque',
};
