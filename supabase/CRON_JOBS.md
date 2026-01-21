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
- **Fréquence** : Vendredi à 12h Paris
- **Cron heure d'hiver (UTC+1)** : `0 11 * * 5` (11h UTC)
- **Cron heure d'été (UTC+2)** : `0 10 * * 5` (10h UTC)
- **Edge Function** : `rappel-chefs`
- **Description** : Envoie un rappel aux chefs d'équipe qui ont des fiches non finalisées (statuts `BROUILLON` ou `EN_SIGNATURE`) pour la semaine en cours

### 3. **rappel-chefs-lundi** - Rappel hebdomadaire lundi matin
- **Fréquence** : Lundi à 8h Paris
- **Cron** : `0 * * * 1` (Toutes les heures le lundi, la fonction vérifie si c'est 8h Paris)
- **Edge Function** : `rappel-chefs-lundi`
- **Description** : Envoie un rappel aux chefs d'équipe pour les fiches de S-1 non finalisées (statuts `BROUILLON` ou `EN_SIGNATURE`)

### 4. **rappel-conducteurs** - Rappel hebdomadaire aux conducteurs
- **Fréquence** : Vendredi à 12h Paris
- **Cron** : `0 * * * 5` (Toutes les heures le vendredi, la fonction vérifie si c'est 12h Paris)
- **Edge Function** : `rappel-conducteurs`
- **Description** : Envoie un rappel hebdomadaire aux conducteurs qui ont des fiches en attente de validation (statut `VALIDE_CHEF`)

### 5. **rappel-conducteurs-finisseurs** - Rappel hebdomadaire aux conducteurs pour finisseurs
- **Fréquence** : Vendredi à 12h Paris
- **Cron** : `0 * * * 5` (Toutes les heures le vendredi, la fonction vérifie si c'est 12h Paris)
- **Edge Function** : `rappel-conducteurs-finisseurs`
- **Description** : Envoie un rappel aux conducteurs pour valider/exporter les heures de leurs finisseurs (statuts `BROUILLON` ou `EN_SIGNATURE`)

### 6. **sync-planning-to-teams-weekly** - Synchronisation Planning → Équipes
- **Fréquence** : Lundi à 5h Paris
- **Cron** : `0 4 * * 1` (4h UTC = 5h Paris heure d'hiver)
- **Edge Function** : `sync-planning-to-teams`
- **Description** : Synchronise automatiquement le planning de la semaine vers les équipes (affectations_jours_chef / affectations_finisseurs_jours). Compare avec S-1 : si affectation identique, copie les heures ; sinon crée avec heures par défaut (39h). Protège les fiches avec heures déjà saisies.

**Configuration SQL à exécuter dans le SQL Editor Supabase :**
```sql
SELECT cron.schedule(
  'sync-planning-to-teams-weekly',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
    url:='https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/sync-planning-to-teams',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
    body:='{"execution_mode": "cron"}'::jsonb
  ) as request_id;
  $$
);
```

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
