

## Fix: Masquer le sélecteur "Type d'absence" pour les chantiers ECOLE dans le détail RH

### Diagnostic

Le problème est à la **ligne 494** de `RHEmployeeDetail.tsx` :

```typescript
isAbsent={day.heuresNormales === 0}  // ← Ne vérifie PAS isEcole
```

Le mode **readOnly** (ligne 490) gère déjà correctement le cas ECOLE avec `!(day as any).isEcole`. Mais le mode **édition** passe `isAbsent={day.heuresNormales === 0}` sans exclure les chantiers ECOLE, ce qui affiche le sélecteur "À qualifier".

**Bonne nouvelle** : `rhShared.ts` fournit déjà `isEcole` et `isAbsent` correctement calculés sur chaque jour (lignes 669-712). Il suffit de les utiliser.

### Changement unique

**Fichier : `src/components/rh/RHEmployeeDetail.tsx`, ligne 494**

Remplacer :
```typescript
isAbsent={day.heuresNormales === 0}
```
Par :
```typescript
isAbsent={day.heuresNormales === 0 && !(day as any).isEcole}
```

### Robustesse — zéro régression

- **Source de données** : `isEcole` est déjà calculé dans `rhShared.ts` (ligne 711) et transmis dans chaque `detailJours`. Ce n'est pas un nouveau champ, il existe et est testé depuis le fix précédent.
- **Mode readOnly** : Déjà correct (ligne 490 vérifie `!(day as any).isEcole`). Ce fix aligne le mode édition sur la même logique.
- **Composant `EditableAbsenceTypeCell`** : Quand `isAbsent=false`, il affiche simplement "-". Aucun changement dans ce composant.
- **Propagation d'absence** : La propagation ne se déclenche que via le sélecteur, qui ne s'affichera plus pour ECOLE. Aucun effet de bord.
- **Chantiers non-ECOLE** : `isEcole` est `false`/`undefined` → la condition reste `heuresNormales === 0`, comportement identique.
- **Exports Excel/PDF** : Utilisent `rhShared.ts` qui calcule déjà `isAbsent` correctement avec le flag ECOLE. Aucun impact.
- **Aucune requête DB modifiée**, aucune donnée modifiée, changement purement visuel sur 1 ligne.

