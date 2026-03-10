

## Ajouter des couleurs pastel aux 4 cartes KPI

Appliquer un fond pastel subtil à chaque carte, cohérent avec le design system existant (variables CSS HSL du thème).

### Modifications dans `src/pages/ExportPaie.tsx`

| Carte | Couleur | Classe ajoutée |
|-------|---------|----------------|
| Salariés (Users) | Bleu pastel | `bg-[hsl(210_90%_96%)] dark:bg-[hsl(210_50%_18%)]` |
| Fiches validées | Vert pastel | `bg-[hsl(142_70%_96%)] dark:bg-[hsl(142_40%_18%)]` |
| Chantiers | Orange pastel | `bg-[hsl(25_90%_96%)] dark:bg-[hsl(25_50%_18%)]` |
| Statut | Gris/violet pastel | `bg-[hsl(270_40%_96%)] dark:bg-[hsl(270_25%_18%)]` |

Également colorer les icônes pour matcher : bleu, vert, orange, violet.

### Fichier modifié

| Fichier | Action |
|---------|--------|
| `src/pages/ExportPaie.tsx` | Ajouter les classes de fond pastel + couleur d'icône sur chaque `Card` |

