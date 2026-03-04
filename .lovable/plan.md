

## Plan final : Fusion des affectations conducteur + chef dans le filtre finisseur

### Le problème exact (confirmé par les logs)

Dans `rhShared.ts`, le filtre finisseur (lignes 606-622) fonctionne ainsi :
1. On requête `affectations_finisseurs_jours` pour récupérer les dates où un finisseur est affecté par un **conducteur**
2. Si un finisseur a **au moins 1 date** dans cette map, alors **tous ses jours** sont filtrés : seuls ceux présents dans la map passent
3. Les jours gérés par un **chef** (stockés dans `affectations_jours_chef`) ne sont pas dans la map → ils sont skippés → 0h

C'est exactement ce qui arrive à Said : il a des affectations conducteur en S06, donc la map existe et contient des dates S06. Quand on arrive aux jours de S09 (gérés par un chef), ils ne sont pas dans la map → `continue` → 0h.

### La correction

**Fichier unique : `src/hooks/rhShared.ts`**

**1. Ajouter une requête `affectations_jours_chef`** (après ligne 429, juste après la construction de `affectationsMap`)

```typescript
// Récupérer aussi les affectations chef pour les finisseurs
let affectationsChefQuery = supabase
  .from("affectations_jours_chef")
  .select("macon_id, jour");

if (!isAllPeriodes && dateDebut && dateFin) {
  affectationsChefQuery = affectationsChefQuery
    .gte("jour", format(dateDebut, "yyyy-MM-dd"))
    .lte("jour", format(dateFin, "yyyy-MM-dd"));
}

const { data: affectationsChefData } = await affectationsChefQuery.limit(10000);

// Fusionner dans affectationsMap
affectationsChefData?.forEach(aff => {
  if (!affectationsMap.has(aff.macon_id)) {
    affectationsMap.set(aff.macon_id, new Set());
  }
  affectationsMap.get(aff.macon_id)!.add(aff.jour);
});
```

**2. Supprimer tous les `console.log` de debug `[RH DEBUG SAID]`** (6 blocs)

### Pourquoi c'est sûr a 100%

Le filtre (lignes 606-622) ne change **pas du tout**. La seule chose qui change, c'est que `affectationsMap` contient **plus de dates** (celles du chef en plus de celles du conducteur). Conséquences :

| Cas | Avant | Après | Résultat |
|-----|-------|-------|----------|
| Finisseur géré uniquement par conducteur | Dates conducteur dans la map | Idem + éventuelles dates chef (aucune en pratique) | Identique |
| Finisseur géré uniquement par chef | Map vide → filtre non déclenché (ligne 609 : `size > 0`) | Map contient les dates chef → filtre déclenché mais les dates matchent | Identique (les jours passent dans les 2 cas) |
| Finisseur mixte (Said) | Map ne contient que les dates conducteur → jours chef skippés | Map contient dates conducteur + dates chef → tous les jours matchent | **Corrigé** |
| Finisseur lundi-mardi chef + mercredi-vendredi conducteur dans la **même semaine** | Seuls mer-ven passent | Lun-ven passent tous | **Corrigé** |
| Non-finisseur (maçon, intérimaire, chef, grutier) | Filtre non déclenché (`isFinisseur` = false) | Idem | Identique |

**Aucune régression possible** car :
- On ne touche pas à la logique du filtre, on enrichit seulement la source de données
- Les non-finisseurs ne passent jamais par ce filtre
- Un finisseur dont la map était vide (pas d'affectation conducteur) et qui a maintenant des dates chef : le filtre se déclenche mais les dates matchent, donc même résultat
- Aucun autre fichier modifié

