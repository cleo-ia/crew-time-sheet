

## Fix : Afficher les données réelles du chantier filtré (trajets, paniers)

### Problème
Quand on filtre par chantier, les heures sont bien isolées mais **le code trajet et le panier** conservent les valeurs fusionnées d'un autre chantier. Deux bugs dans `useRHData.ts` :

1. **Ligne 954** (bloc "isOnOtherSite") : les heures sont remises à 0 mais `codeTrajet`, `trajetPerso` et `panier` gardent les valeurs de l'autre site
2. **Ligne 961** (bloc "hasAnyFicheOnFilteredSite") : le `codeTrajet` n'est écrasé que s'il existe sur le site filtré → sinon l'ancien persiste

### Correction (`src/hooks/useRHData.ts`)

**Bloc isOnOtherSite (après ligne 955)** — ajouter :
```typescript
jour.codeTrajet = null;
jour.trajetPerso = false;
jour.panier = false;
```

**Bloc hasAnyFicheOnFilteredSite (lignes 961-963)** — remplacer le `if` par une affectation systématique :
```typescript
jour.codeTrajet = trajetOnFilteredSite
  ? (trajetOnFilteredSite as any).code_trajet
  : null;
jour.trajetPerso = false; // reset, puis chercher sur le site filtré
```

Résultat : quand on filtre DAVOULT, on voit les données **réelles** de DAVOULT (trajet vide, panier vide si 0h), sans pollution par MAILLARD.

