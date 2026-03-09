

## Plan d'implémentation : Audit Log complet

Ce plan transforme l'onglet Historique en un vrai journal d'audit sans aucune régression. Tous les appels de logging sont **non-bloquants** (try/catch ou fire-and-forget) pour ne jamais casser les flux critiques.

---

### Pilier 1 : Migration SQL (à exécuter manuellement)

Exécuter dans le SQL Editor de Supabase :

```sql
ALTER TABLE public.fiches_modifications
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS page_source text;

CREATE INDEX IF NOT EXISTS idx_fiches_modifications_user_role
  ON public.fiches_modifications (user_role)
  WHERE user_role IS NOT NULL;
```

Les 2 colonnes sont **nullable** — aucun impact sur les inserts existants.

---

### Pilier 2 : Enrichir le hook `useLogModification.ts`

- Ajouter `userRole?: string | null` et `pageSource?: string | null` aux params (optionnels)
- Auto-capturer `window.location.pathname` comme `page_source` si non fourni (en nettoyant le lovable_token)
- Insérer ces champs via `as any` cast pour contourner les types générés jusqu'à régénération
- Sécurité : si les colonnes n'existent pas encore en DB, Supabase ignore les colonnes inconnues sur insert

---

### Pilier 3 : Enrichir `useModificationsHistory.ts`

- Ajouter `user_role: string | null` et `page_source: string | null` au type `FicheModification`
- Ajouter param `searchTerm?: string` pour recherche client-side sur `details.salarie`, `details.chantier`, `user_name`
- Inclure `searchTerm` dans la queryKey

---

### Pilier 4 : Logging des actions critiques

Chaque ajout est **encapsulé dans try/catch** pour ne jamais bloquer le flux principal.

**4a. Signatures chef** — `src/pages/SignatureMacons.tsx`
- Après `saveSignature.mutateAsync()` (ligne ~155), ajouter un log fire-and-forget :
  - action: `signature_chef`
  - details: `{ salarie, semaine, chantier }`
- Après `handleFinish` / `updateStatus.mutateAsync()` (ligne ~183), logger :
  - action: `transmission_conducteur`
  - ancienneValeur: "BROUILLON", nouvelleValeur: "VALIDE_CHEF"
- Nécessite : importer `useLogModification`, `useCurrentUserInfo`, `useCurrentUserRole`

**4b. Validation conducteur** — `src/components/validation/FicheDetail.tsx`
- Après `handleValidate` / `updateStatus.mutateAsync()` (ligne ~262), logger :
  - action: `validation_conducteur`
  - ancienneValeur: statut actuel, nouvelleValeur: "ENVOYE_RH"
  - details: `{ semaine, chantier, nbSalaries }`
- Nécessite : importer `useLogModification`, `useCurrentUserInfo`, `useCurrentUserRole`

**4c. Export Excel paie** — `src/components/rh/RHPreExport.tsx`
- Après `handleExport` / `generateRHExcel()` (ligne ~378), logger :
  - action: `export_paie`
  - details: `{ periode, nbSalaries, filename }`
- `useLogModification` et `useCurrentUserInfo` sont déjà importés

**4d. Clôture de période** — `src/components/rh/ClotureDialog.tsx`
- Après `clotureMutation.mutateAsync()` (ligne ~225), logger :
  - action: `cloture_periode`
  - details: `{ periode, nbSalaries, nbFiches, totalHeures }`
- Nécessite : importer `useLogModification`, `useCurrentUserInfo`

**4e. Sync planning** — `supabase/functions/sync-planning-to-teams/index.ts`
- Après chaque `syncEntreprise()`, insérer directement dans `fiches_modifications` via le service role client :
  - action: `sync_planning`
  - details: stats (copied, created, deleted)
  - user_name: "Système (sync automatique)"

---

### Pilier 5 : Interface Historique enrichie

**5a. `HistoriqueManager.tsx`**
- Ajouter un filtre **utilisateur** : `Select` alimenté par la liste unique des `user_id`/`user_name` extraits des modifications chargées (pas de requête supplémentaire)
- Ajouter un champ **recherche** (input texte) pour filtrer par nom de salarié/chantier (param `searchTerm` passé au hook)
- Enrichir `ACTION_OPTIONS` avec les nouvelles actions : `signature_chef`, `transmission_conducteur`, `validation_conducteur`, `export_paie`, `cloture_periode`, `sync_planning`, `modification_pre_export`
- Ajouter le rôle et la page source dans le CSV export

**5b. `ModificationHistoryTable.tsx`**
- Afficher un badge de rôle (`RoleBadge`) à côté du nom d'utilisateur si `user_role` est présent
- Afficher la page source en petit texte gris sous l'action
- Enrichir `ACTION_CONFIG` avec les nouveaux types d'action et leurs couleurs/labels

---

### Fichiers modifiés (résumé)

| Fichier | Nature du changement | Risque régression |
|---|---|---|
| `useLogModification.ts` | +2 params optionnels, auto-capture page | Nul (rétrocompatible) |
| `useModificationsHistory.ts` | +2 champs type, +searchTerm | Nul (additive) |
| `SignatureMacons.tsx` | +try/catch log après signature/transmission | Nul (non-bloquant) |
| `FicheDetail.tsx` (validation) | +try/catch log après validation | Nul (non-bloquant) |
| `RHPreExport.tsx` | +try/catch log après export | Nul (non-bloquant) |
| `ClotureDialog.tsx` | +try/catch log après clôture | Nul (non-bloquant) |
| `sync-planning-to-teams/index.ts` | +insert fiches_modifications | Nul (indépendant) |
| `HistoriqueManager.tsx` | +filtres, +recherche | Nul (UI admin seule) |
| `ModificationHistoryTable.tsx` | +colonnes, +badges | Nul (UI admin seule) |

