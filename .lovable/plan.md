

# Plan : Afficher le nombre de cartes chantier au lieu du nombre de fiches

## Contexte

Actuellement, le badge sur l'onglet "Validation des fiches" affiche **3** car il compte les 3 fiches individuelles (3 employés). L'utilisateur veut qu'il affiche **1** car il n'y a qu'une seule carte chantier "LES ARCS" qui regroupe ces 3 fiches.

## Logique actuelle vs souhaitée

| Situation | Logique actuelle | Logique souhaitée |
|-----------|------------------|-------------------|
| 1 chantier, 3 employés | Badge = 3 | Badge = 1 |
| 2 chantiers, 5 employés | Badge = 5 | Badge = 2 |

## Solution

Modifier le hook `useFichesEnAttentePourConducteur` pour compter le nombre de **combinaisons uniques chantier+semaine** au lieu du nombre de fiches individuelles.

## Fichier modifié

**src/hooks/useFichesEnAttentePourConducteur.ts**

### Avant (lignes 13-25)

```typescript
const { count, error } = await supabase
  .from("fiches")
  .select(`...`, { count: 'exact', head: true })
  .eq("statut", "VALIDE_CHEF")
  ...
return count || 0;
```

### Après

```typescript
// Récupérer les combinaisons chantier_id+semaine distinctes
const { data, error } = await supabase
  .from("fiches")
  .select(`
    chantier_id,
    semaine,
    chantiers!inner (
      id,
      conducteur_id,
      entreprise_id
    )
  `)
  .eq("statut", "VALIDE_CHEF")
  .eq("chantiers.conducteur_id", conducteurId)
  .eq("chantiers.entreprise_id", entrepriseId);

if (error || !data) return 0;

// Compter les combinaisons UNIQUES chantier+semaine
const uniquePairs = new Set(
  data.map(f => `${f.chantier_id}|${f.semaine}`)
);

return uniquePairs.size;
```

## Comportement après correction

| Données | Résultat badge |
|---------|----------------|
| LES ARCS S05 (3 employés) | **1** |
| LES ARCS S05 + AUTRE S05 | **2** |
| LES ARCS S04 + LES ARCS S05 | **2** |

## Impact

- Aucune modification de l'interface utilisateur
- Aucune modification de la base de données
- La liste des cartes reste inchangée
- Seul le comptage du badge est corrigé

