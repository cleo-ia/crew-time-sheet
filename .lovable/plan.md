

# Trier les salariés par ordre alphabétique sur Export Paie

## Problème actuel
Dans `src/hooks/rhShared.ts` (ligne 940-948), le tri est fait par **catégorie de métier** d'abord (Chef, Maçon, Grutier, Finisseur, Intérimaire) puis par nom. Cela explique pourquoi les chefs apparaissent en premier dans ta vue.

## Correction
Modifier le tri final dans `buildRHConsolidation` pour trier uniquement par **nom** puis **prénom**, sans tenir compte du métier :

```typescript
// AVANT
const result = filteredMap.sort((a, b) => {
  const metierOrder = { Chef: 0, Maçon: 1, Grutier: 2, Finisseur: 3, Intérimaire: 4 };
  const aOrder = metierOrder[a.metier] ?? 4;
  const bOrder = metierOrder[b.metier] ?? 4;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.nom.localeCompare(b.nom);
});

// APRÈS
const result = filteredMap.sort((a, b) => {
  const nomCompare = a.nom.localeCompare(b.nom);
  if (nomCompare !== 0) return nomCompare;
  return a.prenom.localeCompare(b.prenom);
});
```

## Impact
Ce tri s'applique à toutes les vues qui utilisent `buildRHConsolidation` : Export Paie (étape 2), Consultation RH, et Rapprochement Intérim. Tous les salariés seront triés A→Z par nom.

## Fichier modifié
- `src/hooks/rhShared.ts` — lignes 940-948

