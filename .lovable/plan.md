

## Refonte Step 2 — Mode Pré-chargement

### Contexte actuel
Le Step 2 (lignes 352-363) affiche directement `<RHPreExport>` sans état intermédiaire. Il faut ajouter un état "pré-chargement" avec une Hero Card avant que l'utilisateur décide de charger les données.

### Modifications dans `src/pages/ExportPaie.tsx`

**1. Nouvel état**
- Ajouter `const [dataLoaded, setDataLoaded] = useState(false)` — reset à `false` quand `periode` change.

**2. Imports à ajouter**
- `Database`, `ChevronRight`, `Truck`, `BarChart3` depuis `lucide-react`

**3. Remplacer le bloc Step 2 (lignes 352-363)**

Quand `!dataLoaded` : afficher la Hero Card centrée :
- **Card** blanche avec `shadow-sm`, `max-w-lg mx-auto`, `text-center`, padding généreux
- **Icône** `Database` dans un cercle `bg-blue-50 text-blue-500` centré (`w-16 h-16 rounded-full flex items-center justify-center mx-auto`)
- **Titre** : `"Prêt à analyser les données de {periodeLabel}"` en `text-xl font-semibold`
- **Sous-titre** : `"Le système va compiler les heures, paniers et trajets pour préparer votre export."` en `text-sm text-muted-foreground`
- **Grille décorative** : 3 colonnes avec icônes grises (`Clock`, `Truck`, `BarChart3`) + labels discrets ("Heures & Paniers", "Trajets & Zones", "Totaux par Chantier") en `text-xs text-muted-foreground`
- **Bouton** : `size="lg"` avec `bg-slate-900 hover:bg-slate-800` + texte "Charger les données" + `ChevronRight` avec `group-hover:translate-x-1 transition-transform`
- **Footer** : `"L'analyse prend généralement moins de 3 secondes."` en `text-xs text-muted-foreground/60`

Quand `dataLoaded` : afficher le contenu actuel (titre + RHPreExport).

### Fichier modifié
- `src/pages/ExportPaie.tsx`

