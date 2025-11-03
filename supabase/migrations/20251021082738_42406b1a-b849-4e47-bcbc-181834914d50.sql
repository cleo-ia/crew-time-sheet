-- Créer le cron job pour les lundis à 8h Paris
-- Le cron tourne toutes les heures le lundi (0 * * * 1)
-- L'edge function filtre pour n'agir qu'à 8h Paris (gestion auto DST)
SELECT cron.schedule(
  'rappel-chefs-lundi-8h-paris',
  '0 * * * 1',
  $$
  SELECT
    net.http_post(
      url:='https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-chefs-lundi',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);