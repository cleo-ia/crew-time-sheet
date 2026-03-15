
Objectif
- Supprimer définitivement “À qualifier” pour les chefs multi-chantier quand ils ont 0h sur le chantier filtré mais des heures sur un autre chantier.

Diagnostic confirmé
- Le hook `useRHData.ts` met bien `jour.isAbsent = false` dans ce cas.
- Mais l’UI RH recalcule encore l’absence à partir de `heuresNormales === 0` (au lieu d’utiliser `day.isAbsent`), donc elle réaffiche le select “À qualifier”.
- Points à corriger: `RHEmployeeDetail.tsx` (calcul local d’absence + props `EditableAbsenceTypeCell`) et cohérence du dialog semaine.

Plan de correction
1) `src/components/rh/RHEmployeeDetail.tsx`
- Remplacer les calculs locaux d’absence par la source de vérité:
  - `const isAbsent = Boolean((day as any).isAbsent)` (avec fallback uniquement si besoin).
- Réutiliser ce `isAbsent` partout:
  - style ligne rouge,
  - fallback read-only “À qualifier”,
  - `EditableAbsenceTypeCell isAbsent`,
  - disable panier/trajet/trajet perso.
- Dans le résumé hebdo (`weeklyData`), arrêter de déduire l’absence via 0h et utiliser `day.isAbsent`.

2) `src/components/rh/EditableAbsenceTypeCell.tsx`
- Étendre `allDays` avec `isAbsent`.
- Pour la propagation, utiliser `nextDay.isAbsent` (et non seulement `heuresNormales===0`) pour éviter de propager des absences sur des jours multi-site à 0h filtré mais non absents.

3) `src/components/rh/RHWeekDetailDialog.tsx`
- Ajouter `isAbsent?: boolean` dans `DayDetail`.
- Calcul local: `const isAbsent = day.isAbsent ?? (fallback ancien)`.
- Garder l’affichage cohérent avec la table principale.

4) Passage des données vers le dialog
- Dans `RHEmployeeDetail.tsx` (mapping `days` pour `RHWeekDetailDialog`), transmettre `isAbsent: (day as any).isAbsent`.

Résultat attendu
- Filtre DAVOULT + chef multi-chantier: lignes à 0h affichées sans “Absent” ni “À qualifier” si heures sur autre chantier.
- Les vraies absences (0h partout) continuent d’afficher “À qualifier” tant que non typées.
