-- Créer le cron pour rappel-conducteurs-finisseurs (vendredi 17h)
SELECT cron.schedule(
  'rappel-conducteurs-finisseurs-vendredi-17h',
  '0 * * * 5',  -- Toutes les heures le vendredi
  $$
  SELECT net.http_post(
    url := 'https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs-finisseurs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
    body := '{"execution_mode": "cron"}'::jsonb
  ) as request_id;
  $$
);