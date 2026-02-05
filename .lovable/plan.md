
# Plan de correction : Bug `sync-planning-to-teams`

## Problème identifié

Les fonctions `copyFichesFromPreviousWeek` et `createNewAffectation` **sortent prématurément** lorsqu'une fiche existe déjà avec des heures (`total_heures > 0`).

```
AVANT (bug) :
1. Vérifie si fiche existe avec heures
2. Si oui → RETURN (sort de la fonction) ❌
3. Crée/copie fiches_jours (jamais atteint)
4. Crée affectations_jours_chef (jamais atteint) ❌
```

La création des `affectations_jours_chef` se trouve **après** ce `return` prématuré, donc elle n'est jamais exécutée pour les employés ayant déjà des heures.

## Solution

Restructurer les deux fonctions pour **toujours créer les `affectations_jours_chef`**, même si la fiche existe déjà avec des heures. La protection des heures reste active (on ne modifie pas les fiches_jours existantes), mais les affectations de présence doivent être créées.

---

## Modifications techniques

### Fichier : `supabase/functions/sync-planning-to-teams/index.ts`

### 1. Fonction `copyFichesFromPreviousWeek` (ligne ~794)

**Avant** (lignes 814-816) :
```typescript
if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
  return { copied: false, reason: `Fiche existante avec ${existingFiche.total_heures}h` }
}
```

**Après** :
```typescript
// Si fiche existe avec heures, on ne copie pas les heures
// MAIS on crée quand même les affectations_jours_chef
if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
  // Créer les affectations malgré tout
  if (chantier?.chef_id) {
    const mondayS = parseISOWeek(currentWeek)
    for (let i = 0; i < 5; i++) {
      const d = new Date(mondayS)
      d.setDate(mondayS.getDate() + i)
      const jour = d.toISOString().split('T')[0]
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
  }
  return { copied: false, reason: `Fiche protégée (${existingFiche.total_heures}h), affectations créées` }
}
```

### 2. Fonction `createNewAffectation` (ligne ~955)

**Avant** (lignes 975-977) :
```typescript
if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
  return { created: false, reason: `Fiche existante avec ${existingFiche.total_heures}h` }
}
```

**Après** :
```typescript
// Si fiche existe avec heures, on ne crée pas de nouvelles heures
// MAIS on crée quand même les affectations_jours_chef pour les jours planifiés
if (existingFiche && existingFiche.total_heures && existingFiche.total_heures > 0) {
  // Créer les affectations sur les jours planifiés
  if (chantier?.chef_id) {
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
    for (const jour of joursPlanning) {
      await supabase
        .from('affectations_finisseurs_jours')
        .upsert({
          finisseur_id: employeId,
          conducteur_id: chantier.conducteur_id,
          chantier_id: chantierId,
          date: jour,
          semaine: currentWeek,
          entreprise_id: entrepriseId
        }, { onConflict: 'finisseur_id,date' })
    }
  }
  return { created: false, reason: `Fiche protégée (${existingFiche.total_heures}h), affectations créées` }
}
```

---

## Résumé du comportement après correction

| Scénario | Fiche/heures | Affectations |
|----------|--------------|--------------|
| Nouvelle affectation | ✅ Créées | ✅ Créées |
| Fiche existante SANS heures | ✅ Mises à jour | ✅ Créées |
| Fiche existante AVEC heures | ⛔ Protégées | ✅ Créées ✔️ |

---

## Test post-déploiement

1. Relancer la synchronisation manuelle pour Limoge Revillon S06
2. Vérifier que Jérôme DEPART voit son équipe de 12 personnes
3. Confirmer que les heures déjà saisies n'ont pas été modifiées
