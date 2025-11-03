-- Activer les extensions nécessaires pour les tâches planifiées
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer le job CRON pour appeler notify-conducteur toutes les minutes
SELECT cron.schedule(
  'notify-conducteur-every-minute',
  '* * * * *',
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