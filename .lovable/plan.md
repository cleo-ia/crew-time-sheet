## Plan : Verrouillage 5/5 jours pour les chefs dans le planning — IMPLÉMENTÉ ✅

### Problème
Le planning permettait au conducteur de sélectionner des jours individuels pour les chefs (ex: L,M,M sur un chantier et J,V sur un autre), empêchant la saisie d'heures sur certains jours et cassant la consolidation RH.

### Corrections apportées

1. **`AddEmployeeToPlanningDialog`** : 
   - Mode simple : quand un chef est sélectionné, tous les jours sont forcés (sauf absences LD) et les checkboxes sont verrouillées (disabled + 🔒)
   - `handleDayToggle` : bloqué pour les chefs
   - Mode batch : les chefs reçoivent automatiquement 5/5 jours, indépendamment des `commonDays`

2. **`PlanningEmployeRow`** : Le `DayIndicator` est `disabled` pour les chefs (`isChef` prop) → impossible de toggle un jour sur la grille

3. **`PlanningMainOeuvre`** : Garde-fou dans `handleDayToggle` : si un chef tente de décocher un jour, un toast explicatif apparaît et l'action est bloquée

### Ce qui ne change pas
- Le bouton "Supprimer" (retrait complet du chef d'un chantier) reste fonctionnel
- Les ouvriers/finisseurs/grutiers/intérimaires gardent le comportement actuel
- La sync Edge Function fonctionne correctement avec les 5 jours
