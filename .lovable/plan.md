

## Purge du formulaire d'inventaire transmis pour le chantier "test"

### Données à supprimer

Le rapport transmis identifié :
- **Report ID** : `45bc1c2f-480e-4edd-8582-690a70306fdb`
- **Chantier** : test (CI000)
- **Items** : 8 lignes dans `inventory_items`

### Actions (via migration SQL)

1. Supprimer les 8 lignes de `inventory_items` liées au report
2. Supprimer le `inventory_report` lui-même

```sql
DELETE FROM inventory_items WHERE report_id = '45bc1c2f-480e-4edd-8582-690a70306fdb';
DELETE FROM inventory_reports WHERE id = '45bc1c2f-480e-4edd-8582-690a70306fdb';
```

Cela permettra de recréer un nouveau rapport depuis zéro pour tester.

