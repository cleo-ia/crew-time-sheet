
# Plan : Ajouter février 2026 (et les mois futurs proches) aux filtres RH

## Problème identifié

Le sélecteur de période génère uniquement les 12 derniers mois **passés** avec `subMonths(today, i)`. Comme nous sommes le 26 janvier 2026, février 2026 n'apparaît pas car il est dans le futur.

Or, la semaine S06 (2-8 février 2026) appartient au mois de février 2026, donc les heures supplémentaires de cette semaine n'apparaîtront jamais tant que février n'est pas sélectionnable.

## Solution

Modifier la génération des mois pour inclure **le mois suivant** en plus des 12 mois passés, ce qui permettra de voir les données des premières semaines d'un nouveau mois avant qu'il ne commence officiellement.

## Modification prévue

### Fichier : `src/components/rh/RHFilters.tsx`

**Lignes 47-58 - Ajout de `addMonths` à l'import et modification de la logique :**

```typescript
// Avant (ligne 9)
import { format, subMonths, startOfMonth, endOfMonth, parse, addDays } from "date-fns";

// Après
import { format, subMonths, addMonths, startOfMonth, endOfMonth, parse, addDays } from "date-fns";
```

```typescript
// Avant (lignes 47-58)
const derniersMois = useMemo(() => {
  const mois = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(today, i);
    mois.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: fr })
    });
  }
  return mois;
}, []);

// Après
const derniersMois = useMemo(() => {
  const mois = [];
  const today = new Date();
  
  // Ajouter le mois suivant (pour voir les données des semaines à cheval)
  const moisSuivant = addMonths(today, 1);
  mois.push({
    value: format(moisSuivant, "yyyy-MM"),
    label: format(moisSuivant, "MMMM yyyy", { locale: fr })
  });
  
  // Puis les 12 derniers mois (dont le mois courant)
  for (let i = 0; i < 12; i++) {
    const date = subMonths(today, i);
    mois.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: fr })
    });
  }
  return mois;
}, []);
```

## Résultat attendu

Le dropdown des périodes affichera maintenant :
- **février 2026** ← Nouveau (mois suivant)
- janvier 2026 (mois courant)
- décembre 2025
- novembre 2025
- ... (9 mois supplémentaires)

En sélectionnant **février 2026**, les données de la semaine S06 (2-8 février) seront incluses et les heures supplémentaires calculées apparaîtront dans le pré-export Excel.

## Note technique

Le calcul des heures supp dépend aussi des valeurs `heures_supp_mensualisees` dans la base. Si ces valeurs sont à NULL, le seuil restera 35h et toute heure au-delà sera comptée comme supplémentaire (5h de HS 25% pour 40h travaillées).
