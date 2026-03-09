ALTER TABLE public.fiches_modifications
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS page_source text;

CREATE INDEX IF NOT EXISTS idx_fiches_modifications_user_role
  ON public.fiches_modifications (user_role)
  WHERE user_role IS NOT NULL;