

# Vue Super Admin - Espace Conducteur

## Problème identifié

En tant que super admin (`tom.genin@groupe-engo.com`), l'Espace Conducteur ne montre aucune donnée car :

1. **Pas de fiche utilisateur liée** : votre compte n'a pas d'entrée dans la table `utilisateurs` avec `auth_user_id` correspondant
2. **Pas d'affectations** : le hook `useFinisseursByConducteur` filtre strictement par `conducteur_id`, donc même si vous aviez un `utilisateur.id`, vous ne seriez affecté à personne
3. **Aucun sélecteur conducteur** : la page ne propose pas de choisir un conducteur à visualiser/éditer

## Solution proposée

Ajouter un **sélecteur de conducteur** visible uniquement pour les `super_admin`, permettant de :
- Voir tous les conducteurs de l'entreprise
- Sélectionner un conducteur spécifique pour voir/modifier son équipe
- Éditer les affectations comme si vous étiez ce conducteur

## Fichiers à modifier

### 1. ValidationConducteur.tsx

**Modifications principales :**

```text
+---------------------------------------------+
|  Espace Conducteur          [Super Admin]   |
+---------------------------------------------+
|  Conducteur: [Dropdown: Tous les conducteurs]  
|   ↓ G. Fournier                             |
|   ↓ S. Lemaire                              |
+---------------------------------------------+
|  Semaine sélectionnée                       |
|  ...reste de l'interface inchangée          |
+---------------------------------------------+
```

**Changements de code :**

- Importer `useCurrentUserRole` pour détecter le super_admin
- Importer `useUtilisateursByRole("conducteur")` pour lister les conducteurs
- Ajouter un état `selectedConducteurId` (distinct de `conducteurId`)
- Pour super_admin : afficher un sélecteur avec liste des conducteurs
- Utiliser `selectedConducteurId` au lieu de `conducteurId` dans tous les hooks

**Lignes 59-65** : Ajouter les états

```typescript
// Pour super_admin : conducteur sélectionné (différent du conducteur connecté)
const [selectedConducteurIdAdmin, setSelectedConducteurIdAdmin] = useState<string | null>(null);

// Importer le rôle
const { data: userRole } = useCurrentUserRole();
const isSuperAdmin = userRole === "super_admin";
```

**Lignes 132-154** : Modifier la logique de récupération

```typescript
// Pour super_admin, permettre de choisir un conducteur
// Pour conducteur normal, utiliser son propre ID
const effectiveConducteurId = isSuperAdmin 
  ? selectedConducteurIdAdmin 
  : conducteurId;
```

**Nouveau composant dans le header** (entre PageHeader et WeekSelector) :

```typescript
{isSuperAdmin && (
  <Card className="mb-4 p-4 bg-amber-50 border-amber-200">
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-amber-800">
        Vue Super Admin - Sélectionner un conducteur :
      </span>
      <Select 
        value={selectedConducteurIdAdmin || ""} 
        onValueChange={setSelectedConducteurIdAdmin}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Choisir un conducteur..." />
        </SelectTrigger>
        <SelectContent>
          {conducteurs?.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.prenom} {c.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </Card>
)}
```

### 2. Imports à ajouter

```typescript
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
```

### 3. Hook pour charger les conducteurs

```typescript
// Charger la liste des conducteurs (pour super_admin)
const { data: conducteurs = [] } = useUtilisateursByRole(
  isSuperAdmin ? "conducteur" : undefined
);
```

## Flux utilisateur

```text
Super Admin se connecte
         ↓
Accède à "Espace conducteur"
         ↓
Voit le sélecteur "Choisir un conducteur"
         ↓
Sélectionne "G. Fournier"
         ↓
Voit l'équipe de Fournier (DARCOURT, KASMI...)
         ↓
Peut modifier les affectations
         ↓
Les modifications sont enregistrées au nom de Fournier
```

## Vérification des données existantes

Pour la semaine S05 (SDER) :
- **Conducteur**: G. Fournier (`a321ff73-d880-4598-9b29-b85783d5dd92`)
- **Affectations**: 7 affectations dans `affectations_finisseurs_jours`
- **Chantier**: TEST (`da638cc1-9738-4a8c-84ff-99cd8a90f56f`)

Avec cette solution, vous pourrez :
1. Sélectionner G. Fournier dans le dropdown
2. Voir ses 7 affectations pour la semaine S05
3. Voir/modifier l'équipe TEST (DARCOURT, KASMI)

## Impact

- **1 fichier modifié** : `src/pages/ValidationConducteur.tsx`
- **~30 lignes ajoutées**
- **Aucun changement de base de données**
- **Rétrocompatibilité** : les conducteurs normaux voient leur interface inchangée

