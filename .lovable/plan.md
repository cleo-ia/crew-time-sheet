
# Plan : Rendre l'export Excel RH dynamique par entreprise

## Contexte

Actuellement, l'export Excel RH (`src/lib/excelExport.ts`) affiche en dur **"Dossier C093195 / LIMOGE REVILLON"** à la ligne 180. Cela pose problème pour SDER et Engo Bourgogne qui verront le mauvais nom d'entreprise dans leurs exports.

Le logo SDER existe déjà dans `src/assets/logo-sder.png` et est correctement référencé dans la configuration SDER.

---

## Modifications à effectuer

### 1. Modifier la signature de `generateRHExcel` (excelExport.ts)

Ajouter un paramètre optionnel `options` pour passer les informations de l'entreprise :

```typescript
interface ExcelExportOptions {
  entrepriseNom?: string;
  dossierRef?: string;  // Ex: "C093195" pour Limoge, autre ref pour SDER
}

export const generateRHExcel = async (
  data: RHExportEmployee[], 
  mois: string, 
  filePrefix?: string,
  options?: ExcelExportOptions
): Promise<string>
```

### 2. Remplacer le texte codé en dur (ligne 180)

Remplacer :
```typescript
headerRow1[0] = "Dossier C093195 / LIMOGE REVILLON";
```

Par :
```typescript
const entrepriseNom = options?.entrepriseNom || 'LIMOGE REVILLON';
const dossierRef = options?.dossierRef || 'C093195';
headerRow1[0] = `Dossier ${dossierRef} / ${entrepriseNom}`;
```

### 3. Mettre à jour l'appel depuis RHPreExport.tsx

Dans `RHPreExport.tsx`, importer le hook `useEnterpriseConfig` et passer les informations à `generateRHExcel` :

```typescript
// Import existant de useEnterpriseConfig
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";

// Dans le composant
const enterpriseConfig = useEnterpriseConfig();

// Dans handleExport
const filename = await generateRHExcel(mergedData, filters.periode || "", undefined, {
  entrepriseNom: enterpriseConfig?.nom,
});
```

### 4. (Optionnel) Ajouter un numéro de dossier par entreprise

Si chaque entreprise a un numéro de dossier différent, on peut l'ajouter à la configuration dans `src/config/enterprises/types.ts` :

```typescript
export interface EnterpriseConfig {
  // ... existant
  dossierRef?: string;  // Numéro de dossier paie
}
```

Et le définir dans chaque config d'entreprise.

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/lib/excelExport.ts` | Ajouter interface options + rendre le header dynamique |
| `src/components/rh/RHPreExport.tsx` | Passer le nom de l'entreprise via useEnterpriseConfig |
| `src/config/enterprises/types.ts` | (Optionnel) Ajouter champ `dossierRef` |
| `src/config/enterprises/sder.ts` | (Optionnel) Définir `dossierRef` pour SDER |
| `src/config/enterprises/limoge-revillon.ts` | (Optionnel) Définir `dossierRef` |

---

## Résultat attendu

- **Export SDER** : Affiche **"Dossier XXXXXX / SDER"** (ou juste "SDER" si pas de numéro)
- **Export Limoge Revillon** : Continue d'afficher **"Dossier C093195 / LIMOGE REVILLON"**
- **Export Engo Bourgogne** : Affichera le nom correct quand utilisé

---

## Question

As-tu un numéro de dossier spécifique pour SDER (équivalent au "C093195" de Limoge Revillon) ? Sinon, je peux simplement afficher "SDER" sans numéro de dossier, ou utiliser un format générique.
