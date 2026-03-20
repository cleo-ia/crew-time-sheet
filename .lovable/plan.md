

## Correction des erreurs de build — attributs dupliqués dans main.tsx et App.tsx

### Problème
Le système de build Lovable injecte deux fois les attributs `data-lov-*` et `data-component-*` sur les composants JSX dans `main.tsx` et `App.tsx`, ce qui bloque le build.

### Solution
Réécrire les deux fichiers avec un contenu source propre. Le système réinjectera automatiquement les attributs une seule fois.

### Fichiers modifiés

1. **`src/main.tsx`** — Réécriture propre de la ligne `createRoot(...).render(<App />)`
2. **`src/App.tsx`** — Réécriture propre du composant (contenu identique, sans attributs dupliqués)

Aucun changement fonctionnel — uniquement un nettoyage pour débloquer le build.

