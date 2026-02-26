

## Plan : Purge des affectations parasites MAILLARD en S06

### Contexte
Le chantier MAILLARD (CI888, id `c8b507d6-f1ae-4c13-aee9-e069aca0358c`) a un chef assigné (BOUILLET) mais des enregistrements parasites existent dans `affectations_finisseurs_jours` pour S06, ce qui le fait apparaitre dans l'espace conducteur d'Anthony Lampert.

### Action
Executer une requete DELETE via l'outil d'insertion de donnees :

```sql
DELETE FROM affectations_finisseurs_jours
WHERE chantier_id = 'c8b507d6-f1ae-4c13-aee9-e069aca0358c'
AND semaine = '2026-S06';
```

### Verification post-purge
Confirmer avec un SELECT que plus aucune ligne n'existe pour MAILLARD S06 dans `affectations_finisseurs_jours`.

### Resultat attendu
MAILLARD disparait de l'espace conducteur d'Anthony en S06. Seul CHEVIGNY (sans chef) reste visible.

