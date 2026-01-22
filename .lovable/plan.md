
# Correction du calcul des semaines ISO pour les onglets Ventilation

## Problème identifié

La fonction `getWeeksInMonth` dans `src/hooks/useVentilationAnalytique.ts` calcule incorrectement les numéros de semaine ISO.

**Bug actuel pour janvier 2026 :**
- Code génère : `S00, S01, S02, S03, S04`
- Attendu (ISO 8601) : `S01, S02, S03, S04, S05`

**Conséquences :**
- SDER : Données S05 invisibles (ce que tu constates)
- Limoge Revillon : S02/S03 visibles actuellement, mais S05 serait manquante si ajoutée

## Vérification Limoge Revillon

Les données Limoge Revillon pour janvier 2026 (S02 et S03) sont partiellement visibles grâce à l'intersection avec le calcul bugué. Mais le problème se manifesterait dès qu'il y aurait des données en S05 (26-31 janvier).

## Solution technique

Remplacer le calcul manuel par les fonctions `date-fns` déjà installées (`getISOWeek`, `getISOWeekYear`) qui garantissent la conformité ISO 8601.

### Fichier à modifier

`src/hooks/useVentilationAnalytique.ts` (lignes 49-74)

### Nouveau code

```typescript
import { getISOWeek, getISOWeekYear } from "date-fns";

const getWeeksInMonth = (periode: string): string[] => {
  if (!periode || periode === "all") return [];
  
  const [year, month] = periode.split("-").map(Number);
  const weeks: string[] = [];
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const isoYear = getISOWeekYear(d);
    const isoWeek = getISOWeek(d);
    const weekStr = `${isoYear}-S${String(isoWeek).padStart(2, '0')}`;
    
    if (!weeks.includes(weekStr)) {
      weeks.push(weekStr);
    }
  }
  
  return weeks;
};
```

## Garantie pour tous les mois

| Mois 2026 | Semaines générées (corrigées) |
|-----------|------------------------------|
| Janvier | S01, S02, S03, S04, S05 |
| Février | S05, S06, S07, S08, S09 |
| Mars | S09, S10, S11, S12, S13, S14 |
| ... | ... |
| Décembre | S49, S50, S51, S52, S53 |

La bibliothèque `date-fns` gère automatiquement :
- Les années avec 52 ou 53 semaines
- Les transitions d'année (décembre S52/S53 vers janvier S01)
- Les cas où le 1er janvier appartient à la semaine 52 de l'année précédente

## Résultat attendu

Après correction :
- **SDER janvier 2026** : Les onglets Ventilation afficheront les données S05 (équipes Liam et Chloé)
- **Limoge Revillon** : Continuera à fonctionner pour S02/S03 et supportera S05 quand les données seront ajoutées
- **Tous les mois de l'année** : Calcul garanti conforme ISO 8601 grâce à date-fns
