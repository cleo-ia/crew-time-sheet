

## Nettoyage de la fiche parasite GUNDUZ Erdal - S13

### Contexte
GUNDUZ Erdal est en ALD mais a une fiche parasite sur le chantier OLYMPIA pour S13 (statut BROUILLON, ID: `4b08e51e-433c-4acb-b1db-4d8a9d66d0c5`). Il faut supprimer cette fiche et ses fiches_jours associées.

### Actions

1. **Supprimer les fiches_jours** liées à la fiche parasite (`fiche_id = '4b08e51e-433c-4acb-b1db-4d8a9d66d0c5'`)
2. **Supprimer les signatures** éventuelles liées à cette fiche
3. **Supprimer la fiche** elle-même

### Détails techniques

Trois requêtes DELETE exécutées dans l'ordre (respect des dépendances) :

```sql
DELETE FROM fiches_jours WHERE fiche_id = '4b08e51e-433c-4acb-b1db-4d8a9d66d0c5';
DELETE FROM signatures WHERE fiche_id = '4b08e51e-433c-4acb-b1db-4d8a9d66d0c5';
DELETE FROM fiches WHERE id = '4b08e51e-433c-4acb-b1db-4d8a9d66d0c5';
```

La fiche ghost ALD (chantier_id NULL, 0h) restera intacte.

