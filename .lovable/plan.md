

## Plan : Amélioration visuelle de la vue détail agence

### Fichier modifié : `src/pages/RapprochementInterim.tsx` (lignes 124-217)

**1. Header amélioré** (lignes 135-147)
- Ajouter un fond subtil avec bordure basse : `border-b border-border/50 bg-muted/30 rounded-lg p-4`
- Bouton retour avec label "Retour" à côté de la flèche

**2. Cards récap colorées** (lignes 150-171)
- H. Normales : fond bleu (`bg-blue-50 dark:bg-blue-900/20`, valeur en `text-blue-700`)
- H. Supp 25% : fond orange (`bg-orange-50`, valeur en `text-orange-700`)
- H. Supp 50% : fond amber (`bg-amber-50`, valeur en `text-amber-700`)
- Paniers : fond emerald (`bg-emerald-50`, valeur en `text-emerald-700`)
- Trajets : fond violet (`bg-violet-50`, valeur en `text-violet-700`)

**3. Accordéons améliorés** (lignes 174-214)
- Ajouter icône `User` (lucide) à gauche du nom dans le trigger
- Colorer les badges chantier comme dans la liste principale (`bg-blue-50 text-blue-700 border-blue-200`)
- Renforcer la séparation : `border border-border rounded-lg` avec `shadow-sm` sur chaque item
- Réduire le spacing global : `space-y-3` au lieu de `space-y-2`

**4. Import supplémentaire**
- Ajouter `User` depuis `lucide-react`

