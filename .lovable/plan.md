

# Correction : Conditionner la protection anti-suppression à la présence dans le planning

## Problème identifié

Le code actuel protège les entrées `affectations_jours_chef` d'un chef sur son chantier principal **systématiquement**, même si le chef est absent du planning.

### Lignes problématiques (660-672)

```typescript
const toDeleteChef = [...new Set((existingChefS || [])
  .filter((a) => {
    const key = `${a.macon_id}|${a.chantier_id}`
    if (employeChantierInPlanning.has(key)) return false
    // ❌ PROBLÈME: Protection inconditionnelle
    const chefPrincipal = chefPrincipalMap.get(a.macon_id)
    if (chefPrincipal && a.chantier_id === chefPrincipal) return false
    return true
  })
  ...
)]
```

### Cas FAY Philippe

| Donnée | Valeur |
|--------|--------|
| `chantier_principal_id` | CI232ROMANCHE |
| Présence dans planning S07 | **Non** |
| Entrées dans `affectations_jours_chef` | **5** (protégées par erreur) |
| Action attendue | **Suppression des 5 entrées** |

## Solution technique

Modifier la logique de protection pour qu'elle ne s'applique **que si le chef est dans le planning**.

### Modification (lignes 662-672)

```
Avant (problématique):
const chefPrincipal = chefPrincipalMap.get(a.macon_id)
if (chefPrincipal && a.chantier_id === chefPrincipal) return false

Après (corrigé):
const chefPrincipal = chefPrincipalMap.get(a.macon_id)
// CORRECTION: Protéger SEULEMENT si le chef est dans le planning de la semaine
const chefDansPlanning = employeChantierInPlanning.has(`${a.macon_id}|${chefPrincipal}`) ||
  [...employeChantierInPlanning.keys()].some(key => key.startsWith(`${a.macon_id}|`))
if (chefPrincipal && a.chantier_id === chefPrincipal && chefDansPlanning) return false
```

### Impact sur les scénarios

| Scénario | Avant | Après |
|----------|-------|-------|
| Philippe DURAND (dans planning) sur BALME | ✅ Protégé | ✅ Protégé |
| FAY Philippe (pas dans planning) sur ROMANCHE | ❌ Protégé à tort | ✅ Supprimé |

## Fichier à modifier

| Fichier | Lignes | Modification |
|---------|--------|--------------|
| `supabase/functions/sync-planning-to-teams/index.ts` | 667-669 | Ajouter condition `chefDansPlanning` |

## Tests de validation après déploiement

### Test 1 : FAY Philippe
```sql
SELECT * FROM affectations_jours_chef 
WHERE macon_id = 'bb2d0b6f-3365-4925-aeb7-80984d8633f8' 
AND semaine = '2026-S07';
-- Attendu : 0 ligne (plus aucune entrée)
```

### Test 2 : Philippe DURAND (non-régression)
```sql
SELECT COUNT(*) FROM affectations_jours_chef 
WHERE macon_id = '8d750640-9b7e-45d1-8e2c-6c3b154fe35c' 
AND chantier_id = 'd356d762-3535-47c6-88eb-061df36abb83'
AND semaine = '2026-S07';
-- Attendu : 5 lignes (protection maintenue)
```

## Actions post-déploiement

1. Déployer l'Edge Function corrigée
2. Relancer la synchronisation manuelle (Admin > Rappels > "Synchroniser maintenant")
3. Vérifier la suppression des entrées de FAY Philippe

