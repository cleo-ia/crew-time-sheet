-- ============================================================================
-- MIGRATION: Optimisation des cron jobs automatiques
-- Date: 2025-01-20
-- Description: Configuration précise des horaires d'exécution pour réduire
--              les exécutions inutiles et améliorer les performances
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Suppression des anciens cron jobs inefficaces
-- ============================================================================

-- Supprimer le cron qui s'exécute chaque minute (1440 fois/jour)
SELECT cron.unschedule('notify-conducteur-every-minute');

-- Supprimer le cron qui s'exécute toutes les heures le vendredi (24 fois)
SELECT cron.unschedule('rappel-chefs-paris-auto');

-- Supprimer le cron qui s'exécute toutes les heures le mercredi (24 fois)
SELECT cron.unschedule('rappel-conducteurs-paris-auto');

-- ============================================================================
-- ÉTAPE 2: Création des nouveaux cron jobs optimisés
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. notify-conducteur: Toutes les heures (au lieu de chaque minute)
-- ----------------------------------------------------------------------------
-- Réduit de 1440 à 24 exécutions par jour
SELECT cron.schedule(
  'notify-conducteur-every-hour',
  '0 * * * *',  -- Toutes les heures à :00
  $$
  SELECT net.http_post(
    url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/notify-conducteur',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ----------------------------------------------------------------------------
-- B. rappel-chefs: Vendredi à 17h Paris (1 seule exécution par semaine)
-- ----------------------------------------------------------------------------
-- CONFIGURATION ACTUELLE: Heure d'hiver (CET = UTC+1)
-- 17h Paris = 16h UTC
--
-- ⚠️ IMPORTANT - Changements d'heure à effectuer:
-- • Passage heure d'été (dernier dimanche mars): changer '0 16 * * 5' → '0 15 * * 5'
-- • Passage heure d'hiver (dernier dimanche octobre): changer '0 15 * * 5' → '0 16 * * 5'
--
-- Dates clés 2025:
-- • 30 mars 2025: passage à l'heure d'été (UTC+2) → ajuster à 15h UTC
-- • 26 octobre 2025: passage à l'heure d'hiver (UTC+1) → ajuster à 16h UTC
SELECT cron.schedule(
  'rappel-chefs-vendredi-17h-paris',
  '0 16 * * 5',  -- Vendredi à 16h UTC = 17h Paris (heure d'hiver)
  $$
  SELECT net.http_post(
    url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-chefs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
    ),
    body := jsonb_build_object('force', true)
  );
  $$
);

-- ----------------------------------------------------------------------------
-- C. rappel-conducteurs: Tous les jours à 14h Paris (7 exécutions par semaine)
-- ----------------------------------------------------------------------------
-- CONFIGURATION ACTUELLE: Heure d'hiver (CET = UTC+1)
-- 14h Paris = 13h UTC
--
-- ⚠️ IMPORTANT - Changements d'heure à effectuer:
-- • Passage heure d'été (dernier dimanche mars): changer '0 13 * * *' → '0 12 * * *'
-- • Passage heure d'hiver (dernier dimanche octobre): changer '0 12 * * *' → '0 13 * * *'
--
-- Dates clés 2025:
-- • 30 mars 2025: passage à l'heure d'été (UTC+2) → ajuster à 12h UTC
-- • 26 octobre 2025: passage à l'heure d'hiver (UTC+1) → ajuster à 13h UTC
SELECT cron.schedule(
  'rappel-conducteurs-quotidien-14h-paris',
  '0 13 * * *',  -- Tous les jours à 13h UTC = 14h Paris (heure d'hiver)
  $$
  SELECT net.http_post(
    url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
    ),
    body := jsonb_build_object('force', true)
  );
  $$
);

-- ============================================================================
-- RÉSULTATS ATTENDUS
-- ============================================================================
-- 
-- AVANT cette migration:
-- • notify-conducteur: 1440 exécutions/jour (chaque minute)
-- • rappel-chefs: 24 exécutions le vendredi (toutes les heures)
-- • rappel-conducteurs: 24 exécutions le mercredi (toutes les heures)
-- TOTAL: ~1512 exécutions/semaine
--
-- APRÈS cette migration:
-- • notify-conducteur: 24 exécutions/jour (chaque heure)
-- • rappel-chefs: 1 exécution le vendredi (à 17h Paris précise)
-- • rappel-conducteurs: 7 exécutions/semaine (chaque jour à 14h Paris)
-- TOTAL: ~176 exécutions/semaine
--
-- RÉDUCTION: 88% des exécutions inutiles
--
-- ============================================================================
-- PROCÉDURE DE CHANGEMENT D'HEURE (à exécuter 2 fois par an)
-- ============================================================================
--
-- === PASSAGE À L'HEURE D'ÉTÉ (dernier dimanche de mars) ===
-- À exécuter le dimanche matin du changement d'heure:
--
-- SELECT cron.unschedule('rappel-chefs-vendredi-17h-paris');
-- SELECT cron.schedule(
--   'rappel-chefs-vendredi-17h-paris',
--   '0 15 * * 5',  -- 15h UTC = 17h Paris (été)
--   $$
--   SELECT net.http_post(
--     url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-chefs',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
--     ),
--     body := jsonb_build_object('force', true)
--   );
--   $$
-- );
--
-- SELECT cron.unschedule('rappel-conducteurs-quotidien-14h-paris');
-- SELECT cron.schedule(
--   'rappel-conducteurs-quotidien-14h-paris',
--   '0 12 * * *',  -- 12h UTC = 14h Paris (été)
--   $$
--   SELECT net.http_post(
--     url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
--     ),
--     body := jsonb_build_object('force', true)
--   );
--   $$
-- );
--
-- === PASSAGE À L'HEURE D'HIVER (dernier dimanche d'octobre) ===
-- À exécuter le dimanche matin du changement d'heure:
--
-- SELECT cron.unschedule('rappel-chefs-vendredi-17h-paris');
-- SELECT cron.schedule(
--   'rappel-chefs-vendredi-17h-paris',
--   '0 16 * * 5',  -- 16h UTC = 17h Paris (hiver)
--   $$
--   SELECT net.http_post(
--     url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-chefs',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
--     ),
--     body := jsonb_build_object('force', true)
--   );
--   $$
-- );
--
-- SELECT cron.unschedule('rappel-conducteurs-quotidien-14h-paris');
-- SELECT cron.schedule(
--   'rappel-conducteurs-quotidien-14h-paris',
--   '0 13 * * *',  -- 13h UTC = 14h Paris (hiver)
--   $$
--   SELECT net.http_post(
--     url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
--     ),
--     body := jsonb_build_object('force', true)
--   );
--   $$
-- );
--
-- ============================================================================