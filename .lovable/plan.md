

# Fix : Permettre la suppression des finisseurs/utilisateurs

## Probleme

La suppression de "Chetail David" echoue car il est reference comme `conducteur_matin_id` ou `conducteur_soir_id` dans `fiches_transport_finisseurs_jours`. Les FK actuelles sont en `NO ACTION`, ce qui bloque le DELETE.

## Solution

Une seule migration SQL qui :
1. Drop les 2 contraintes existantes
2. Les recree avec `ON DELETE SET NULL`

```sql
ALTER TABLE fiches_transport_finisseurs_jours
  DROP CONSTRAINT fiches_transport_finisseurs_jours_conducteur_matin_id_fkey;

ALTER TABLE fiches_transport_finisseurs_jours
  ADD CONSTRAINT fiches_transport_finisseurs_jours_conducteur_matin_id_fkey
  FOREIGN KEY (conducteur_matin_id) REFERENCES utilisateurs(id) ON DELETE SET NULL;

ALTER TABLE fiches_transport_finisseurs_jours
  DROP CONSTRAINT fiches_transport_finisseurs_jours_conducteur_soir_id_fkey;

ALTER TABLE fiches_transport_finisseurs_jours
  ADD CONSTRAINT fiches_transport_finisseurs_jours_conducteur_soir_id_fkey
  FOREIGN KEY (conducteur_soir_id) REFERENCES utilisateurs(id) ON DELETE SET NULL;
```

## Impact

- Les colonnes `conducteur_matin_id` et `conducteur_soir_id` sont deja **nullable** → compatible
- **Aucune donnee supprimee** : seules les references sont mises a NULL
- **Aucun code a modifier** : le front gere deja les valeurs null pour ces champs
- **1 seul fichier** : migration SQL

