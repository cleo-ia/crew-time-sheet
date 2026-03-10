

## Restreindre le gestionnaire en lecture seule sur les chantiers

### Approche

Ajouter une prop `readOnly` au composant `ChantiersManager`, puis la passer à `true` quand le rôle est `gestionnaire`.

### Modifications

**1. `src/components/admin/ChantiersManager.tsx`**
- Ajouter `readOnly?: boolean` dans `ChantiersManagerProps`
- Quand `readOnly` est `true` :
  - Masquer le bouton "Nouveau chantier"
  - Masquer les boutons Edit et Delete sur chaque ligne du tableau
  - Garder la navigation en double-clic vers le détail (lecture seule)

**2. `src/pages/AdminPanel.tsx`**
- Importer `useCurrentUserRole` (déjà utilisé)
- Passer `readOnly={userRole === "gestionnaire"}` au `<ChantiersManager />` dans l'onglet chantiers

**3. `src/pages/ChantierDetail.tsx`**
- Ajouter `"gestionnaire"` à la condition `isReadOnly` pour que le détail soit aussi en lecture seule :
  ```
  const isReadOnly = from === "chef" || userRole === "chef" || userRole === "gestionnaire";
  ```

Cela désactive création, modification et suppression pour le gestionnaire tout en préservant la consultation.

