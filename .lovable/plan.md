
# Plan : Purge complète SDER et test chantier sans chef

## État actuel des données SDER

| Table | Lignes |
|-------|--------|
| planning_affectations | 37 |
| affectations_jours_chef | 37 |
| fiches | 26 |
| fiches_jours | 122 |
| signatures | 18 |
| fiches_transport | 4 |
| fiches_transport_jours | 40 |
| planning_validations | 1 |
| **Total** | **285** |

Toutes ces données sont sur la semaine **S05**.

## Étape 1 : Purger S05 pour SDER

La fonction `purge-week` existe mais purge toutes les entreprises. Je vais créer une nouvelle fonction `purge-entreprise-complete` qui :

1. Accepte un `entreprise_id` en paramètre
2. Supprime TOUTES les données liées à cette entreprise (pas seulement une semaine)
3. Préserve les utilisateurs, véhicules et chantiers (configuration)

### Tables purgées (ordre FK respecté)

```text
1. fiches_transport_jours
2. fiches_transport
3. fiches_transport_finisseurs_jours
4. fiches_transport_finisseurs
5. signatures
6. fiches_jours
7. fiches
8. affectations_finisseurs_jours
9. affectations_jours_chef
10. affectations
11. planning_affectations
12. planning_validations
```

### Tables préservées (configuration)

- `utilisateurs` (les employés SDER)
- `vehicules` (les véhicules SDER)
- `chantiers` (CI230 et CI235)

## Étape 2 : Préparer le test "chantier sans chef"

Après la purge, je modifierai le chantier **CI235 (LES ARCS)** pour retirer son chef :

| Avant | Après |
|-------|-------|
| chef_id = Chloé | chef_id = NULL |
| conducteur_id = Chloé | conducteur_id = Chloé |

Ainsi :
- **CI230** = chantier classique (chef Liam + conducteur Liam)
- **CI235** = chantier sans chef (conducteur Chloé uniquement)

## Étape 3 : Nouveau workflow à tester

```text
1. Planning S+1 (Conducteur)
   └─ Affecter des employés à CI230 et CI235
   └─ Valider le planning

2. Synchronisation automatique
   └─ Pour CI230 : affectations_jours_chef créées (chef Liam)
   └─ Pour CI235 : affectations_jours_chef créées... par qui ?

3. Saisie hebdo (Chef ou Conducteur ?)
   └─ CI230 : Liam saisit les heures
   └─ CI235 : Chloé (conducteur) doit pouvoir saisir

4. Transmission → RH
   └─ Vérifier que les deux flux fonctionnent
```

## Fichiers à créer/modifier

| Action | Fichier |
|--------|---------|
| Créer | `supabase/functions/purge-entreprise-complete/index.ts` |
| Modifier | `src/components/admin/DashboardManager.tsx` (bouton purge admin) |

## Résultat attendu

- Base SDER vierge (0 fiches, 0 planning, 0 signatures)
- CI235 configuré sans chef pour tester le flux conducteur
- Possibilité de reprendre le workflow depuis le Planning S+1
