

## Purge des 2 inventaires transmis

Pas de changement de code nécessaire. Exécution d'une migration SQL pour supprimer :

1. **16 `inventory_items`** liés aux 2 rapports
2. **2 `inventory_reports`** (CI000 test et CI002 test 2)

### SQL

```sql
DELETE FROM public.inventory_items 
WHERE report_id IN (
  '814c2cab-e1ce-46a2-ad76-29402fffe3c8',
  '5f2cacc0-502f-4abb-acea-c5645bbadeba'
);

DELETE FROM public.inventory_reports 
WHERE id IN (
  '814c2cab-e1ce-46a2-ad76-29402fffe3c8',
  '5f2cacc0-502f-4abb-acea-c5645bbadeba'
);
```

