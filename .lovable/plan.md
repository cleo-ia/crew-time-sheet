

## Nettoyage du code mort `filters.conducteur` dans rhShared.ts et useRHData.ts

### Fichiers modifiés

**1. `src/hooks/rhShared.ts`** — 2 blocs à supprimer
- **Lignes 251-254** : supprimer le bloc `// Filtre par conducteur (via chantier)`
- **Lignes 417-420** : supprimer le bloc `// Filtre par conducteur pour finisseurs`

**2. `src/hooks/useRHData.ts`** — 3 blocs à supprimer
- **Lignes 199-201** : supprimer le bloc `if (filters.conducteur ...)` dans `useRHDetails`
- **Lignes 666-686** : supprimer tout le bloc `// 🔥 CORRECTION: Filtre Conducteur post-requête` dans `useRHEmployeeDetail`, et remplacer par `let filteredFiches = fiches || [];` (qui existe déjà ligne 667)
- **Lignes 744-746** : supprimer le bloc `if (filters.conducteur ...)` sur `affQueryDates`

### Fichier NON touché
- `useFiches.ts` — son filtre conducteur sert à la page Validation Conducteur, indépendant de la vue RH.

### Sécurité
Aucune régression : ces blocs ne s'exécutaient déjà plus car `filters.conducteur` n'est plus jamais défini depuis le retrait du filtre UI. On supprime uniquement du code mort.

