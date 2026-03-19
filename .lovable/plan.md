

## Problème identifié

**Fichier :** `src/components/rh/RHEmployeeDetail.tsx`, lignes 354-358

Le filtre `sameSiteDays` ne retient que les jours **sans code trajet** (ou `A_COMPLETER`) :

```text
const sameSiteDays = data.dailyDetails.filter(
  d => d.chantier === day.chantier && 
       d.ficheJourId !== day.ficheJourId &&
       (!((d as any).codeTrajet) || (d as any).codeTrajet === 'A_COMPLETER')
);
```

Résultat : quand tous les jours ont déjà un code trajet renseigné, `sameSiteDays` est vide → `batchDaysCount = 1` → le dialog "Appliquer à tous les jours ?" ne s'affiche jamais.

## Correction

Retirer la condition qui exclut les jours ayant déjà un code trajet. Le filtre doit uniquement garder les jours sur le même chantier (hors jour courant) :

```ts
const sameSiteDays = data.dailyDetails.filter(
  d => d.chantier === day.chantier && 
       d.ficheJourId !== day.ficheJourId &&
       !((d as any).isAbsent)
);
```

On exclut seulement les jours absents (qui n'ont pas de sens pour un code trajet).

**1 fichier modifié** : `src/components/rh/RHEmployeeDetail.tsx` (2 lignes changées).

