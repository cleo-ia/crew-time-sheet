

## Nettoyage fiche parasite GUNDUZ Erdal - S13

### Vérifications effectuées
- Fiche parasite confirmée : `4b08e51e-433c-4acb-b1db-4d8a9d66d0c5` (OLYMPIA, BROUILLON, 39h)
- 5 fiches_jours associées (23-27 mars)
- 0 signatures associées
- Fiche ghost ALD intacte : `d768dd3a-f3ae-4f92-95c6-4a95de2b63eb` (NULL chantier, 0h, ENVOYE_RH)

### Migration SQL

```sql
-- Supprimer les 5 fiches_jours de la fiche parasite
DELETE FROM fiches_jours WHERE fiche_id = '4b08e51e-433c-4acb-b1db-4d8a9d66d0c5';
-- Supprimer la fiche parasite elle-même
DELETE FROM fiches WHERE id = '4b08e51e-433c-4acb-b1db-4d8a9d66d0c5';
```

### Fichier modifie
- Nouvelle migration SQL avec les 2 DELETE ci-dessus

### Impact
- Seule la fiche ghost ALD (0h) restera pour GUNDUZ sur S13
- Aucun impact sur les autres salariés ou semaines

