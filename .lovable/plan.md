

# Décocher "Trajet" par défaut pour le chef multi-chantier sur son chantier secondaire

## Le problème

Quand les données du chef sont chargées depuis la base de données sur son chantier secondaire, la ligne 543 force `trajet = true` par défaut :
```typescript
const trajet = (isTrajetPerso || isGD) ? false : true;
```

Cela ne tient pas compte du fait que le chef est sur un chantier secondaire et devrait avoir trajet décoché par défaut (comme le panier).

## La solution

Modifier la ligne 543 pour intégrer la condition `useZeroDefaults` :

```typescript
const trajet = useZeroDefaults ? false : ((isTrajetPerso || isGD) ? false : true);
```

Quand `useZeroDefaults` est vrai (chef sur chantier secondaire), trajet sera décoché. Le chef pourra toujours le cocher manuellement si nécessaire.

## Fichier modifié

**`src/components/timesheet/TimeEntryTable.tsx`** - ligne 543

## Cohérence

L'initialisation par défaut (ligne 510) utilise déjà `const defaultTrajet = !useZeroDefaults` ce qui est correct. Cette modification aligne le chargement depuis la BDD avec la même logique.

