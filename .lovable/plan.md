

## Plan : Bordures colorées sur les cartes KPI

Remplacer les fonds pastel par des bordures gauches colorées (`border-l-4`) en gardant le fond neutre par défaut (`bg-card`). Conserver les couleurs d'icônes.

### Modifications dans `src/pages/ExportPaie.tsx` (lignes 292-328)

| Carte | Avant | Après |
|-------|-------|-------|
| Salariés | `bg-[hsl(210_90%_96%)]...` | `border-l-4 border-[hsl(210_85%_50%)]` |
| Fiches validées | `bg-[hsl(142_70%_96%)]...` | `border-l-4 border-[hsl(142_71%_45%)]` |
| Chantiers | `bg-[hsl(25_90%_96%)]...` | `border-l-4 border-[hsl(25_95%_53%)]` |
| Statut | `bg-[hsl(270_40%_96%)]...` | `border-l-4 border-[hsl(270_60%_55%)]` |

Les icônes gardent leurs couleurs actuelles. Le fond redevient neutre (pas de classe `bg-*` custom).

### Fichier modifié
- `src/pages/ExportPaie.tsx`

