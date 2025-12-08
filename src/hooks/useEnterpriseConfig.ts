import { useMemo } from 'react';
import { getEnterpriseConfig, EnterpriseConfig } from '@/config/enterprises';

/**
 * Hook pour accéder à la configuration de l'entreprise courante
 * Utilise le slug stocké dans localStorage après login
 */
export function useEnterpriseConfig(): EnterpriseConfig {
  return useMemo(() => {
    return getEnterpriseConfig();
  }, []);
}

/**
 * Hook pour vérifier si une feature est activée
 */
export function useFeatureEnabled(featureName: keyof EnterpriseConfig['features']): boolean {
  const config = useEnterpriseConfig();
  return config.features[featureName] ?? true;
}

/**
 * Hook pour récupérer un label personnalisé
 */
export function useLabel(labelKey: keyof EnterpriseConfig['labels']): string {
  const config = useEnterpriseConfig();
  return config.labels[labelKey];
}

/**
 * Hook pour récupérer plusieurs labels
 */
export function useLabels<K extends keyof EnterpriseConfig['labels']>(
  labelKeys: K[]
): Pick<EnterpriseConfig['labels'], K> {
  const config = useEnterpriseConfig();
  return useMemo(() => {
    const result = {} as Pick<EnterpriseConfig['labels'], K>;
    for (const key of labelKeys) {
      result[key] = config.labels[key];
    }
    return result;
  }, [config, labelKeys]);
}

/**
 * Hook pour vérifier le secteur de l'entreprise
 */
export function useEnterpriseSector(): EnterpriseConfig['secteur'] {
  const config = useEnterpriseConfig();
  return config.secteur;
}
