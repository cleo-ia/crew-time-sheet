
# Plan de correction : Garantie des affectations chef multi-chantier

## Résumé du problème confirmé

Le chef Philippe DURAND n'a **aucune entrée** dans `affectations_jours_chef` pour son chantier principal (CI229BALME) car :

1. La contrainte SQL `UNIQUE(macon_id, jour)` ne permet qu'**une seule affectation par jour et par personne**
2. L'Edge Function `sync-planning-to-teams` traite les chantiers dans un ordre non déterministe
3. Si le chantier **secondaire** (ROSEYRAN) est traité **après** le chantier **principal** (BALME), l'`upsert` avec `onConflict: 'macon_id,jour'` **écrase** l'entrée BALME par ROSEYRAN

## Règle métier à respecter

Pour un chef multi-chantier :
- **Chantier principal** : 5 jours avec heures par défaut (8/8/8/8/7h) + fiche + fiches_jours
- **Chantier secondaire** : 5 jours à 0h + fiche avec `total_heures = 0` (pas de fiches_jours)
- **Jamais d'écrasement** entre les deux

## Solution technique

### Modification de `sync-planning-to-teams/index.ts`

#### 1. Supprimer l'upsert du chef sur chantier secondaire (lignes 477-488)

Le bloc actuel qui crée des `affectations_jours_chef` pour le chef sur son secondaire doit être **entièrement supprimé**.

Pourquoi ? Parce que `affectations_jours_chef` est conçu pour router les **équipiers** vers un chef/chantier. Le chef lui-même n'a pas besoin d'être dans cette table pour son chantier secondaire (il y gère seulement son équipe, pas ses heures).

```
Avant (problématique):
- Chef sur secondaire → upsert affectations_jours_chef → ÉCRASE le principal

Après (corrigé):
- Chef sur secondaire → NE PAS upsert affectations_jours_chef → principal préservé
```

#### 2. Garantir l'affectation du chef sur son chantier principal

Ajouter un garde-fou **après** la boucle principale de sync :
- Pour chaque chef ayant un `chantier_principal_id`
- Forcer la création de ses 5 affectations sur le principal (upsert avec réécriture)
- Supprimer toute ligne parasite pointant vers un autre chantier

#### 3. Créer une fiche 0h (pas de fiches_jours) sur le secondaire

Le comportement actuel de suppression des fiches_jours est correct. Il faut juste s'assurer qu'on garde une fiche avec `total_heures = 0` pour que l'UI puisse afficher le chef correctement.

## Analyse d'impact sur chaque page

### Pages impactées (aucune régression)

| Page | Hook utilisé | Impact |
|------|--------------|--------|
| **Index.tsx** (Saisie chef) | `useMaconsByChantier` | ✅ Aucun impact - Le chef est chargé via le paramètre `chefId`, pas via `affectations_jours_chef` |
| **SignatureMacons.tsx** | `useMaconsByChantier`, `useAffectationsJoursByChefAndChantier` | ✅ Aucun impact - Le chef est toujours inclus en premier dans la liste |
| **ValidationConducteur.tsx** | `useFinisseursByConducteur`, `useAffectationsFinisseursJours` | ✅ Aucun impact - N'utilise pas `affectations_jours_chef` |
| **TimeEntryTable.tsx** | `isDayAuthorizedForEmployee()` | ✅ Aucun impact - Le chef est **explicitement exclu** de la vérification (ligne 292 : `if (chefId && employeeId === chefId) return true`) |
| **ChefMaconsManager.tsx** | Gestion équipe | ✅ Aucun impact - Les affectations des équipiers restent inchangées |
| **TransportDayAccordion.tsx** | `useMaconsAllChantiersByChef` | ⚠️ Impact positif - Le hook détectera correctement le multi-chantier via les affectations des équipiers, pas du chef lui-même |

### Hooks impactés (aucune régression)

