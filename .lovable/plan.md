
# Plan : Auto-définition du chantier principal lors du premier ajout d'un chef

## Contexte

Actuellement, lorsqu'un chef est ajouté pour la première fois dans le planning, le système ne définit pas automatiquement de chantier principal. Cela crée une incohérence :
- Sébastien Bouillet apparaît sur DAVOULT avec le badge "Secondaire"
- Mais il n'a pas de chantier principal réellement assigné dans le planning courant

## Objectif

Implémenter la règle métier : **"Le premier chantier où un chef est ajouté devient automatiquement son chantier principal"**

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/PlanningMainOeuvre.tsx` | Modifier `handleAddEmploye` pour auto-définir le principal |

## Implémentation détaillée

### Modification de `handleAddEmploye` (lignes 194-209)

```typescript
const handleAddEmploye = async (
  employeId: string, 
  chantierId: string, 
  days: string[]
) => {
  // Créer une affectation pour chaque jour sélectionné
  for (const date of days) {
    await upsertAffectation.mutateAsync({
      employe_id: employeId,
      chantier_id: chantierId,
      jour: date,
      semaine,
      entreprise_id: entrepriseId,
    });
  }

  // 🆕 AUTO-DÉFINITION DU CHANTIER PRINCIPAL
  // Si cet employé est un chef sans chantier principal défini,
  // ce chantier devient automatiquement son chantier principal
  if (!chefsWithPrincipal.has(employeId)) {
    // Vérifier si c'est un chef (via une requête)
    const { data: empData } = await supabase
      .from("utilisateurs")
      .select("role_metier")
      .eq("id", employeId)
      .maybeSingle();

    if (empData?.role_metier === "chef") {
      // Définir ce chantier comme principal
      await supabase
        .from("utilisateurs")
        .update({ chantier_principal_id: chantierId })
        .eq("id", employeId);

      // Rafraîchir le cache pour que l'UI se mette à jour
      queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });

      toast({
        title: "Chantier principal défini",
        description: "Ce chef est automatiquement rattaché à ce chantier comme site principal.",
      });
    }
  }
};
```

### Dépendances nécessaires

Le code actuel utilise déjà :
- `supabase` (importé ligne 4)
- `chefsWithPrincipal` (ligne 98, déjà passé au composant)
- `toast` (ligne 82)

Il faudra ajouter :
- `useQueryClient` de React Query pour invalider le cache

### Ajouts au fichier

1. Import de `useQueryClient` :
```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
```

2. Initialisation dans le composant :
```typescript
const queryClient = useQueryClient();
```

## Comportement attendu après modification

| Scénario | Résultat |
|----------|----------|
| Chef ajouté pour la 1ère fois sur un chantier | Badge "Principal ★" affiché, `chantier_principal_id` défini en base |
| Chef déjà rattaché à un principal, ajouté sur un autre chantier | Badge "Secondaire" affiché, pas de modification en base |
| Maçon / Finisseur / Intérimaire ajouté | Aucun changement (la logique ne s'applique qu'aux chefs) |

## Résumé des changements

```text
src/pages/PlanningMainOeuvre.tsx
├─ Import useQueryClient (ligne ~1-5)
├─ Ajouter const queryClient = useQueryClient() (ligne ~82)
└─ Modifier handleAddEmploye (lignes 194-209) :
   └─ Ajouter la logique de détection chef + définition principal
```
