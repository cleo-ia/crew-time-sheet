-- Supprimer l'ancien CRON s'il existe
SELECT cron.unschedule('sync-planning-to-teams-weekly');

-- Recréer avec force: true pour ignorer le check horaire (été/hiver)
SELECT cron.schedule(
  'sync-planning-to-teams-weekly',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
      url:='https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/sync-planning-to-teams',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
      body:='{"execution_mode": "cron", "force": true}'::jsonb
  ) as request_id;
  $$
);