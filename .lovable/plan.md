
# Correction : Déduplication "Détail jour par jour" dans useRHData.ts

## Problème

Dans `useRHData.ts`, la fonction `useRHEmployeeDetail` construit un tableau `dailyDetails` en récupérant **tous les `fiches_jours`** de toutes les fiches d'un employé, sans jamais vérifier si deux entrées correspondent à la même date.

Pour BOUSHABI Mohamed en S06, cela produit :
- Mardi 03/02 → ligne VILOGIA (0h, pas de type d'absence) — entrée fantôme créée en Legacy Mode
- Mardi 03/02 → ligne AMBERIEU (8h) — le jour réellement travaillé

Les deux apparaissent dans le tableau, d'où le doublon visible.

## Solution

Ajouter une étape de déduplication **après le `.sort()`** (ligne 800) et **avant le calcul du `summary`** (ligne 802).

### Règle de priorité (par ordre décroissant)
1. Entrée avec `heures > 0` → c'est le jour réellement travaillé
2. Entrée avec `typeAbsence` renseigné → absence qualifiée (CP, AT, etc.)
3. Entrée à 0h sans type d'absence → fantôme/placeholder (à supprimer si une meilleure entrée existe)

### Fichier modifié

**`src/hooks/useRHData.ts`** — entre la ligne 800 et 802, insérer :

```typescript
// 🔥 DÉDUPLICATION multi-chantier : pour chaque date, ne garder qu'une seule entrée
// Priorité : heures > 0 > absence qualifiée > fantôme (0h sans type d'absence)
const deduplicatedDetails = dailyDetails.reduce((acc, jour) => {
  const existingIdx = acc.findIndex(d => d.date === jour.date);
  if (existingIdx === -1) {
    acc.push(jour);
    return acc;
  }
  const existing = acc[existingIdx];
  const existingHasHours = existing.heuresNormales > 0 || existing.heuresIntemperies > 0;
  const newHasHours = jour.heuresNormales > 0 || jour.heuresIntemperies > 0;

  if (newHasHours && !existingHasHours) {
    // Remplacer le fantôme par la ligne avec heures réelles
    acc[existingIdx] = jour;
  } else if (!newHasHours && !existingHasHours && jour.typeAbsence && !existing.typeAbsence) {
    // Remplacer un fantôme non qualifié par un avec type d'absence
    acc[existingIdx] = jour;
  }
  // Sinon : ignorer le doublon (l'entrée existante est déjà meilleure)
  return acc;
}, [] as typeof dailyDetails);
```

Puis remplacer `dailyDetails` par `deduplicatedDetails` dans :
- Le calcul du `summary` (ligne 803–808)
- Le retour final `dailyDetails:` (ligne 837)

## Tableau des cas couverts

| Scénario | Résultat |
|---|---|
| Mardi 03/02 : 8h AMBERIEU + 0h VILOGIA fantôme | Garde 8h AMBERIEU → supprime fantôme ✅ |
| Date avec CP + fantôme 0h | Garde CP ✅ |
| Date avec 2 fantômes 0h sans type | Garde le premier (neutre, sans effet) ✅ |
| Employé mono-chantier, une seule entrée par date | Aucun changement ✅ |
| Date avec 2 vraies absences qualifiées différentes | Garde la première rencontrée (cas très rare) ✅ |

## Périmètre d'impact

- **Uniquement l'affichage** dans la vue "Détail jour par jour" de `ConsultationRH`
- Aucune donnée en base n'est modifiée
- Les fiches fantômes restent en base (inoffensives car à 0h) mais n'apparaissent plus à l'écran
- Tous les employés multi-chantiers (BOUSHABI et autres) bénéficient de la correction

## Données en base non touchées

La ligne fantôme `fiche_jour` à 0h sur VILOGIA reste en base. Elle ne fausse pas les totaux (0h + 8h = 8h) et la correction d'affichage suffit. Un nettoyage SQL ciblé pourrait être envisagé séparément si nécessaire.
