

## Correction de l'affichage des agences d'intérim

### Problème identifié
Les agences d'intérim récemment ajoutées n'apparaissent pas immédiatement dans la liste de suggestions car le cache React Query n'est pas invalidé après la création d'un intérimaire.

### Garantie de non-régression

| Zone de l'application | Impact | Explication |
|----------------------|--------|-------------|
| Admin > Intérimaires | ✅ Aucune régression | Seul endroit utilisant le composant |
| Admin > autres onglets | ✅ Aucune régression | Aucune dépendance |
| Saisie d'heures (Chef) | ✅ Aucune régression | Le dialog de création urgente fonctionne identiquement |
| Finisseurs (Conducteur) | ✅ Aucune régression | Le dialog de création fonctionne identiquement |
| Consultation RH | ✅ Aucune régression | Aucune dépendance sur useAgencesInterim |
| Exports Excel | ✅ Aucune régression | Utilisent agence_interim directement depuis utilisateurs |
| Validation / Signatures | ✅ Aucune régression | Aucune dépendance |
| Planning | ✅ Aucune régression | Aucune dépendance |
| Chantiers | ✅ Aucune régression | Aucune dépendance |

La modification est **additive** et ne supprime aucune logique existante.

### Solution technique

**Fichier 1 : `src/components/shared/InterimaireFormDialog.tsx`**

Ajouter l'invalidation du cache des agences après création/modification :

```typescript
import { useQueryClient } from "@tanstack/react-query";

// Dans le composant :
const queryClient = useQueryClient();

// Dans handleSave, après la création/modification réussie :
queryClient.invalidateQueries({ queryKey: ["agences-interim"] });
```

**Fichier 2 : `src/hooks/useAgencesInterim.ts`** (optionnel)

Réduire le temps de cache pour plus de réactivité :

```typescript
staleTime: 1 * 60 * 1000, // 1 minute au lieu de 5
```

### Pourquoi c'est sûr ?

1. **Changement additif** : On ajoute une invalidation de cache, on ne modifie pas la logique métier
2. **Scope limité** : Le `queryKey` `["agences-interim"]` n'est utilisé que par `useAgencesInterim`
3. **Isolation maintenue** : Le filtre par `entreprise_id` reste actif
4. **Aucun effet de bord** : L'invalidation force simplement un rechargement des données fraîches

### Résultat attendu
- Après création d'un intérimaire avec une nouvelle agence → elle apparaît immédiatement dans les suggestions
- Toutes les agences SDER (PROMAN, BBKAMP, ADEQUAT ANNECY, etc.) seront visibles
- Les données Limoge Révillon restent isolées et invisibles pour SDER

