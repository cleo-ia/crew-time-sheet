-- Activer RLS sur affectations_backup
ALTER TABLE public.affectations_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Temporary: allow all access to affectations_backup" ON public.affectations_backup;
CREATE POLICY "Temporary: allow all access to affectations_backup"
  ON public.affectations_backup FOR ALL USING (true) WITH CHECK (true);