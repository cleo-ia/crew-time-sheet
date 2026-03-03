

## Correction du bouton "Vider le cache" sur la page Planning

### Problème
Le bouton actuel utilise `Trash2`, un dynamic import, et des classes différentes des autres pages.

### Correction (1 fichier)
**`src/pages/PlanningMainOeuvre.tsx`** — Remplacer le bloc du bouton (lignes 702-716) :

- Icône : `Trash2` → `RefreshCw` (déjà importé)
- Taille icône : `h-3 w-3` → `h-3.5 w-3.5`
- Variante : `ghost` → `outline`
- Classes : ajouter `text-muted-foreground` comme les autres pages
- Container : `container mx-auto px-4 py-6` → `flex justify-center py-6`
- Comportement : ajouter `confirm(...)` + appel direct `clearCacheAndReload()` (importer depuis `useClearCache`)
- Retirer l'import `Trash2` devenu inutile

