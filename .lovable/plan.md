

## Notification badge "Planning tâches" pour le chef

### Contexte vérifié
- **`taches_chantier`** : pas de colonne `created_by` → migration nécessaire
- **`todos_chantier`** : colonne `created_by` existe déjà mais n'est jamais remplie par `useCreateTodo`
- Le bouton "Planning tâches" est dans `Index.tsx` (ligne 445-453), affiché uniquement quand un chantier est sélectionné
- Le chef navigue vers `/chantiers/${selectedChantier}?from=chef`

### Étape 1 — Migration SQL

**a) Ajouter `created_by` à `taches_chantier`**
```sql
ALTER TABLE taches_chantier ADD COLUMN created_by uuid DEFAULT NULL;
```

**b) Créer la table `planning_last_seen`**
```sql
CREATE TABLE planning_last_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chantier_id uuid NOT NULL,
  entreprise_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chantier_id)
);

ALTER TABLE planning_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own last_seen"
  ON planning_last_seen FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Étape 2 — Remplir `created_by` à la création

- **`useCreateTache`** : ajouter `const { data: { user } } = await supabase.auth.getUser()` puis `created_by: user?.id || null` dans l'insert
- **`useCreateTodo`** : idem, ajouter `created_by: user?.id || null` dans l'insert (le champ existe en DB mais le hook ne le remplit pas)

### Étape 3 — Nouveau hook `useNewPlanningItemsCount`

- Paramètres : `chantierId`, `userId` (auth.uid)
- Requête `planning_last_seen` pour ce chantier/user → obtenir `last_seen_at`
- Compter les `taches_chantier` où `created_at > last_seen_at` ET `created_by != userId` (ou `created_by IS NOT NULL`)
- Compter les `todos_chantier` idem
- Retourner la somme des deux
- Si pas de `last_seen_at` : compter tout ce qui a un `created_by` différent du chef
- `refetchInterval: 30000`

### Étape 4 — Nouveau hook `useMarkPlanningAsSeen`

- Mutation qui fait un upsert dans `planning_last_seen` avec `last_seen_at = now()`, `onConflict: "user_id,chantier_id"`
- Invalide la query `["new-planning-items-count"]`

### Étape 5 — Badge sur le bouton "Planning tâches" (Index.tsx)

Transformer le `<Button>` existant (ligne 445-453) pour y ajouter un badge compteur en position absolute, même style que `CongesButton` et `ConversationButton` :
```tsx
<Button variant="outline" size="sm" className="gap-1.5 relative" onClick={...}>
  <CalendarDays className="h-4 w-4" />
  Planning tâches
  {newPlanningCount > 0 && (
    <span className="absolute -top-1.5 -right-1.5 bg-destructive ...">
      {newPlanningCount}
    </span>
  )}
</Button>
```

### Étape 6 — Reset du compteur (ChantierDetail.tsx)

- Appeler `useMarkPlanningAsSeen` au montage du composant avec `chantierId` + `auth.uid()`
- Cela remet le compteur à zéro dès que le chef ouvre la page planning du chantier

### Fichiers impactés
1. Migration SQL (nouvelle)
2. `src/hooks/useCreateTache.ts` — ajouter `created_by`
3. `src/hooks/useCreateTodo.ts` — ajouter `created_by`
4. `src/hooks/useNewPlanningItemsCount.ts` — nouveau hook
5. `src/hooks/useMarkPlanningAsSeen.ts` — nouveau hook
6. `src/pages/Index.tsx` — badge sur le bouton
7. `src/pages/ChantierDetail.tsx` — appel mark-as-seen

