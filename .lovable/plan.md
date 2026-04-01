
## Sécuriser la sauvegarde inventaire (remplacer DELETE+INSERT par upsert transactionnel)

### Problème actuel
Le hook `useUpsertInventoryItems` fait un **DELETE de tous les items** puis un **INSERT** en deux requêtes séparées. Si le réseau coupe entre les deux, les données sont perdues définitivement.

### Solution : fonction SQL `SECURITY DEFINER` transactionnelle

Créer une fonction PostgreSQL `upsert_inventory_items` qui effectue le DELETE + INSERT dans une **seule transaction atomique** côté serveur. Le client n'envoie plus qu'un seul appel `supabase.rpc()`.

### Étapes

**1. Migration SQL** — créer la fonction `upsert_inventory_items`

```sql
CREATE OR REPLACE FUNCTION public.upsert_inventory_items(
  p_report_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les items existants
  DELETE FROM public.inventory_items WHERE report_id = p_report_id;

  -- Insérer les nouveaux items
  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.inventory_items (
      report_id, entreprise_id, template_id, categorie,
      designation, unite, quantity_good, quantity_repair,
      quantity_broken, previous_total, photos
    )
    SELECT
      p_report_id,
      (SELECT entreprise_id FROM public.inventory_reports WHERE id = p_report_id),
      (elem->>'template_id')::uuid,
      elem->>'categorie',
      elem->>'designation',
      elem->>'unite',
      (elem->>'quantity_good')::int,
      (elem->>'quantity_repair')::int,
      (elem->>'quantity_broken')::int,
      (elem->>'previous_total')::int,
      ARRAY(SELECT jsonb_array_elements_text(elem->'photos'))
    FROM jsonb_array_elements(p_items) AS elem;
  END IF;
END;
$$;
```

**2. Modifier `src/hooks/useInventoryItems.ts`** — remplacer le `mutationFn` du hook `useUpsertInventoryItems`

Remplacer les deux appels Supabase (delete + insert) par un seul :
```ts
const { error } = await supabase.rpc("upsert_inventory_items", {
  p_report_id: reportId,
  p_items: items.map(item => ({
    template_id: item.template_id || null,
    categorie: item.categorie,
    designation: item.designation,
    unite: item.unite,
    quantity_good: item.quantity_good,
    quantity_repair: item.quantity_repair,
    quantity_broken: item.quantity_broken,
    previous_total: item.previous_total,
    photos: item.photos,
  })),
});
if (error) throw error;
```

### Zéro régression

- L'interface du hook (`reportId` + `items`) ne change pas — aucun composant appelant n'est impacté
- Les callbacks `onSuccess` / `onError` restent identiques
- Les données envoyées sont strictement les mêmes, seul le transport change (1 appel RPC au lieu de 2 appels REST)
- La fonction SQL utilise `SECURITY DEFINER` pour bypasser RLS (comme les autres fonctions du projet) et récupère automatiquement `entreprise_id` depuis le report

