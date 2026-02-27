

## Plan : Sécuriser la requête signatures + rendre `batchQueryIn` plus flexible

### Problème
La requête signatures (useRHData.ts L667-671) combine `.in("fiche_id", ficheIds)` avec `.eq("signed_by", salarieId)`. La fonction `batchQueryIn` actuelle ne supporte pas de filtres supplémentaires.

### Solution

**1. Enrichir `batchQueryIn` dans `src/lib/supabaseBatch.ts`**

Ajouter une option `extraFilters` qui applique des filtres additionnels à chaque chunk :

```typescript
options?: {
  order?: { column: string; ascending: boolean };
  extraFilters?: (query: any) => any;  // ← nouveau
}
```

Usage dans la boucle :
```typescript
let query = supabase.from(table).select(select).in(column, chunk);
if (options?.extraFilters) query = options.extraFilters(query);
const { data, error } = await query;
```

**2. Mettre à jour la requête signatures dans `useRHData.ts` (L667-671)**

Remplacer :
```typescript
const { data: signaturesData } = await supabase
  .from("signatures")
  .select("fiche_id, signature_data, signed_at, role, signed_by")
  .in("fiche_id", ficheIds)
  .eq("signed_by", salarieId);
```

Par :
```typescript
const signaturesData = await batchQueryIn<any>(
  "signatures",
  "fiche_id, signature_data, signed_at, role, signed_by",
  "fiche_id",
  ficheIds,
  { extraFilters: (q: any) => q.eq("signed_by", salarieId) }
);
```

### Implémentation
- 2 fichiers modifiés : `src/lib/supabaseBatch.ts` et `src/hooks/useRHData.ts`
- Zéro régression : même résultat, même structure de données
- Bonus : `extraFilters` réutilisable pour d'autres cas similaires dans le futur

