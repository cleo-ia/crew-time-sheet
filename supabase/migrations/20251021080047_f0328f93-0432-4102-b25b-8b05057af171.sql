-- Supprimer l'ancien cron job qui tourne tous les jours
SELECT cron.unschedule('rappel-conducteurs-quotidien-14h-paris');

-- Créer le nouveau cron job pour les vendredis à 17h Paris
-- Le cron tourne toutes les heures le vendredi (0 * * * 5)
-- L'edge function filtre pour n'agir qu'à 17h Paris (gestion auto DST)
SELECT cron.schedule(
  'rappel-conducteurs-vendredi-17h-paris',
  '0 * * * 5',
  $$
  SELECT
    net.http_post(
      url:='https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);