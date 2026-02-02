
# Plan : Corriger l'association automatique chef_id lors de l'ajout au planning

## Problème identifié

Quand un chef (FAY Philippe) est ajouté au planning d'un chantier (ROSEYRAN, ROMANCHE) :
1. **Le chef a déjà un `chantier_principal_id`** → la condition `!chefsWithPrincipal.has(employeId)` est `false`
2. **Donc on n'exécute PAS** la logique d'association `chef_id` au chantier
3. **Résultat** : `chantiers.chef_id = NULL` pour ROSEYRAN et ROMANCHE
4. **Synchronisation** : le routing utilise `chantier.chef_id` qui est `NULL` → route vers conducteur au lieu du chef

### Règles clarifiées (confirmées par l'utilisateur)

| Chantier | Employés concernés | Destination |
|----------|-------------------|-------------|
| Avec chef (`chef_id` défini) | TOUS (maçons, finisseurs, grutiers, intérimaires) | `affectations_jours_chef` |
| Sans chef (`chef_id` NULL) | Maçons inclus | `affectations_finisseurs_jours` (côté conducteur) |
| Un seul chef par chantier | Si plusieurs chefs planifiés = anomalie |

## Modifications à apporter

### Fichier 1 : `src/pages/PlanningMainOeuvre.tsx`

**Objectif** : Associer TOUJOURS le `chef_id` au chantier quand un chef est ajouté, indépendamment de son `chantier_principal_id`.

**Lignes concernées** : 195-255

**Modification** :
```typescript
const handleAddEmploye = async (
  employeId: string, 
  chantierId: string, 
  days: string[]
) => {
  // Créer les affectations...
  for (const date of days) {
    await upsertAffectation.mutateAsync({...});
  }

  // Vérifier si c'est un chef (via une requête)
  const { data: empData } = await supabase
    .from("utilisateurs")
    .select("role_metier")
    .eq("id", employeId)
    .maybeSingle();

  if (empData?.role_metier === "chef") {
    // 1. TOUJOURS associer le chef au chantier si pas de chef_id existant
    const { data: chantierData } = await supabase
      .from("chantiers")
      .select("chef_id")
      .eq("id", chantierId)
      .single();

    if (!chantierData?.chef_id) {
      await supabase
        .from("chantiers")
        .update({ chef_id: employeId })
        .eq("id", chantierId);
      
      queryClient.invalidateQueries({ queryKey: ["chantiers"] });
      
      toast({
        title: "Chef associé au chantier",
        description: "Ce chef est désormais responsable de ce chantier.",
      });
    }

    // 2. Définir comme chantier principal seulement si le chef n'en a pas
    if (!chefsWithPrincipal.has(employeId)) {
      await supabase
        .from("utilisateurs")
        .update({ chantier_principal_id: chantierId })
        .eq("id", employeId);
      
      queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });
      
      toast({
        title: "Chantier principal défini",
        description: "Les heures du chef seront comptées sur ce chantier.",
      });
    }
  }
};
```

### Fichier 2 : `src/hooks/useSetChantierPrincipal.ts`

**Objectif** : Invalider le cache des chantiers après mise à jour du `chef_id`.

**Modification à la ligne 43-47** : Ajouter l'invalidation du cache `["chantiers"]`
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["planning-affectations"] });
  queryClient.invalidateQueries({ queryKey: ["all-employes"] });
  queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
  queryClient.invalidateQueries({ queryKey: ["chefs-chantier-principal"] });
  queryClient.invalidateQueries({ queryKey: ["chantiers"] }); // ✅ AJOUT
  
  toast.success("Chantier principal mis à jour", {
    description: "Les heures du chef seront comptées sur ce chantier.",
  });
},
```

### Fichier 3 : `supabase/functions/sync-planning-to-teams/index.ts`

**Objectif** : 
1. Inclure le `role_metier` dans la requête planning
2. Auto-assigner `chef_id` si un chef est planifié sur un chantier sans chef
3. Router TOUS les employés vers `affectations_jours_chef` quand le chantier a un chef
4. Router vers `affectations_finisseurs_jours` UNIQUEMENT si le chantier n'a pas de chef

**Modification 1 - Ligne 217-225** : Ajouter `role_metier` à la requête
```typescript
const { data: planningData, error: planningError } = await supabase
  .from('planning_affectations')
  .select(`
    *,
    employe:utilisateurs!planning_affectations_employe_id_fkey(
      id, prenom, nom, role_metier
    )
  `)
  .eq('semaine', currentWeek)
  .eq('entreprise_id', entrepriseId)
