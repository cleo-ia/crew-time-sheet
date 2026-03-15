

# Audit : Jours d'affectation des chefs dans le planning

## Problème

Le planning traite les chefs comme des ouvriers pour la sélection des jours : le conducteur peut choisir L,M,M sur un chantier et J,V sur un autre. Or, un chef multi-chantiers doit être affecté **5/5 jours sur chaque chantier** pour pouvoir répartir ses heures librement.

### Endroits impactés

| # | Composant | Problème |
|---|-----------|----------|
| 1 | `AddEmployeeToPlanningDialog` (ligne 246-251) | Quand on sélectionne un chef, les jours disponibles sont pré-cochés mais **décochables** |
| 2 | `AddEmployeeToPlanningDialog` (ligne 472-494) | Les checkboxes jour par jour sont actives pour les chefs |
| 3 | `AddEmployeeToPlanningDialog` (ligne 282-291) | Le mode multi-sélection utilise `commonDays` qui peut exclure des jours pour les chefs |
| 4 | `PlanningEmployeRow` (ligne 280-287) | Le `DayIndicator` permet de toggle un jour pour un chef déjà affiché sur la grille |
| 5 | `PlanningMainOeuvre.tsx` `handleDayToggle` (ligne 231-263) | Permet de décocher un jour pour un chef |
| 6 | Sync Edge Function (ligne 821) | Itère `joursPlanning` pour créer les `fiches_jours` — si seulement 3 jours sont dans le planning, seuls 3 jours sont créés |

### Conséquence concrète

Si DORAZIO est affecté L,M,M sur MASSILLY et J,V sur CAPUCINES :
- La sync crée des `fiches_jours` uniquement pour les jours affectés
- Le chef ne peut pas saisir d'heures sur MASSILLY le jeudi/vendredi (pas de ligne)
- La consolidation RH ne voit que 3 jours sur MASSILLY au lieu de 5

---

## Plan de correction

### 1. `AddEmployeeToPlanningDialog` — Forcer 5/5 pour les chefs

**Fichier** : `src/components/planning/AddEmployeeToPlanningDialog.tsx`

- Dans `handleSelectEmploye` : si l'employé est un chef, forcer `selectedDays` à tous les jours de la semaine (ignorer les conflits multi-chantiers, garder le blocage absences LD)
- Dans le rendu des checkboxes jour (ligne 472-494) : si l'employé sélectionné est un chef, rendre les checkboxes **disabled + checked** (lecture seule)
- Dans `handleBatchAdd` : si un employé du batch est un chef, forcer ses jours à 5/5 (filtrer uniquement les absences LD)

### 2. `PlanningEmployeRow` — Verrouiller les jours pour les chefs

**Fichier** : `src/components/planning/PlanningEmployeRow.tsx`

- Ajouter une prop `lockDays?: boolean` (ou réutiliser `isChef`)
- Si `isChef === true` : le `DayIndicator` est rendu `disabled` → pas de toggle possible
- Le bouton supprimer (retrait complet de la ligne) reste actif

### 3. `PlanningMainOeuvre.tsx` — Garde-fou dans handleDayToggle

**Fichier** : `src/pages/PlanningMainOeuvre.tsx`

- Dans `handleDayToggle` : vérifier si l'employé est un chef. Si oui et `checked === false` (tentative de décocher), bloquer avec un toast d'explication.

### Fichiers modifiés

1. `src/components/planning/AddEmployeeToPlanningDialog.tsx` — forcer 5 jours + checkboxes disabled pour chefs
2. `src/components/planning/PlanningEmployeRow.tsx` — `DayIndicator` disabled pour chefs
3. `src/pages/PlanningMainOeuvre.tsx` — garde-fou dans `handleDayToggle`

### Ce qui ne change PAS

- Le bouton "Supprimer" (retrait complet du chef d'un chantier) reste fonctionnel
- La logique de la sync Edge Function n'a pas besoin de changer (si les 5 jours sont bien dans `planning_affectations`, elle les traitera correctement)
- Les ouvriers/finisseurs/grutiers/intérimaires gardent le comportement actuel (jours décochables)

