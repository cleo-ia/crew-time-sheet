

## Chargement Immersif — Skeleton Screen + Barre de progression

### Résumé
Remplacer le flash de l'écran intermédiaire par un skeleton screen immersif qui imite la structure du tableau, avec une barre de progression animée en haut.

### Modifications

**1. Créer `src/components/rh/RHPreExportSkeleton.tsx`**
- Composant autonome qui reproduit la structure visuelle du tableau RHPreExport :
  - 5 cards skeleton en grille (imitant les dashboard stats : Salariés, Heures, etc.)
  - Une toolbar skeleton (boutons Save/Reset/Export grisés)
  - Un tableau fantôme : header avec 6-7 colonnes grises, puis 8-10 lignes de rectangles `animate-pulse` de largeurs variées
  - Petits cercles gris à gauche de chaque ligne (imitant avatars/icônes)
- Barre de progression animée de 2px en haut du composant (`Progress` avec valeur indéterminée ou animation CSS `translateX` en boucle)

**2. Modifier `src/components/rh/RHPreExport.tsx`**
- Ligne 589-602 : remplacer le bloc `if (!isDataLoaded)` par :
  - Si `autoLoad` est `true` : retourner `<RHPreExportSkeleton />` (jamais l'écran avec bouton)
  - Si `autoLoad` est `false` : garder l'écran actuel avec le bouton "Charger les données"
- Pendant `isLoading` (après clic manuel aussi) : afficher le skeleton au lieu du simple "Chargement..."

**3. Barre de progression globale**
- Intégrée directement dans le skeleton : une barre fine animée (`h-0.5 bg-primary`) avec une animation CSS `indeterminate` (translateX de -100% à 100% en boucle) placée tout en haut du composant skeleton.

### Fichiers
- **Créer** : `src/components/rh/RHPreExportSkeleton.tsx`
- **Modifier** : `src/components/rh/RHPreExport.tsx`

