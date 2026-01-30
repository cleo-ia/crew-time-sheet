
# Correction critique : Restriction du sélecteur de chef

## Problème identifié

**Faille de sécurité UI** : Un chef connecté peut voir et sélectionner d'autres chefs dans le dropdown "Chef de chantier". Cela lui permet potentiellement de consulter les fiches d'autres chefs.

Sur la capture d'écran : Carlos Goncalves est connecté mais peut choisir parmi Philippe Durand, Philippe Fay, Sebastien Pierre Lanteri, etc.

## Cause racine

Le `UserSelector` dans `Index.tsx` (ligne 544) affiche tous les chefs de l'entreprise sans vérifier le rôle de l'utilisateur connecté :

```tsx
<UserSelector role="chef" value={selectedChef} onChange={setSelectedChef} />
```

Le code auto-sélectionne le chef connecté (lignes 129-130), mais le sélecteur reste **interactif** et permet de changer.

## Solution proposée

### Fichier : `src/pages/Index.tsx`

1. **Ajouter le hook `useCurrentUserRole`** pour récupérer le rôle de l'utilisateur connecté

2. **Conditionner l'affichage du sélecteur** :
   - Si `role === "chef"` → Afficher le nom du chef en lecture seule (pas de dropdown)
   - Si `role === "super_admin"` → Afficher le `UserSelector` complet (comportement actuel)

3. **Créer un composant d'affichage statique** pour le nom du chef (ou utiliser un input disabled)

### Modifications détaillées

**Import à ajouter :**
```tsx
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
```

**Récupérer le rôle :**
```tsx
const { data: currentRole } = useCurrentUserRole();
const isChefRole = currentRole === "chef";
```

**Remplacement du sélecteur (lignes 539-545) :**
```tsx
<div>
  <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
    <Users className="h-4 w-4 text-primary" />
    Chef de chantier
  </label>
  {isChefRole ? (
    // Chef connecté : affichage en lecture seule
    <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted/50 rounded-md text-sm">
      {chefInfo ? `${chefInfo.prenom} ${chefInfo.nom}` : "Chargement..."}
    </div>
  ) : (
    // Super admin : sélecteur complet
    <UserSelector role="chef" value={selectedChef} onChange={setSelectedChef} />
  )}
</div>
```

## Impact

- **Sécurité** : Un chef ne peut plus voir ni sélectionner d'autres chefs
- **Super admin** : Conserve la possibilité de naviguer entre les chefs (cas de support/debug)
- **UX** : Le chef connecté voit son propre nom affiché de manière claire

## Tests à effectuer

1. Se connecter avec un compte **chef** → Vérifier que le sélecteur est remplacé par un affichage texte statique
2. Se connecter avec un compte **super_admin** → Vérifier que le dropdown fonctionne toujours
3. Recharger la page → Vérifier que le chef est toujours auto-sélectionné et verrouillé
