

## Fix: Ajouter `isEcole` dans le retour de `useRHEmployeeDetail`

### Diagnostic

Le fix sur `RHEmployeeDetail.tsx` (ligne 494) est correct : `isAbsent={day.heuresNormales === 0 && !(day as any).isEcole}`.

**Mais `isEcole` n'est jamais transmis dans les données.** Dans `useRHData.ts`, le hook `useRHEmployeeDetail` calcule bien `isEcole` (ligne 766) et l'utilise pour `isAbsent` (ligne 791), mais **ne l'inclut pas** dans l'objet retourné (lignes 793-812). Donc `(day as any).isEcole` est toujours `undefined` côté composant.

En comparaison, `rhShared.ts` (utilisé pour la vue consolidée) inclut bien `isEcole: isEcoleChantier` à la ligne 711.

### Changement unique

**Fichier : `src/hooks/useRHData.ts`, après la ligne 805**

Ajouter `isEcole,` dans l'objet retourné, juste après `isAbsent,` :

```typescript
// Avant (lignes 804-806)
typeAbsence: (jour as any).type_absence || null,
isAbsent,
isOnOtherSite: false as boolean,

// Après
typeAbsence: (jour as any).type_absence || null,
isAbsent,
isEcole,
isOnOtherSite: false as boolean,
```

### Zéro régression

- La variable `isEcole` existe déjà (ligne 766), elle est simplement omise du retour. On ajoute un champ supplémentaire à l'objet — aucun champ existant n'est modifié.
- Le composant `RHEmployeeDetail.tsx` accède déjà à `(day as any).isEcole` — il recevra enfin la valeur correcte au lieu de `undefined`.
- Aucune requête DB modifiée, aucune logique métier changée.

