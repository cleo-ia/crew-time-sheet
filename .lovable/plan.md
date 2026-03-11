

## Plan : Rendre les indicateurs d'absence cliquables dans le dialog d'ajout d'employé

### Contexte

Dans `AddEmployeeToPlanningDialog`, les badges rouges d'absence (AT, CP...) a cote du nom et les cases rouges par jour ne sont pas cliquables. On veut qu'un clic ouvre le detail du conge ou de l'absence longue duree, comme sur la grille principale.

### Modifications

**1. `src/components/planning/AddEmployeeToPlanningDialog.tsx`**

- Ajouter un nouveau prop `onAbsenceClick?: (employeId: string, date: string) => void`
- Enrichir le prop `absencesLDByEmploye` pour inclure les `details` (deja disponible dans le type `AbsenceLD` du hook) : `Map<string, AbsenceLD>` au lieu de `Map<string, { dates: Set<string>; type: string }>`
- Rendre le **badge type absence** (ligne ~389-393, le Badge "destructive" a cote du nom) cliquable : au clic, appeler `onAbsenceClick(employe.id, firstAbsenceDate)` pour ouvrir le detail
- Rendre les **cases jour rouges** (lignes ~399-419 et ~424-444, les div rouges `isAbsent`) cliquables : au clic, appeler `onAbsenceClick(employe.id, day.date)` avec `e.stopPropagation()` pour ne pas selectionner l'employe
- Ajouter `cursor-pointer` sur ces elements et un hover visuel

**2. `src/pages/PlanningMainOeuvre.tsx`**

- Passer `onAbsenceClick={handleAbsenceClick}` au composant `AddEmployeeToPlanningDialog`
- Mettre a jour le type du prop `absencesLDByEmploye` passe au dialog pour inclure les `details`

### Resume

2 fichiers modifies. Les badges d'absence et les cases jour rouges dans le dialog d'ajout seront cliquables et ouvriront le meme dialog de detail que sur la grille principale.

