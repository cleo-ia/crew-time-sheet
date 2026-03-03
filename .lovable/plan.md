

## Correction : S09 ne doit pas apparaitre dans Mars

### Le problème

Quand tu filtres par "Mars 2026", le système vérifie si une semaine **chevauche** le mois. Pour S09 (lundi 23 fév → dimanche 1er mars), le dimanche 1er mars tombe dans le mois, donc S09 apparait.

Sauf que tes employés ne travaillent **pas le samedi ni le dimanche**. Les jours ouvrés de S09 (lundi-vendredi) sont **tous en février**. Donc S09 n'a rien à faire dans mars.

### La correction

Actuellement le code regarde **lundi → dimanche** (7 jours). Il faut changer pour regarder **lundi → vendredi** (5 jours ouvrés seulement).

**3 endroits à modifier, tous avec le même changement :**

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/hooks/rhShared.ts` | 347-348 | `fridayOfWeek = monday + 4 jours` | Déjà correct (utilise vendredi) |
| `src/components/rh/RHFilters.tsx` | 81-84 | `dimanche = lundi + 6 jours` | `vendredi = lundi + 4 jours` |
| `src/hooks/useRHData.ts` | 217-220 | `dimanche = lundi + 6 jours` | `vendredi = lundi + 4 jours` |

En fait `rhShared.ts` utilise **déjà vendredi** (ligne 348 : `+ 4`). Donc seuls **2 fichiers** sont à corriger :

1. **RHFilters.tsx** (le filtre de semaines dans le dropdown)
2. **useRHData.ts** (le filtre de fiches dans les détails et la clôture)

Le changement est identique dans les deux : remplacer `addDays(lundi, 6)` (dimanche) par `addDays(lundi, 4)` (vendredi).

### Résultat

Avec le filtre "Mars 2026", S09 disparaitra car son vendredi (27 février) est avant le 1er mars.

