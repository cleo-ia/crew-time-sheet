
# Plan : Corriger l'affichage du badge Principal/Secondaire

## Diagnostic

Le badge "Principal/Secondaire" ne s'affiche pas correctement car la query `chefs-chantier-principal` n'est **jamais rafraîchie** après :
1. L'ajout initial d'un chef sur un chantier (auto-définition du principal)
2. Un clic sur le badge "Secondaire" pour changer de principal

### Données actuelles dans la base

| Employé | chantier_principal_id | Chantier correspondant |
|---------|----------------------|------------------------|
| FAY Philippe | `d356d762-3535-47c6-88eb-061df36abb83` | **CI229BALME** |

La base de données est **correcte** : CI229BALME est bien le principal de FAY Philippe.

### Problème

Le hook `useSetChantierPrincipal` invalide ces queries :
- `planning-affectations`
- `all-employes`
- `utilisateurs`

**Mais PAS** la query `chefs-chantier-principal` utilisée pour afficher le badge !

## Solution

Modifier `useSetChantierPrincipal.ts` pour invalider également la query `chefs-chantier-principal`.

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useSetChantierPrincipal.ts` | Ajouter l'invalidation de `chefs-chantier-principal` |

## Code à modifier

Ligne 29-31, ajouter :

```typescript
onSuccess: () => {
  // Invalider les queries pour rafraîchir les données
  queryClient.invalidateQueries({ queryKey: ["planning-affectations"] });
  queryClient.invalidateQueries({ queryKey: ["all-employes"] });
  queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
  queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] }); // AJOUT
  
  toast.success("Chantier principal mis à jour", {
    description: "Les heures du chef seront comptées sur ce chantier.",
  });
},
```

## Résultat attendu

Après cette correction :
- FAY Philippe sur CI229BALME → Badge **"★ Principal"**
- FAY Philippe sur CI230ROSEYRAN → Badge **"Secondaire"** (cliquable)
- FAY Philippe sur CI232ROMANCHE → Badge **"Secondaire"** (cliquable)
- Cliquer sur "Secondaire" change le principal et rafraîchit immédiatement l'affichage
