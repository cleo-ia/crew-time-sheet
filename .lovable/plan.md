

## Ajouter les badges de rôle dans le récapitulatif conducteurs

### Probleme
Le récapitulatif conducteurs affiche uniquement le nom. Il faut ajouter le badge de rôle (Maçon, Chef, Intérimaire, etc.) a coté du nom, comme dans les autres tableaux RH.

### Approche
Le code actuel ne stocke que le nom (string) dans `driverCounts`. Il faut aussi récupérer le `role_metier` depuis la table `utilisateurs` et le propager jusqu'au récapitulatif.

### Modifications — `src/components/rh/RHTransportTab.tsx`

1. **Fetch `role_metier`** : Ajouter `role_metier` au select des utilisateurs (ligne 86) : `"id, nom, prenom, role_metier"`

2. **Stocker le rôle par nom** : Créer un `Map<string, string>` qui associe chaque nom de conducteur a son `role_metier` (macon, chef, finisseur, interimaire, grutier, conducteur)

3. **Propager dans le récapitulatif** : Dans le `driverSummary`, utiliser cette map pour afficher un `<RoleBadge>` a coté du nom dans la colonne "Conducteur"

4. **Import** : Ajouter `import { RoleBadge } from "@/components/ui/role-badge"`

Le tableau de détail en bas reste inchangé (pas de badge la-bas).

