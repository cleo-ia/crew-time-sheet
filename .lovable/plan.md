
# Plan de correction : Bug récapitulatif vide pour employé multi-chantier

## Problème identifié

Paul MANUNTA est affecté sur **2 chantiers** différents en S05 :
- **CI230 (Le Roseyran)** avec Liam : Lundi, Mardi, Mercredi → fiche `e205e6c5`
- **CI235 (Les Arcs)** avec Chloé : Jeudi, Vendredi → fiche `9a1f479e`

Le hook `useMaconsByChantier` ne filtre pas la récupération des fiches par `chantier_id`. Avec `.maybeSingle()`, il récupère une fiche aléatoire parmi les deux. Si la mauvaise fiche est retournée, les `fiches_jours` chargées ne correspondent pas aux jours affectés, et le récapitulatif apparaît vide après filtrage.

## Correction à apporter

### Fichier : `src/hooks/useMaconsByChantier.ts`

**Modification 1 : Filtrer par chantier_id pour les maçons (ligne 227-232)**

Ajouter `.eq("chantier_id", chantierId)` à la requête de récupération des fiches maçons :

```typescript
// AVANT
const { data: fiche } = await supabase
  .from("fiches")
  .select("id, total_heures")
  .eq("salarie_id", macon.id)
  .eq("semaine", semaine)
  .maybeSingle();

// APRÈS
const { data: fiche } = await supabase
  .from("fiches")
  .select("id, total_heures")
  .eq("salarie_id", macon.id)
  .eq("chantier_id", chantierId)  // ← AJOUTER CE FILTRE
  .eq("semaine", semaine)
  .maybeSingle();
```

**Modification 2 : Filtrer par chantier_id pour le chef (ligne 89-94)**

Le même problème peut survenir pour le chef s'il travaille sur plusieurs chantiers :

```typescript
// AVANT
const { data: fichChef } = await supabase
  .from("fiches")
  .select("id, total_heures")
  .eq("salarie_id", chef.id)
  .eq("semaine", semaine)
  .maybeSingle();

// APRÈS  
const { data: fichChef } = await supabase
  .from("fiches")
  .select("id, total_heures")
  .eq("salarie_id", chef.id)
  .eq("chantier_id", chantierId)  // ← AJOUTER CE FILTRE
  .eq("semaine", semaine)
  .maybeSingle();
```

## Résultat attendu

Après cette correction :
- Sur `/signature-macons` pour **CI230**, Paul MANUNTA affichera ses données de Lundi, Mardi, Mercredi (24h)
- Sur `/signature-macons` pour **CI235**, Paul MANUNTA affichera ses données de Jeudi, Vendredi (15h)
- Chaque chef voit uniquement les données du chantier dont il est responsable

## Impact

- **Fichiers modifiés** : 1 (`useMaconsByChantier.ts`)
- **Lignes modifiées** : 2 requêtes Supabase (ajout d'un `.eq()` chacune)
- **Risque** : Faible (ajout d'un filtre qui renforce l'isolation des données)
- **Rétrocompatibilité** : Totale (les fiches ont toujours eu un `chantier_id`)
