

# Plan : Nettoyage des assignations chef_id résiduelles pour SDER

## Contexte

Après la purge de la semaine S07, des assignations `chef_id` résiduelles persistent dans la table `chantiers` :

| Chantier | Chef assigné |
|----------|-------------|
| CI229BALME | Philippe DURAND |
| CI230ROSEYRAN | Philippe DURAND |
| CI234OISANS | Carlos GONCALVES |

Ces assignations ont été créées automatiquement par la fonction `sync-planning-to-teams` lors de la validation du planning S07. Elles persistent car la purge actuelle ne nettoie pas ce champ.

**Impact :** Ces `chef_id` vont router les équipes vers la "vue chef" au lieu de la "vue conducteur", perturbant le flux de test.

---

## Solution proposée

### Étape 1 : Modifier la fonction `purge-week`

Ajouter une nouvelle étape à la fin de la purge pour nettoyer les `chef_id` des chantiers concernés.

**Fichier :** `supabase/functions/purge-week/index.ts`

```text
// Après Step 12 (planning_validations)

// Step 13: Reset chef_id on chantiers (optional, via clear_chef_assignments flag)
if (clear_chef_assignments) {
  console.log('Step 13: Resetting chef_id on chantiers...');
  
  let resetQuery = supabase
    .from('chantiers')
    .update({ chef_id: null })
    .eq('entreprise_id', entreprise_id)
    .not('chef_id', 'is', null);
  
  if (filterByChantier) {
    resetQuery = resetQuery.eq('id', chantier_id);
  }
  
  const { error: resetError, count: resetCount } = await resetQuery;
  if (resetError) throw resetError;
  results.chantiers_chef_reset = resetCount || 0;
  console.log(`✅ Reset chef_id on ${resetCount} chantiers`);
}
```

**Modifications requises :**
1. Extraire `clear_chef_assignments` du body de la requête (ligne 24)
2. Ajouter l'étape 13 après la suppression des `planning_validations`

### Étape 2 : Déployer et exécuter

Après modification :
1. Déployer la fonction mise à jour
2. Appeler avec `clear_chef_assignments: true` pour nettoyer SDER

---

## Détails techniques

### Paramètres ajoutés

| Paramètre | Type | Description |
|-----------|------|-------------|
| `clear_chef_assignments` | boolean (optionnel) | Si `true`, remet `chef_id = NULL` sur les chantiers de l'entreprise |

### Sécurité

- Cette option est optionnelle et désactivée par défaut
- Seules les semaines autorisées peuvent être purgées (whitelist existante)
- L'`entreprise_id` reste obligatoire pour l'isolation multi-tenant

### Flux de données après nettoyage

```text
Chantiers SDER (après purge)
┌───────────────────┬─────────────────┐
│ Chantier          │ chef_id         │
├───────────────────┼─────────────────┤
│ CI229BALME        │ NULL            │
│ CI230ROSEYRAN     │ NULL            │
│ CI234OISANS       │ NULL            │
└───────────────────┴─────────────────┘

Conséquence :
- Les équipes s'affichent dans "Validation Conducteur"
- Le planning S+1 définira dynamiquement le chef responsable
- La synchronisation assignera le chef_id automatiquement
```

---

## Résultat attendu

Après exécution :
1. **Aucun chef assigné** sur les chantiers SDER
2. **Environnement vierge** pour tester le nouveau flux planning → saisie → transmission
3. **Pas d'interférence** des données résiduelles sur le routage des fiches

