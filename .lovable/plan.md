

# Plan : Finalisation et Sécurisation du Module de Paie (4 optimisations)

## 1. Popover sur le Badge Bleu (~Xj)

**Fichier** : `src/components/rh/RHPreExport.tsx`

Transformer le `<span>` du badge `~Xj` (ligne 686) en un `Popover` (déjà disponible dans `src/components/ui/popover.tsx`).

- Le `PopoverTrigger` enveloppe le badge existant
- Le `PopoverContent` affiche un tableau compact des jours estimés extraits de `row.original.detailJours.filter(j => j.is_estimated)`
- Format par ligne : `26/02 : 8h, T1, Panier` (date formatée dd/MM, heures, code trajet, panier oui/non)
- Import de `Popover, PopoverTrigger, PopoverContent` + `format, parseISO` de date-fns

Aucune requête supplémentaire : les données sont déjà dans `detailJours`.

## 2. Détail des Trajets dans la Régularisation M-1

**Fichier** : `src/hooks/usePaiePrevisionnelle.ts`

Modifier le bloc de construction du texte de régularisation (lignes 293-307).

Actuellement, les changements de trajet sont résumés en `Trajets: X modif(s)`. Remplacer par un détail explicite des changements de zones :

- Agréger les changements de trajet par paire `ancien→nouveau` (ex: 2x T1→T3)
- Format final : `T: T1→T3 (x2), T2→∅ (x1)` au lieu de `Trajets: 3 modif(s)`
- Si trop de variations (>4 paires distinctes), tronquer avec `+ X autres`

## 3. Upsert à la Clôture

**Fichier** : `src/hooks/useRHData.ts`

**Migration SQL** : Ajouter un index unique sur `periodes_cloturees(periode, entreprise_id)` pour permettre l'upsert.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_periodes_cloturees_periode_entreprise 
ON public.periodes_cloturees(periode, entreprise_id);
```

Puis modifier la mutation `useCloturePeriode` (ligne 1047-1072) :
- Remplacer `.insert(...)` par `.upsert(..., { onConflict: 'periode,entreprise_id' })`
- Cela écrase proprement le snapshot et les stats si le RH reclôture le même mois

## 4. Export du Détail Régule dans l'Excel

**Fichier** : `src/lib/excelExport.ts`

La colonne "Regularisation M-1" (index 59) exporte déjà `emp.regularisationM1` (ligne 382). Le champ est alimenté par `regularisation_m1_export` dans `useRHExport.ts`.

Vérifier la chaîne complète :
- `rhShared.ts` → `buildRHConsolidation` calcule `regularisation_m1_export` via `calculateRegularisationM1Batch`
- `useRHExport.ts` → mappe `emp.regularisation_m1_export` vers `regularisationM1`
- `excelExport.ts` → écrit `emp.regularisationM1`

Le point 2 enrichit automatiquement le texte source. La colonne Excel exportera donc le détail complet (ex: `H: -7h | PA: -2 | T: T1→T3 (x2)`) sans modification supplémentaire dans `excelExport.ts`. Vérifier simplement que la largeur de colonne (actuellement définie) est suffisante pour le texte enrichi → augmenter la largeur de la colonne 59 si nécessaire.

---

**Résumé des fichiers modifiés** :
1. `src/components/rh/RHPreExport.tsx` — Popover sur badge
2. `src/hooks/usePaiePrevisionnelle.ts` — Détail trajets régule
3. `src/hooks/useRHData.ts` — Upsert clôture
4. `src/lib/excelExport.ts` — Élargir colonne régule (optionnel)
5. **Migration SQL** — Index unique `(periode, entreprise_id)`

