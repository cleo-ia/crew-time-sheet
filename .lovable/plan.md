
# Plan : Corriger le reset de semaine lors du changement de chantier

## Problème identifié

Le hook `useInitialWeek` provoque une boucle de réinitialisation quand l'utilisateur change de chantier :

```
1. Utilisateur sélectionne S07
2. Utilisateur clique sur un chantier  
3. useInitialWeek se ré-exécute (query key contient chantierId)
4. Le hook appelle getCurrentWeek() → "2026-S06" (date du jour)
5. Il trouve une fiche BROUILLON pour S06 → retourne S06
6. L'effet met à jour selectedWeek → S06
7. Le ChantierSelector se réinitialise (dépend de semaine)
```

### Cause racine

Le hook `useInitialWeek` est conçu pour **déterminer la semaine initiale au chargement**, mais il est appelé à chaque changement de chantier. Quand le chantier change, il revérifie avec `getCurrentWeek()` au lieu de garder la semaine sélectionnée.

## Solution proposée

Modifier la logique pour que le hook ne recalcule la semaine que :
- Au **premier chargement** de la page
- Quand le **chef change** (nouveau contexte)
- Quand un **paramètre URL** est présent (priorité absolue)

**Mais PAS quand le chantier change** pour un même chef.

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useInitialWeek.ts` | Retirer `chantierId` de la logique de détermination sauf pour vérifier le statut |
| `src/pages/Index.tsx` | Ne pas inclure `chantierId` comme dépendance du hook OU désactiver le useEffect de synchronisation après la première initialisation |

## Approche technique

### Option A : Modifier useInitialWeek pour ignorer le chantierId dans la query key

Retirer `chantierId` de la query key pour éviter les re-exécutions inutiles. Le hook détermine la semaine initiale uniquement basé sur l'utilisateur.

```typescript
// AVANT (problématique)
queryKey: ["initial-week", urlParamWeek, userId, chantierId],

// APRÈS
queryKey: ["initial-week", urlParamWeek, userId],
```

### Option B : Ajouter un flag "initialized" dans Index.tsx

Empêcher l'effet de synchronisation de s'exécuter après la première initialisation :

```typescript
const [weekInitialized, setWeekInitialized] = useState(false);

useEffect(() => {
  if (initialWeek && !weekInitialized) {
    setSelectedWeek(initialWeek);
    setWeekInitialized(true);
  }
}, [initialWeek, weekInitialized]);
```

## Recommandation

**Option B** est plus sûre car elle préserve le comportement existant du hook tout en évitant les réinitialisations intempestives. L'initialisation ne se fait qu'une seule fois au chargement de la page.

## Modification concrète (Option B)

Dans `src/pages/Index.tsx`, modifier l'effet de synchronisation :

```typescript
// Ligne 85-86 : Ajouter un état pour tracker l'initialisation
const [weekInitialized, setWeekInitialized] = useState(false);

// Ligne 97-101 : Modifier l'effet
useEffect(() => {
  if (initialWeek && !weekInitialized) {
    setSelectedWeek(initialWeek);
    setWeekInitialized(true);
  }
}, [initialWeek, weekInitialized]);
```

De plus, réinitialiser le flag quand le chef change :

```typescript
// Dans l'effet qui gère le changement de chef (ligne 331-337)
useEffect(() => {
  if (selectedChef !== previousChef && previousChef !== "") {
    setSelectedChantier("");
    setTimeEntries([]);
    setWeekInitialized(false); // Permettre une nouvelle initialisation
  }
  setPreviousChef(selectedChef);
}, [selectedChef, previousChef]);
```

## Résultat attendu

1. FAY Philippe sélectionné → semaine initiale déterminée (S06 ou S07 selon statut)
2. L'utilisateur change manuellement vers S07 → la semaine reste S07
3. L'utilisateur sélectionne un chantier → la semaine reste S07
4. L'utilisateur change de chef → nouvelle initialisation de semaine
