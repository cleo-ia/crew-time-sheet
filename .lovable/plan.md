

## Ajout du filtre par rôle dans l'onglet Historique

**Fichier** : `src/components/admin/HistoriqueManager.tsx`

### Changements

1. Ajouter une constante `ROLE_OPTIONS` avec les valeurs : all, admin, gestionnaire, rh, conducteur, chef
2. Ajouter un state `roleFilter` initialisé à `"all"`
3. Ajouter un `<Select>` "Rôle" dans la barre de filtres (après "Type d'action")
4. Filtrer côté client les `modifications` par `user_role` quand `roleFilter !== "all"`
5. Passer les données filtrées aux stats et au composant `ModificationHistoryTable`

Aucune autre modification. Pas de changement backend, hook, ou migration.

