
# Plan : Corriger l'affichage GD et Absent dans "Modifier les données"

## Diagnostic

Les données sont **correctement sauvegardées** en base de données :
- Paul MANUNTA : `code_trajet = "GD"` pour les 5 jours
- Steven PIN : `heures = 0` pour lundi et mardi

Le problème se situe dans la fonction `convertFichesToTimeEntries()` du fichier `src/components/validation/FicheDetail.tsx` qui transforme les données brutes en format attendu par `TimeEntryTable`. Cette fonction ne calcule pas correctement :

1. La propriété `grandDeplacement` (manquante)
2. La propriété `absent` (toujours false)
3. La propriété `trajet` (ne respecte pas l'exclusivité)

## Solution

Corriger la fonction `convertFichesToTimeEntries()` pour aligner sa logique sur celle de `TimeEntryTable.tsx` (lignes 569-589).

## Modification

**Fichier : `src/components/validation/FicheDetail.tsx`**

**Lignes 293-312** - Ajouter les calculs manquants :

Avant :
```typescript
const jourData = fiche.fiches_jours?.find((fj: any) => fj.date === dateStr);

const hasCodeChantier = !!jourData?.code_chantier_du_jour;

days[dayName] = {
  hours: jourData?.heures || 0,
  overtime: 0,
  absent: false,
  panierRepas: jourData?.PA || false,
  repasType: jourData?.repas_type || null,
  trajet: jourData?.trajet_perso || (jourData?.code_trajet && jourData.code_trajet !== ''),
  trajetPerso: jourData?.trajet_perso === true,
  codeTrajet: jourData?.code_trajet || null,
  heuresIntemperie: jourData?.HI || 0,
  // ...
};
```

Après :
```typescript
const jourData = fiche.fiches_jours?.find((fj: any) => fj.date === dateStr);

const hasCodeChantier = !!jourData?.code_chantier_du_jour;

// Calculs pour l'exclusivité Trajet / Trajet Perso / GD
const hours = jourData?.heures || 0;
const HI = jourData?.HI || 0;
const PA = !!jourData?.PA;
const isTrajetPerso = !!jourData?.trajet_perso || jourData?.code_trajet === "T_PERSO";
const isGD = jourData?.code_trajet === "GD";

days[dayName] = {
  hours,
  overtime: 0,
  absent: hours === 0 && !PA && HI === 0,
  panierRepas: PA,
  repasType: jourData?.repas_type || null,
  trajet: (isTrajetPerso || isGD) ? false : true,
  trajetPerso: isTrajetPerso,
  grandDeplacement: isGD,
  codeTrajet: jourData?.code_trajet || null,
  heuresIntemperie: HI,
  // ...
};
```

## Résultat attendu

| Employé | Avant | Après |
|---------|-------|-------|
| Paul MANUNTA | Trajet coché (incorrect) | GD coché (correct) |
| Steven PIN | Absent non visible | Lundi/Mardi marqués absents |

## Impact

- Correction uniquement dans `FicheDetail.tsx`
- Affecte l'affichage "Modifier les données" côté conducteur
- Affecte l'historique chef (car `ChefFicheDetailDialog` utilise aussi `FicheDetail`)
- Aucun impact sur la sauvegarde (déjà correcte)
