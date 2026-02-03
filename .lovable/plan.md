
# Correction : Garde-fou conditionné à la présence dans le planning

## Problème identifié

Le garde-fou ajouté pour protéger les affectations des chefs multi-chantier est **trop agressif**. Il crée des affectations pour **tout chef ayant un `chantier_principal_id`**, même si ce chef n'est **pas dans le planning**.

### Cas FAY Philippe
| Donnée | Valeur |
|--------|--------|
| `chantier_principal_id` | CI232ROMANCHE |
| Présence dans planning S07 | **Non** (volontairement) |
| `chantiers.chef_id` pour ROMANCHE | **NULL** (volontairement) |
| Entrées créées dans `affectations_jours_chef` | **5** (par le garde-fou - **incorrect**) |

### Comportement attendu
Si FAY n'est pas dans le planning :
- **Pas d'entrées** dans `affectations_jours_chef` pour FAY
- **Pas de fiche** pour FAY sur ROMANCHE
- Les équipiers (BEYA, AMARAL, AYAT) sont routés vers `affectations_finisseurs_jours` (gérés par le conducteur)

## Solution technique

Modifier le garde-fou pour qu'il ne s'exécute **que si le chef est réellement dans le planning** de la semaine courante.

### Modification dans `sync-planning-to-teams/index.ts`

**Lignes 588-633** : Ajouter une condition de présence dans le planning

```
Avant (problématique):
for (const [chefId, chantierPrincipalId] of chefPrincipalMap) {
  // Force création 5 jours sur principal pour TOUS les chefs avec principal défini
}

Après (corrigé):
for (const [chefId, chantierPrincipalId] of chefPrincipalMap) {
  // Vérifier si ce chef est réellement dans le planning de cette semaine
  const chefInPlanning = [...planningByEmployeChantier.keys()]
    .some(key => key.startsWith(`${chefId}|`))
  
  if (!chefInPlanning) {
    // Chef absent du planning → ne pas forcer ses affectations
    continue
  }
  
  // ... reste de la logique
}
```

### Impact sur les différents scénarios

| Scénario | Avant correction | Après correction |
|----------|------------------|------------------|
| Chef Philippe DURAND (multi-chantier, dans planning) | ✅ 5 jours sur principal | ✅ 5 jours sur principal |
| Chef FAY Philippe (pas dans planning) | ❌ 5 jours créés à tort | ✅ 0 jour (correct) |
| Équipiers BEYA, AMARAL, AYAT | ➡️ Routés vers conducteur | ➡️ Routés vers conducteur |

### Nettoyage des données existantes

Après déploiement, relancer la synchronisation pour supprimer les 5 entrées incorrectes de FAY dans `affectations_jours_chef`.

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/sync-planning-to-teams/index.ts` | Ajouter condition `chefInPlanning` au garde-fou (lignes 588-590) |

## Tests de validation

### Test 1 : FAY Philippe après correction
```text
SELECT * FROM affectations_jours_chef 
WHERE macon_id = 'bb2d0b6f-3365-4925-aeb7-80984d8633f8' 
AND semaine = '2025-S07';
-- Attendu : 0 ligne
```

### Test 2 : Équipiers routés vers conducteur
```text
SELECT * FROM affectations_finisseurs_jours 
WHERE chantier_id = '2bb1f6fe-909f-4c7e-aa1e-c5b4934f00cf'
AND semaine = '2025-S07';
-- Attendu : 15 entrées (3 équipiers × 5 jours)
```

### Test 3 : Philippe DURAND toujours protégé
```text
SELECT * FROM affectations_jours_chef 
WHERE macon_id = '[PHILIPPE_DURAND_ID]' 
AND semaine = '2025-S07'
AND chantier_id = '[BALME_ID]';
-- Attendu : 5 lignes (protection maintenue)
```
