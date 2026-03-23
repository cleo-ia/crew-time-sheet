

## Plan : Ajouter la contrainte UNIQUE (fiche_id, date) sur fiches_jours

### Contexte

La table `fiches_jours` n'a aucune contrainte empechant deux lignes avec le meme `fiche_id` + `date`. Le code applicatif utilise `.upsert({ onConflict: 'fiche_id,date' })` a plusieurs endroits, mais sans contrainte UNIQUE en base, Supabase traite ces upserts comme de simples INSERT. Resultat : en cas de double-clic, latence reseau ou sync simultanee, des doublons peuvent apparaitre.

Actuellement il y a **zero doublon** en base — c'est le moment ideal pour poser la contrainte.

### Modification

**Migration SQL** (une seule commande) :

```sql
ALTER TABLE public.fiches_jours
ADD CONSTRAINT fiches_jours_fiche_id_date_unique UNIQUE (fiche_id, date);
```

### Analyse d'impact

| Point | Verification |
|-------|-------------|
| Doublons existants | Zero — la contrainte peut etre posee sans nettoyage |
| `useAutoSaveFiche` | Utilise `.upsert({ onConflict: 'fiche_id,date' })` — fonctionnera correctement avec la contrainte |
| `useSaveFiche` | Utilise `.upsert({ onConflict: 'fiche_id,date' })` — idem |
| `useSaveFicheJours` | Fait un SELECT puis UPDATE/INSERT — pas d'impact, la logique evite deja les doublons |
| `useCreateFicheJourForAffectation` | Verifie l'existence avant d'inserer — pas d'impact |
| `sync-planning-to-teams` | Utilise `.upsert({ onConflict: 'fiche_id,date' })` — beneficie directement de la contrainte |
| `purge-fiches-jours-duplicates` | Edge function de nettoyage — continue de fonctionner (delete + recalcul) |
| Performance | L'index unique accelere les lookups par `(fiche_id, date)` deja frequents |

### Garantie zero regression

- Aucun code applicatif ne tente d'inserer volontairement deux lignes pour le meme `fiche_id` + `date`
- Les upserts existants qui declarent `onConflict: 'fiche_id,date'` vont enfin fonctionner comme prevu (mise a jour au lieu d'insertion)
- Les SELECT/UPDATE manuels ne sont pas affectes par une contrainte UNIQUE
- Aucune modification de code frontend necessaire

