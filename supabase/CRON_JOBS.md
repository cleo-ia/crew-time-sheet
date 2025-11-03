# Configuration des Cron Jobs

## Vue d'ensemble

Ce document décrit la configuration des tâches planifiées (cron jobs) pour le système de rappels automatiques.

## Cron Jobs configurés

### 1. **notify-conducteur** - Vérification horaire des lots prêts
- **Fréquence** : Toutes les heures à la minute :00
- **Cron** : `0 * * * *`
- **Edge Function** : `notify-conducteur`
- **Description** : Vérifie toutes les heures s'il y a des lots de fiches prêts à être notifiés aux conducteurs

### 2. **rappel-chefs** - Rappel hebdomadaire aux chefs d'équipe
- **Fréquence** : Vendredi à 17h Paris
- **Cron heure d'hiver (UTC+1)** : `0 16 * * 5` (16h UTC)
- **Cron heure d'été (UTC+2)** : `0 15 * * 5` (15h UTC)
- **Edge Function** : `rappel-chefs`
- **Description** : Envoie un rappel aux chefs d'équipe qui ont des fiches non finalisées pour la semaine en cours

### 3. **rappel-conducteurs** - Rappel hebdomadaire aux conducteurs
- **Fréquence** : Vendredi à 17h Paris
- **Cron** : `0 * * * 5` (Toutes les heures le vendredi, la fonction vérifie si c'est 17h Paris)
- **Edge Function** : `rappel-conducteurs`
- **Description** : Envoie un rappel hebdomadaire aux conducteurs qui ont des fiches en attente de validation (statut `VALIDE_CHEF`)

### 4. **rappel-conducteurs-finisseurs** - Rappel hebdomadaire aux conducteurs pour finisseurs
- **Fréquence** : Vendredi à 17h Paris
- **Cron** : `0 * * * 5` (Toutes les heures le vendredi, la fonction vérifie si c'est 17h Paris)
- **Edge Function** : `rappel-conducteurs-finisseurs`
- **Description** : Envoie un rappel aux conducteurs pour valider/exporter les heures de leurs finisseurs (statut `BROUILLON` ou `EN_SIGNATURE`)

## Changements d'heure saisonniers

✅ **AUTOMATIQUE** : Les edge functions `rappel-chefs` et `rappel-conducteurs` gèrent automatiquement les changements d'heure été/hiver via le module `_shared/timezone.ts`.

Aucune action manuelle nécessaire lors des passages heure d'été/hiver !

## Vérification des crons configurés

Pour lister tous les crons configurés :

```sql
SELECT jobname, schedule, command 
FROM cron.job 
ORDER BY jobname;
```

## Tests manuels

Les edge functions peuvent toujours être testées manuellement via l'interface admin (`/admin` → onglet "Rappels") sans attendre l'exécution automatique des crons.

## Historique des exécutions

Toutes les exécutions (automatiques et manuelles) sont enregistrées dans la table `rappels_historique` pour traçabilité et monitoring.

## Bénéfices de l'optimisation

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| `notify-conducteur` | 1440/jour | 24/jour | -98% |
| `rappel-chefs` | 24/vendredi | 1/vendredi | -96% |
| `rappel-conducteurs` | 24/jour | 1/vendredi | -96% |
| **Total hebdomadaire** | ~10 200 | ~193 | **-98%** |

## Support

Pour toute question ou problème avec les crons, consulter les logs dans :
- Supabase Dashboard → Functions → [nom de la fonction] → Logs
- Table `rappels_historique` pour l'historique des exécutions