| Hook | Utilisation | Impact |
|------|-------------|--------|
| `useAffectationsJoursChef` | Récupère toutes les affectations d'une semaine | ✅ Continue de fonctionner - les équipiers sont toujours présents |
| `useAffectationsJoursByChef` | Récupère les affectations par chef | ✅ Retourne les équipiers de ce chef (pas le chef lui-même) |
| `useAffectationsJoursByChefAndChantier` | Filtre par chef ET chantier | ✅ Retourne les équipiers - le chef est géré à part dans l'UI |
| `useMaconsByChantier` | Liste employés d'un chantier | ✅ Le chef est ajouté **en premier** via une requête séparée (lignes 72-163) |
| `useMaconsAllChantiersByChef` | Détecte chef multi-chantier | ⚠️ À vérifier - repose sur `chef_id` pas `macon_id` |
| `useAutoSaveFiche` | Sauvegarde des fiches | ✅ Le chef a un bypass explicite (lignes 319-335 : `isChefOnPrincipalChantier`) |

### Analyse détaillée de `useMaconsAllChantiersByChef`

Ce hook détermine si un chef est "multi-chantier" en comptant les chantiers distincts dans `affectations_jours_chef` où il est **chef_id** (pas macon_id).

```javascript
// Ligne 35-40 du hook
const { data: chefAffectations } = await supabase
  .from("affectations_jours_chef")
  .select("chantier_id")
  .eq("chef_id", chefId)  // ← Filtre par chef_id, pas macon_id
  .eq("semaine", semaine)
```

**Conclusion** : Ce hook ne sera **pas impacté** car il cherche les chantiers où le chef **gère une équipe** (via `chef_id`), pas où il est **affecté comme employé** (via `macon_id`).

Tant que les équipiers ont des affectations sur BALME et ROSEYRAN avec `chef_id = Philippe`, le hook détectera correctement le multi-chantier.

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/sync-planning-to-teams/index.ts` | Supprimer l'upsert du chef sur secondaire (lignes 477-488), ajouter garde-fou post-sync |

## Cas de test (validation post-déploiement)

### Test 1 : Affectations BDD
```sql
-- Chef Philippe doit avoir 5 entrées sur BALME (principal), 0 sur ROSEYRAN (secondaire)
SELECT macon_id, chantier_id, jour 
FROM affectations_jours_chef 
WHERE macon_id = 'PHILIPPE_ID' 
AND semaine = '2025-S07';
```
Attendu : 5 lignes toutes avec `chantier_id = CI229BALME`

### Test 2 : Fiches BDD
```sql
-- Chef Philippe doit avoir 2 fiches : 1 avec heures sur BALME, 1 à 0h sur ROSEYRAN
SELECT chantier_id, total_heures 
FROM fiches 
WHERE salarie_id = 'PHILIPPE_ID' 
AND semaine = '2025-S07';
```
Attendu :
- BALME : `total_heures > 0` (ou 39h par défaut)
- ROSEYRAN : `total_heures = 0`

### Test 3 : UI Saisie chef (Index.tsx)
- Sur BALME : saisie normale, tous les jours actifs
- Sur ROSEYRAN : ligne chef bloquée "Saisie sur votre chantier principal"

### Test 4 : UI Signature (SignatureMacons.tsx)
- Sur BALME : heures normales affichées
- Sur ROSEYRAN : badge "Chantier principal" (pas "Absent")

### Test 5 : Fiche de trajet (TransportDayAccordion.tsx)
- Le chef et les équipiers des 2 chantiers sont sélectionnables
- Les badges chantier s'affichent correctement

## Garantie anti-régression

Cette modification est **sûre** car :

1. **Le chef n'est jamais lu depuis `affectations_jours_chef` pour lui-même** dans l'UI
   - `useMaconsByChantier` : ajoute le chef via une requête séparée
   - `TimeEntryTable` : bypass explicite `if (employeeId === chefId) return true`
   - `useAutoSaveFiche` : bypass explicite pour le chantier principal

2. **Les équipiers ne sont pas impactés**
   - Leurs affectations continuent d'être créées normalement
   - Le routage vers le bon chef reste fonctionnel

3. **Le hook multi-chantier utilise `chef_id`, pas `macon_id`**
   - Il détecte le multi-chantier via les équipiers, pas via le chef lui-même

4. **Le comportement "0h sur secondaire" est déjà implémenté dans l'UI**
   - `TimeEntryTable` bloque déjà la saisie sur secondaire
   - `SignatureMacons` affiche déjà "Chantier principal" au lieu de "Absent"

## Conclusion

Cette correction est **chirurgicale** : elle supprime uniquement l'upsert problématique qui cause l'écrasement, sans modifier aucun comportement de lecture. Toutes les pages et hooks qui affichent le chef le font via des mécanismes **indépendants** de `affectations_jours_chef.macon_id`.
