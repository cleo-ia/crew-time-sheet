

# Fix : Diagnostic pour employés sans chef

## Problème
Quand un employé n'a pas de chef affecté (`chefId === null`), le diagnostic affiche "Bloqué côté chef" alors que c'est le conducteur qui est responsable de la transmission.

## Modification

### `src/hooks/useFicheBlockDetail.ts`

Dans la section diagnostic (ligne ~112), ajouter une vérification `chefId === null` avant la logique existante :

```typescript
if (!chefId) {
  diagnostic = "bloque_conducteur";
  diagnosticLabel = "Bloqué côté conducteur — en attente de transmission";
} else if (allPreChef) {
  diagnostic = "bloque_chef";
  diagnosticLabel = "Bloqué côté chef — le chef n'a pas encore transmis";
} else if (hasValideChef) {
  diagnostic = "bloque_conducteur";
  diagnosticLabel = "Bloqué côté conducteur — en attente de validation";
} else {
  diagnostic = "mixte";
  diagnosticLabel = "Statuts mixtes dans l'équipe";
}
```

Un seul fichier modifié, ~5 lignes changées.

