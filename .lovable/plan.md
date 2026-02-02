

# Plan : Lier automatiquement chef_id du chantier lors de l'affectation dans le Planning

## Contexte

Actuellement, quand un chef est ajouté à un chantier via le Planning S+1 :
- ✅ `utilisateurs.chantier_principal_id` est mis à jour (pour gérer les heures du chef)
- ❌ `chantiers.chef_id` reste **NULL**

Conséquence : Lors de la synchronisation, le bloc `if (chantier?.chef_id)` (ligne 748) est toujours false, donc les `affectations_jours_chef` ne sont jamais créées.

## Solution

Modifier la logique d'ajout d'un chef dans le Planning pour mettre à jour **simultanément** :
1. `utilisateurs.chantier_principal_id` → Le chantier où ses heures sont comptées
2. `chantiers.chef_id` → Le chef responsable de ce chantier

### Règle métier
- **Premier chef ajouté sur un chantier** → Ce chantier devient son chantier principal + le chantier reçoit ce chef_id
- **Chef ajouté sur un chantier secondaire** → Seul `chantier_principal_id` est défini si pas encore défini, mais `chef_id` du chantier secondaire reste inchangé (sauf si null)

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/PlanningMainOeuvre.tsx` | Dans `handleAddEmploye`, ajouter la mise à jour de `chantiers.chef_id` |
| `src/hooks/useSetChantierPrincipal.ts` | Optionnel : Synchroniser aussi `chantiers.chef_id` lors du changement de chantier principal |

## Modifications concrètes

### 1. `src/pages/PlanningMainOeuvre.tsx` - handleAddEmploye (lignes 195-238)

Ajouter après la mise à jour de `chantier_principal_id` :

```typescript
if (empData?.role_metier === "chef") {
  // Définir ce chantier comme principal pour le chef
  await supabase
    .from("utilisateurs")
    .update({ chantier_principal_id: chantierId })
    .eq("id", employeId);

  // ✅ NOUVEAU : Associer ce chef au chantier (si pas déjà un chef assigné)
  const { data: chantierData } = await supabase
    .from("chantiers")
    .select("chef_id")
    .eq("id", chantierId)
    .single();

  // Si le chantier n'a pas encore de chef, assigner celui-ci
  if (!chantierData?.chef_id) {
    await supabase
      .from("chantiers")
      .update({ chef_id: employeId })
      .eq("id", chantierId);
    
    // Invalider le cache des chantiers
    queryClient.invalidateQueries({ queryKey: ["chantiers"] });
  }

  toast({
    title: "Chantier principal défini",
    description: "Ce chef est rattaché à ce chantier.",
  });
}
```

### 2. `src/hooks/useSetChantierPrincipal.ts` - Synchronisation bidirectionnelle

Quand un chef change son chantier principal manuellement, mettre aussi à jour `chantiers.chef_id` :

```typescript
mutationFn: async ({ employeId, chantierId }) => {
  // 1. Mettre à jour le chantier principal de l'utilisateur
  const { error: userError } = await supabase
    .from("utilisateurs")
    .update({ chantier_principal_id: chantierId })
    .eq("id", employeId);

  if (userError) throw userError;

  // 2. Si le chantier n'a pas de chef, associer ce chef
  const { data: chantier } = await supabase
    .from("chantiers")
    .select("chef_id")
    .eq("id", chantierId)
    .single();

  if (!chantier?.chef_id) {
    await supabase
      .from("chantiers")
      .update({ chef_id: employeId })
      .eq("id", chantierId);
  }
}
```

## Gestion des cas multi-chantiers

Pour un chef sur plusieurs chantiers (ex: FAY Philippe sur ROSEYRAN + ROMANCHE) :

| Action | `utilisateurs.chantier_principal_id` | `chantiers.chef_id` |
|--------|--------------------------------------|---------------------|
| Ajout sur ROSEYRAN (1er chantier) | → ROSEYRAN | ROSEYRAN.chef_id → FAY |
| Ajout sur ROMANCHE (2ème chantier) | inchangé (ROSEYRAN) | ROMANCHE.chef_id → FAY (si null) |

Ainsi les deux chantiers ont leur `chef_id` correctement renseigné.

## Après ces modifications

1. Aller dans le Planning S+1 pour S07
2. Retirer et ré-ajouter FAY Philippe sur les chantiers (ou corriger manuellement en base)
3. La synchronisation créera correctement les `affectations_jours_chef`
4. La vue "Saisie hebdomadaire" affichera l'équipe complète

## Alternative : Correction manuelle immédiate

Pour débloquer S07 sans attendre le code, exécuter :

```sql
-- Associer FAY Philippe aux chantiers où il est planifié
UPDATE chantiers 
SET chef_id = 'UUID_DE_FAY_PHILIPPE'
WHERE id IN ('c08b254e-9d2b-422d-8b48-0d0c22dfc3e3', '2bb1f6fe-909f-4c7e-aa1e-c5b4934f00cf')
AND chef_id IS NULL;

-- Puis re-synchroniser S07 depuis Admin > Rappels
```

