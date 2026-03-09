

## Analyse de risque : Retrait du filtre métier

### Vérification effectuée

`filterMetier` et `filteredRows` n'existent que dans `RHPreExport.tsx` — aucun autre fichier n'y fait référence. Le changement est entièrement contenu dans un seul composant.

### Points de remplacement (tous dans `RHPreExport.tsx`)

| Ligne | Actuel | Nouveau |
|-------|--------|---------|
| 153 | `const [filterMetier, setFilterMetier] = useState("all")` | Supprimé |
| 389-393 | `const filteredRows = useMemo(...)` | Supprimé |
| 361 | `filteredRows.length === 0` | `rows.length === 0` |
| 369 | `filteredRows.map(row => ...)` | `rows.map(row => ...)` |
| 649-661 | Bloc `<Select>` filtre métier | Supprimé |
| 662 | `disabled={... filteredRows.length === 0}` | `disabled={... rows.length === 0}` |
| 667 | `{filteredRows.length} / {rows.length}` | `{rows.length} salarié(s)` |
| 723 | `filteredRows.map((row) => {` | `rows.map((row) => {` |
| 724 | `const realIndex = rows.indexOf(row)` | Simplifié en index direct du `.map` |

### Risque de régression : aucun

- Le `dashboardStats` utilise déjà `rows`, pas `filteredRows` — pas impacté
- Le `handleSaveModifications` utilise `rows` — pas impacté
- Le `handleCellChange` utilise `rows[rowIndex]` — pas impacté, et le `realIndex` hack (ligne 724) disparaît car `rows.map` donne directement le bon index
- L'export Excel utilisera `rows` (tous les salariés) ce qui est le comportement souhaité pour l'export de paie complet
- Aucun composant parent ne passe ou ne lit `filterMetier`

### Ce qui est supprimé
- 1 state (`filterMetier`)
- 1 useMemo (`filteredRows`)
- 1 composant Select (6 lignes de JSX)
- Le compteur "X / Y" simplifié en "X salariés"

C'est un changement purement soustractif, sans effet de bord.

