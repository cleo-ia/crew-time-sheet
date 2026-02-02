
# Plan : Supprimer l'ancienne contrainte d'unicité

## Diagnostic

La table `planning_affectations` possède actuellement **deux contraintes UNIQUE** :

| Contrainte | Définition | Statut |
|------------|------------|--------|
| `unique_employe_jour_entreprise` | UNIQUE (employe_id, jour, entreprise_id) | ❌ **À SUPPRIMER** - bloque les chefs multi-chantiers |
| `planning_affectations_unique_per_chantier` | UNIQUE (employe_id, jour, chantier_id, entreprise_id) | ✅ Correcte |

## Problème

La migration précédente a tenté de supprimer `planning_affectations_employe_id_jour_entreprise_id_key` mais la vraie contrainte s'appelle `unique_employe_jour_entreprise`.

## Solution

Exécuter une nouvelle migration pour supprimer la contrainte `unique_employe_jour_entreprise`.

## Migration SQL à exécuter

```sql
-- Supprimer l'ancienne contrainte qui bloque les chefs multi-chantiers
ALTER TABLE planning_affectations 
DROP CONSTRAINT IF EXISTS unique_employe_jour_entreprise;
```

## Résultat attendu

Après cette migration :
- FAY Philippe pourra être sur CI229BALME ET CI230ROSEYRAN simultanément
- Les maçons/finisseurs/grutiers seront toujours bloqués par l'UI (contrôle applicatif)
- La contrainte `planning_affectations_unique_per_chantier` empêchera les doublons (même employé, même jour, même chantier)
