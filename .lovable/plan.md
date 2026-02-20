
# Vérification des corrections — Résultat

## Bilan : 3 fichiers corrects, 1 problème restant

---

## Ce qui a été correctement corrigé (3/4)

### `useMaconsByChantier.ts` — CORRECT
La table `affectations` (legacy) n'est plus utilisée nulle part. Le hook lit uniquement depuis `affectations_jours_chef`. Si la semaine n'a pas de données, il retourne une équipe vide. La correction est complète.

### `TimeEntryTable.tsx` — CORRECT
- Le chargement de `affectationsJoursChef` est maintenant toujours actif (pas conditionnel à `isPlanningActive`)
- Le bypass `if (!isPlanningActive) return true` a bien été supprimé
- L'import `usePlanningMode` a été retiré
- La vérification des jours autorisés s'applique toujours en mode chef

### `SignatureMacons.tsx` — CORRECT
- Les affectations sont chargées toujours (plus de `isPlanningActive ?`)
- Le filtrage par jours planifiés est appliqué systématiquement
- Le `if (!isPlanningActive) return macon` a bien été supprimé

### `TransportDayAccordion.tsx` — CORRECT
- La ligne `const affectationsJoursChef = isPlanningActive ? rawAffectationsJoursChef : []` a bien été remplacée
- `useAffectationsJoursByChef` est chargé sans condition

---

## Problème restant non corrigé : `useAutoSaveFiche.ts`

### Le bloc legacy est encore présent (lignes 314-316)

Code actuel dans le fichier :

```
// 🔥 MODE LEGACY : Si le planning n'est pas validé, tous les jours
if (!isPlanningActive) {
  selectedDays = [...workDays];  // ← 5 jours pour tout le monde sans vérification
} else {
  // ... logique planning correcte
}
```

Ce bloc fait que :
- Pour une semaine **non validée** → 5 fiches_jours créées pour chaque employé, ignorant complètement le planning
- Pour une semaine **validée** → logique correcte avec `affectations_jours_chef`

Les semaines S06, S07, S08, S09 (validées) fonctionnent correctement. Mais si un chef saisit sur une semaine non encore validée par le conducteur, la sauvegarde crée des jours fantômes.

### Également détecté : `Index.tsx` ligne 301
`usePlanningMode` est encore utilisé dans la page principale du chef pour `isPlanningActive`. Ce n'est pas bloquant (la variable n'est utilisée qu'à titre informatif pour les logs), mais il reste un vestige du mode legacy à nettoyer.

---

## Correction à apporter

### `useAutoSaveFiche.ts` — 1 seul bloc à modifier

Remplacer le bloc conditionnel :
```
// 🔥 MODE LEGACY : Si le planning n'est pas validé, tous les jours
if (!isPlanningActive) {
  selectedDays = [...workDays];
} else {
  // logique planning...
  let isChefHimself = ...
  ...
}
```

Par la logique planning directement (sans condition) :
```
// Mode planning complet : toujours vérifier affectations_jours_chef
// Le chef lui-même garde toujours 5 jours
let isChefHimself = entry.employeeId === chefId;
if (isChefHimself) {
  selectedDays = [...workDays];
  ...
}
// Si ce n'est pas le chef, vérifier les affectations
if (!isChefHimself) {
  ...
}
```

Supprimer aussi la vérification `isPlanningActive` et la requête `planning_validations` dans ce fichier (inutiles).

### `Index.tsx` — Nettoyage optionnel
Supprimer l'import et l'utilisation de `usePlanningMode` si la variable n'est utilisée que dans des logs. Vérifier si elle sert à autre chose avant de la retirer.

---

## Résumé

| Fichier | Statut |
|---|---|
| `useMaconsByChantier.ts` | Correct |
| `TimeEntryTable.tsx` | Correct |
| `SignatureMacons.tsx` | Correct |
| `TransportDayAccordion.tsx` | Correct |
| `useAutoSaveFiche.ts` | **À corriger — bloc legacy lignes 314-316 encore actif** |
| `Index.tsx` | Nettoyage mineur (`usePlanningMode` résiduel) |

La correction principale est dans `useAutoSaveFiche.ts` : supprimer le bloc `if (!isPlanningActive)` et appliquer la logique planning pour tous les maçons, quelle que soit la semaine.
