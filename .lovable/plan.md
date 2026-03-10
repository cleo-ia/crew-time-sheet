

## Design Épuré & Sémantique — Dashboard Export Paie

### 1. Cartes uniformes et sobres

Supprimer toutes les `border-l-4 border-[hsl(...)]` des 4 cartes. Appliquer un style neutre uniforme :
- `border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow`
- Chiffres en `text-slate-900 dark:text-foreground`

### 2. Couleur = signal uniquement

**Salariés** : Icône `text-blue-500` (informationnelle)
**Chantiers** : Icône `text-orange-500` (informationnelle)

**Fiches validées (dynamique)** :
- Si `nbFichesValidees === nbFichesTotal` → bordure `border-l-4 border-green-500` + icône `CheckCircle2` verte
- Sinon → bordure `border-l-4 border-orange-400` + icône `AlertTriangle` orange

**Statut (dynamique)** :
- "Ouverte" → `Badge variant="outline"` avec `border-blue-500 text-blue-600`
- "Clôturée" → `Badge variant="destructive"`

### 3. Détails discrets

- Icône `Info` : `h-3 w-3 text-muted-foreground/40` (plus petite, plus grise)
- Texte "Dernière clôture" : conserver `text-xs text-muted-foreground` (déjà discret)

### Fichier modifié
- `src/pages/ExportPaie.tsx` (lignes 292-328)

Import à ajouter : `AlertTriangle` depuis lucide-react.

