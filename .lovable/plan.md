

## Correction : invalidation du cache planning

**Objectif** : Ajouter `queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] })` dans le `onSuccess` de 6 mutations pour que le planning se rafraîchisse automatiquement.

### Modifications

**1. `src/hooks/useValidateDemandeConge.ts`** — dans `onSuccess` (après ligne 52)
```typescript
queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
```

**2. `src/hooks/useCreateDemandeConge.ts`** — dans `onSuccess` (après ligne 62)
```typescript
queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
```

**3. `src/hooks/useRefuseDemandeConge.ts`** — dans `onSuccess` (après ligne 45)
```typescript
queryClient.invalidateQueries({ queryKey: ["absences-ld-planning"] });
```

**4. `src/hooks/useAbsencesLongueDuree.ts`** — dans les 3 mutations (create, update, delete), ajouter la même ligne après les `invalidateQueries` existants.

### Garantie zéro régression

- Aucune requête SQL modifiée
- Aucun composant UI modifié
- Aucune interface/type modifié
- Simple signal de rechargement de cache, ignoré silencieusement si l'utilisateur n'est pas sur la page planning

