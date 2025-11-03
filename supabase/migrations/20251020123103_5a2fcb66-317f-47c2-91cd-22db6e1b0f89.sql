-- Créer la table rappels_historique pour l'historique des exécutions
CREATE TABLE public.rappels_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('rappel_chefs', 'rappel_conducteurs')),
  executed_at timestamptz NOT NULL DEFAULT now(),
  execution_mode text NOT NULL CHECK (execution_mode IN ('cron', 'manual')),
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nb_destinataires integer NOT NULL DEFAULT 0,
  nb_succes integer NOT NULL DEFAULT 0,
  nb_echecs integer NOT NULL DEFAULT 0,
  details jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_rappels_historique_type ON public.rappels_historique(type);
CREATE INDEX idx_rappels_historique_executed_at ON public.rappels_historique(executed_at DESC);

-- RLS
ALTER TABLE public.rappels_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rappels_historique"
  ON public.rappels_historique
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Modifier les CRONs pour exécution toutes les heures
-- Supprimer les anciens CRONs spécifiques
SELECT cron.unschedule('rappel-chefs-vendredi-17h');
SELECT cron.unschedule('rappel-conducteurs-mercredi-14h');

-- Créer les nouveaux CRONs horaires avec vérification de l'heure Paris dans les fonctions
SELECT cron.schedule(
  'rappel-chefs-paris-auto',
  '0 * * * 5',
  $$
  SELECT net.http_post(
    url:='https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-chefs',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'rappel-conducteurs-paris-auto',
  '0 * * * 3',
  $$
  SELECT net.http_post(
    url:='https://rxkhtqezcyaqvjlbzzpu.supabase.co/functions/v1/rappel-conducteurs',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4a2h0cWV6Y3lhcXZqbGJ6enB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzY0MzYsImV4cCI6MjA3NTkxMjQzNn0.FKTd_iSQHWaiQDIEuX9fD-tt7cdzyhAeWmIjC6v8v-M"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);