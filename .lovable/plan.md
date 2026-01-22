

# Correction : Affichage des employés sur chantiers sans chef

## Contexte

Le chantier **TEST (CI001)** n'a pas de chef (`chef_id = null`). La synchronisation route correctement les employés vers `affectations_finisseurs_jours`, mais l'affichage "Espace Conducteur" ne fonctionne pas.

## Diagnostic detaille

### Donnees en base (OK)

| Element | Statut |
|---------|--------|
| `planning_affectations` | DARCOURT (L-V) + KASMI (L-M) sur TEST |
| `affectations_finisseurs_jours` | Crees avec `conducteur_id = Fournier` |
| `fiches` | DARCOURT 39h, KASMI 16h, **avec chantier_id = TEST** |

### Bug identifie

**Fichier** : `src/hooks/useFinisseursByConducteur.ts`, **ligne 96**

```typescript
// ACTUEL - Filtre les fiches SANS chantier uniquement
.is("chantier_id", null);
```

Ce filtre exclut les fiches liees a un chantier ! Or les chantiers sans chef generent des fiches **avec** `chantier_id`.

## Solution proposee

### Option 1 : Modifier le hook pour accepter les fiches avec chantier (recommandee)

Supprimer le filtre `.is("chantier_id", null)` et chercher les fiches par `salarie_id` + `semaine` uniquement.

**Fichier** : `src/hooks/useFinisseursByConducteur.ts`

**Modification lignes 91-101** :

```typescript
// AVANT
const query = supabase
  .from("fiches")
  .select("id, total_heures")
  .eq("semaine", semaine)
  .eq("salarie_id", finisseur.id)
  .is("chantier_id", null);  // ❌ Probleme

// APRES
const query = supabase
  .from("fiches")
  .select("id, total_heures, chantier_id")
  .eq("semaine", semaine)
  .eq("salarie_id", finisseur.id);
  // Pas de filtre sur chantier_id - on prend la fiche la plus recente
```

### Option 2 : Router vers affectations_jours_chef meme sans chef (alternative)

Modifier l'Edge Function pour que les chantiers sans chef utilisent `affectations_jours_chef` avec `chef_id = conducteur_id`. Cela permettrait de gerer ces cas via "Saisie chef" au lieu de "Espace conducteur".

## Impact de l'option 1

- **1 fichier modifie** : `useFinisseursByConducteur.ts`
- **1 ligne supprimee** : `.is("chantier_id", null)`
- **Resultat** : Les finisseurs avec fiche liee a un chantier (cas sans chef) apparaitront dans l'Espace Conducteur

## Tests de validation

1. Apres correction, naviguer vers `/validation-conducteur` en tant que Fournier
2. Selectionner semaine S05
3. Verifier que DARCOURT (39h) et KASMI (16h) apparaissent dans "Mon equipe"
4. Verifier que les heures sont correctement affichees

## Decision requise

- **Option 1** : Modifier le hook (solution rapide, compatible avec l'architecture actuelle)
- **Option 2** : Modifier l'Edge Function (changement plus profond, meilleure coherence long terme)

Je recommande l'**Option 1** pour une correction immediate, avec potentiellement l'Option 2 dans un second temps pour une architecture plus coherente.

