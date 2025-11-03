-- Créer les jobs CRON pour les rappels automatiques

-- 1. Rappel aux chefs tous les vendredis à 17h
SELECT cron.schedule(
  'rappel-chefs-vendredi-17h',
  '0 17 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-chefs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Rappel aux conducteurs tous les mercredis à 14h
SELECT cron.schedule(
  'rappel-conducteurs-mercredi-14h',
  '0 14 * * 3',
  $$
  SELECT net.http_post(
    url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M'
    ),
    body := '{}'::jsonb
  );
  $$
);