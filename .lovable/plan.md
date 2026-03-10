

## Plan : Trier les cartes par rôle puis par nom

### Fichier à modifier
`src/components/admin/HistoriqueManager.tsx`

### Changement
Dans la section "Users grid" (L284-293), grouper les utilisateurs par rôle avant de les afficher :

1. Définir un ordre de rôles : `admin` → `gestionnaire` → `rh` → `conducteur` → `chef`
2. Grouper les `users` par `role` avec cet ordre
3. Pour chaque groupe, afficher un titre de section (badge du rôle) suivi des cartes triées alphabétiquement dans une grille

Le résultat : des sections visuelles séparées par rôle, chacune avec ses cartes triées par nom, pour une lecture plus harmonieuse.

### Détail technique
- Créer un `ROLE_ORDER` map pour le tri
- Utiliser `Object.groupBy` ou un reduce pour regrouper
- Rendre un `<div>` par groupe avec le label du rôle en `<h4>` + badge coloré, puis la grille de cartes
- Quand un filtre de rôle spécifique est actif (pas "Tous"), pas de section header nécessaire (un seul groupe)