```

**Modification 2 - Après ligne 309** : Auto-assigner `chef_id` si nécessaire
```typescript
const chantier = chantiersMap.get(chantierId)
const employe = affectations[0]?.employe

// AUTO-ASSIGNATION: Si c'est un chef et que le chantier n'a pas de chef_id, l'assigner
if (employe?.role_metier === 'chef' && chantier && !chantier.chef_id) {
  console.log(`[sync] Auto-assignation chef ${employeNom} au chantier ${chantierId}`)
  await supabase
    .from('chantiers')
    .update({ chef_id: employeId })
    .eq('id', chantierId)
  
  // Mettre à jour l'objet local pour le reste du traitement
  chantier.chef_id = employeId
  chantiersMap.set(chantierId, chantier)
}
```

**Modification 3 - Fonctions `createNewAffectation` et `copyFichesFromPreviousWeek` (lignes 621-773)** : Modifier la logique de routing

Actuellement :
```typescript
if (chantier?.chef_id) {
  // → affectations_jours_chef
} else if (chantier?.conducteur_id) {
  // → affectations_finisseurs_jours
}
```

Nouvelle logique :
```typescript
if (chantier?.chef_id) {
  // Chantier avec chef → TOUT LE MONDE va côté chef
  for (const jour of joursPlanning) {
    await supabase
      .from('affectations_jours_chef')
      .upsert({
        macon_id: employeId,
        chef_id: chantier.chef_id,
        chantier_id: chantierId,
        jour,
        semaine: currentWeek,
        entreprise_id: entrepriseId
      }, { onConflict: 'macon_id,jour' })
  }
} else if (chantier?.conducteur_id) {
  // Chantier SANS chef mais avec conducteur → tout le monde côté conducteur
  for (const jour of joursPlanning) {
    await supabase
      .from('affectations_finisseurs_jours')
      .upsert({
        finisseur_id: employeId,
        conducteur_id: chantier.conducteur_id,
        chantier_id: chantierId,
        date: jour,
        semaine: currentWeek
      }, { onConflict: 'finisseur_id,date' })
  }
}
```

## Résumé des modifications

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `PlanningMainOeuvre.tsx` | Déplacer l'association `chef_id` AVANT la condition `chefsWithPrincipal` | Correction immédiate côté frontend |
| `useSetChantierPrincipal.ts` | Ajouter invalidation cache `["chantiers"]` | Cache cohérent |
| `sync-planning-to-teams/index.ts` | Auto-assignation chef + routing unifié vers chef | Correction backend robuste |

## Résultat attendu après correction

1. Quand FAY Philippe est ajouté au planning de ROSEYRAN :
   - `chantiers.chef_id = FAY` ✅
   - Son équipe (ADIGUZEL, BEYA, BABAY ROUIS) → `affectations_jours_chef` ✅
   
2. Quand la synchronisation s'exécute :
   - Tous les employés du chantier → `affectations_jours_chef`
   - Visible côté "Saisie hebdomadaire" du chef ✅

3. Pour un chantier SANS chef (chef_id = NULL) :
   - Les maçons aussi → `affectations_finisseurs_jours` (côté conducteur)

## Données corrompues S07

Après le déploiement, il faudra :
1. **Purger** S07 SDER avec le nouveau `purge-week` (entreprise_id obligatoire)
2. **Re-synchroniser** pour recréer les bonnes affectations
