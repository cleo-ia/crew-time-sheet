-- ========================================
-- Table: user_activity_logs
-- Journal des activités utilisateur
-- ========================================
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'page_view', 'login', 'logout', 'session_heartbeat'
  page_path TEXT,
  page_name TEXT,
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_entreprise_id ON public.user_activity_logs(entreprise_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_event_type ON public.user_activity_logs(event_type);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view logs of their enterprise
CREATE POLICY "Admins can view activity logs of their enterprise"
ON public.user_activity_logs
FOR SELECT
USING (
  user_has_access_to_entreprise(entreprise_id)
  AND has_role(auth.uid(), 'admin')
);

-- Policy: Any authenticated user can insert their own activity logs
CREATE POLICY "Users can insert their own activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND user_has_access_to_entreprise(entreprise_id)
);

-- ========================================
-- Table: user_sessions
-- Suivi des sessions utilisateur
-- ========================================
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  pages_visited INTEGER DEFAULT 0,
  device_type TEXT, -- 'desktop', 'tablet', 'mobile'
  browser TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_entreprise_id ON public.user_sessions(entreprise_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at DESC);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view sessions of their enterprise
CREATE POLICY "Admins can view sessions of their enterprise"
ON public.user_sessions
FOR SELECT
USING (
  user_has_access_to_entreprise(entreprise_id)
  AND has_role(auth.uid(), 'admin')
);

-- Policy: Any authenticated user can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND user_has_access_to_entreprise(entreprise_id)
);

-- Policy: Users can update their own sessions (for ending session)
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());