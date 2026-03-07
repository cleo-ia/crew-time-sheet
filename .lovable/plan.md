

# Revert : Annuler le SET NULL sur les FK de fiches_transport_finisseurs_jours

## Probleme

La migration precedente a change les FK `conducteur_matin_id` et `conducteur_soir_id` de `NO ACTION` vers `SET NULL`, ce qui cree un conflit entre le chemin CASCADE (qui supprime les lignes) et le SET NULL (qui tente de les UPDATE en meme temps).

## Solution

Une nouvelle migration SQL qui remet les deux FK en `NO ACTION` (comportement par defaut, comme avant) :

```sql
ALTER TABLE fiches_transport_finisseurs_jours
  DROP CONSTRAINT fiches_transport_finisseurs_jours_conducteur_matin_id_fkey;

ALTER TABLE fiches_transport_finisseurs_jours
  ADD CONSTRAINT fiches_transport_finisseurs_jours_conducteur_matin_id_fkey
  FOREIGN KEY (conducteur_matin_id) REFERENCES utilisateurs(id);

ALTER TABLE fiches_transport_finisseurs_jours
  DROP CONSTRAINT fiches_transport_finisseurs_jours_conducteur_soir_id_fkey;

ALTER TABLE fiches_transport_finisseurs_jours
  ADD CONSTRAINT fiches_transport_finisseurs_jours_conducteur_soir_id_fkey
  FOREIGN KEY (conducteur_soir_id) REFERENCES utilisateurs(id);
```

## Impact

- Retour a l'etat exact d'avant le fix
- 1 seul fichier : migration SQL
- Aucun code modifie

