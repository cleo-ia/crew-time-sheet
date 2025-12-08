import { EnterpriseConfig } from './types';
import { limogeRevillonConfig } from './limoge-revillon';
import { sderConfig } from './sder';
import { engoBourgogneConfig } from './engo-bourgogne';

// Map des configurations par slug
export const enterpriseConfigs: Record<string, EnterpriseConfig> = {
  'limoge-revillon': limogeRevillonConfig,
  'sder': sderConfig,
  'engo-bourgogne': engoBourgogneConfig,
};

// Récupérer la config de l'entreprise courante
export function getEnterpriseConfig(slug?: string | null): EnterpriseConfig {
  const currentSlug = slug || localStorage.getItem('entreprise_slug') || 'limoge-revillon';
  return enterpriseConfigs[currentSlug] || limogeRevillonConfig;
}

// Récupérer la config par ID d'entreprise
export function getEnterpriseConfigById(entrepriseId?: string | null): EnterpriseConfig {
  // Pour l'instant, on utilise le slug stocké
  // À terme, on pourra mapper les UUIDs aux configs
  return getEnterpriseConfig();
}

// Vérifier si une feature est activée pour l'entreprise courante
export function isFeatureEnabled(featureName: keyof EnterpriseConfig['features']): boolean {
  const config = getEnterpriseConfig();
  return config.features[featureName] ?? true;
}

// Récupérer un label personnalisé
export function getLabel(labelKey: keyof EnterpriseConfig['labels']): string {
  const config = getEnterpriseConfig();
  return config.labels[labelKey];
}

// Exporter les types
export * from './types';
