

## Plan : Affichage code chantier uniquement + fix copie S-1

### Problème 1 — Affichage dialog détail semaine
Dans `useRHData.ts` (ligne 816), quand `ville_du_jour` existe, le nom affiché devient `"FAMILLE - LYON 7"`. Sans ville, c'est juste `"FAMILLE"`. L'utilisateur veut un affichage uniforme : le nom du chantier + le code en dessous (comme sur la capture : "FAMILLE" avec "CI897FAMILLE" en petit).

**Correction** : Supprimer la concaténation de la ville dans `chantierNom` (ligne 814-817 de `useRHData.ts`). Le code chantier est déjà passé séparément via `chantierCode`, et le dialog l'affiche déjà en petit en dessous du nom.

### Problème 2 — `copyFichesFromPreviousWeek` ne copie pas les métadonnées chantier
`createNewAffectation` (ligne 2088-2091) initialise correctement `code_chantier_du_jour` et `ville_du_jour`, mais `copyFichesFromPreviousWeek` (ligne 1872-1890) ne les inclut pas dans l'upsert. Résultat : les semaines copiées depuis S-1 ont ces champs à `null`.

**Correction** : Dans `copyFichesFromPreviousWeek`, ne PAS copier les valeurs de S-1 (qui pourraient être obsolètes si le chantier a changé). À la place, résoudre `code_chantier` et `ville` depuis le chantier cible actuel, comme le fait déjà `createNewAffectation`.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useRHData.ts` | Supprimer lignes 814-817 (concaténation ville dans chantierNom) |
| `supabase/functions/sync-planning-to-teams/index.ts` | Ajouter `code_chantier_du_jour` et `ville_du_jour` dans l'upsert de `copyFichesFromPreviousWeek`, en les résolvant depuis le chantier cible |

### Détail technique — Edge Function

Dans `copyFichesFromPreviousWeek`, avant la boucle de copie des jours (ligne ~1867), récupérer le `code_chantier` et `ville` du chantier cible :

```ts
// Résoudre le code chantier et ville depuis le chantier cible (pas depuis S-1)
const { data: chantierTarget } = await supabase
  .from('chantiers')
  .select('code_chantier, ville')
  .eq('id', chantierId)
  .maybeSingle()

const codeChantierDuJour = chantierTarget?.code_chantier || null
const villeDuJour = chantierTarget?.ville || null
```

Puis dans l'upsert (ligne 1874), ajouter :
```ts
code_chantier_du_jour: codeChantierDuJour,
ville_du_jour: villeDuJour,
```

### Risque de régression
- **Suppression ville dans nom** : aucun impact — la ville n'est utilisée nulle part ailleurs dans la vue détail, et le code chantier reste affiché séparément.
- **Edge function** : alignement avec `createNewAffectation` qui fait déjà exactement ça — pas de nouveau pattern.

