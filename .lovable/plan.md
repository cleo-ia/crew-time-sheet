

## Plan : Rendre les indicateurs d'absence/congé cliquables sur le planning

Quand un employé a un indicateur d'absence (icône `Ban`) sur un jour dans le planning, un clic dessus ouvrira un dialog montrant le détail de la demande de congé ou de l'absence longue durée.

### Approche

Enrichir les données d'absence pour transporter l'identifiant et la source (congé vs ALD), puis ajouter un callback de clic qui ouvre le dialog approprié.

### Modifications

**1. `src/hooks/useAbsencesLongueDureePlanning.ts`** — Enrichir `AbsenceLD`

- Ajouter à l'interface `AbsenceLD` un champ `details` : `Map<string, { source: "conge" | "ald"; id: string }>` (date → source + record ID)
- Modifier les requêtes pour inclure l'`id` des records
- Lors du merge, stocker `source` et `id` par date dans la map `details`

**2. `src/components/planning/PlanningEmployeRow.tsx`** — Rendre `AbsenceIndicator` cliquable

- Ajouter un prop `onAbsenceClick?: (employeId: string, date: string) => void`
- Transformer `AbsenceIndicator` en bouton cliquable qui appelle `onAbsenceClick`
- Changer le cursor de `cursor-help` à `cursor-pointer`

**3. `src/components/planning/PlanningChantierAccordion.tsx`** — Propager le callback

- Ajouter un prop `onAbsenceClick?: (employeId: string, date: string) => void`
- Le transmettre à chaque `PlanningEmployeRow`

**4. `src/pages/PlanningMainOeuvre.tsx`** — Gérer l'ouverture du dialog

- Ajouter deux states : `selectedConge` (DemandeConge | null) et `selectedAbsenceLD` (AbsenceLongueDuree | null)
- Implémenter `handleAbsenceClick(employeId, date)` qui lit `absencesLDByEmploye` pour trouver le `source`/`id`, puis fetch le record complet et ouvre le bon dialog
- Ajouter `DemandeCongeDetailDialog` (déjà existant) pour les congés
- Ajouter un dialog simple pour les ALD (réutiliser le pattern `AbsenceCard` de `AbsencesLongueDureeSheet`)
- Passer `onAbsenceClick` à chaque `PlanningChantierAccordion`

### Résumé

4 fichiers modifiés. L'utilisateur pourra cliquer sur n'importe quel indicateur d'absence dans le planning pour voir instantanément le détail du congé ou de l'absence longue durée correspondante.

