
# Corriger la validation transport : ne verifier que les jours d'affectation reels

## Probleme

La fonction `checkAllFinisseursTransportComplete` (ligne 548-550) calcule les 5 dates de la semaine (Lundi a Vendredi) et verifie chaque jour pour chaque chantier. Si un chantier n'a que 2 jours d'affectation (ex: Me/V pour VILOGIA), la validation echoue car elle cherche des vehicules pour les 3 autres jours non-assignes.

## Correction

### Fichier : `src/pages/ValidationConducteur.tsx` (lignes 548-550)

Remplacer le calcul fixe des 5 dates par un filtrage base sur les `affectationsJours` pour chaque chantier.

**Avant** (ligne 548-550) :
```
const monday = parseISOWeek(selectedWeek);
const weekDates = [0, 1, 2, 3, 4].map(d => format(addDays(monday, d), "yyyy-MM-dd"));
```

**Apres** : supprimer ces 2 lignes et calculer les dates par chantier a l'interieur de la boucle `for (const chantierId of chantierIds)`.

A la ligne 567-589, remplacer la boucle `for (const date of weekDates)` par :

```text
// Dates d'affectation reelles pour CE chantier
const chantierDates = [...new Set(
  affectationsJours
    ?.filter(a => a.chantier_id === chantierId)
    ?.map(a => a.date) || []
)];

// Parmi ces dates, garder celles ou au moins 1 finisseur travaille
const workedDays: string[] = [];
for (const date of chantierDates) {
  let hasWorker = false;
  for (const finisseur of finisseurs) {
    if (!chantierFinisseursIds.has(finisseur.id)) continue;
    const ficheJour = finisseur.ficheJours?.find(j => j.date === date);
    const isAbsent = ficheJour && (ficheJour.HNORM || 0) === 0 && (ficheJour.HI || 0) === 0;
    if (!isAbsent) { hasWorker = true; break; }
  }
  if (hasWorker) workedDays.push(date);
}
```

Le reste de la fonction (lignes 591-645) reste identique : elle itere sur `workedDays` qui contient maintenant seulement les jours effectivement assignes au chantier.

## Impact

- VILOGIA (Me/V) : la validation ne verifiera que 2 jours au lieu de 5
- AMBERIEU (L/M/J) : la validation ne verifiera que 3 jours au lieu de 5
- La collecte de signatures ne sera plus bloquee par des jours non-assignes
- Aucun changement en base de donnees
