
# Plan : Corriger les sélecteurs de véhicule et conducteur dans la fiche trajet conducteur

## Problème identifié

Les comboboxes d'immatriculation et de conducteurs ne s'ouvrent pas ou ne montrent pas les options correctement dans la fiche trajet côté conducteur.

## Cause technique

Le composant `VehiculeCombobox.tsx` n'utilise pas correctement le composant `CommandList` de la librairie `cmdk`, ce qui empêche le rendu correct de la liste déroulante.

### Comparaison des patterns

| Composant | Structure |
|-----------|-----------|
| ConducteurCombobox (correct) | Command → CommandInput → **CommandList** → CommandEmpty → CommandGroup |
| VehiculeCombobox (problème) | Command → CommandInput → CommandEmpty → CommandGroup ❌ |
| PlanningVehiculeCombobox (référence) | Command → CommandInput → **CommandList** → CommandEmpty → CommandGroup ✓ |

## Correction requise

### Fichier : `src/components/transport/VehiculeCombobox.tsx`

Ajouter le composant `CommandList` autour de `CommandEmpty` et `CommandGroup` :

**Avant (lignes 138-142)** :
```tsx
<Command>
  <CommandInput placeholder="Rechercher une plaque..." className="font-mono" />
  <CommandEmpty>Aucune plaque trouvée.</CommandEmpty>
  <CommandGroup className="max-h-64 overflow-auto">
```

**Après** :
```tsx
<Command>
  <CommandInput placeholder="Rechercher une plaque..." className="font-mono" />
  <CommandList>
    <CommandEmpty>Aucune plaque trouvée.</CommandEmpty>
    <CommandGroup className="max-h-64 overflow-auto">
    ...
    </CommandGroup>
  </CommandList>
```

### Imports requis

Ajouter `CommandList` aux imports depuis `@/components/ui/command` (ligne 7).

## Résultat attendu

Après cette correction :
- ✅ Le sélecteur d'immatriculation s'ouvrira et affichera la liste des véhicules
- ✅ Les conducteurs matin/soir seront sélectionnables (ils utilisent déjà le bon pattern)
- ✅ La recherche fonctionnera correctement
