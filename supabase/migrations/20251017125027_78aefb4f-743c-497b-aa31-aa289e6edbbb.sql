-- Phase 1: Correction des alertes de sécurité RLS
-- Activer RLS sur toutes les tables publiques existantes

-- Tables métiers
ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_jours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_transport_jours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodes_cloturees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies temporaires permissives (à durcir en Phase 3)
DROP POLICY IF EXISTS "Temporary: allow all access to chantiers" ON public.chantiers;
CREATE POLICY "Temporary: allow all access to chantiers"
  ON public.chantiers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to fiches" ON public.fiches;
CREATE POLICY "Temporary: allow all access to fiches"
  ON public.fiches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to fiches_jours" ON public.fiches_jours;
CREATE POLICY "Temporary: allow all access to fiches_jours"
  ON public.fiches_jours FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to signatures" ON public.signatures;
CREATE POLICY "Temporary: allow all access to signatures"
  ON public.signatures FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to utilisateurs" ON public.utilisateurs;
CREATE POLICY "Temporary: allow all access to utilisateurs"
  ON public.utilisateurs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to vehicules" ON public.vehicules;
CREATE POLICY "Temporary: allow all access to vehicules"
  ON public.vehicules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to user_roles" ON public.user_roles;
CREATE POLICY "Temporary: allow all access to user_roles"
  ON public.user_roles FOR ALL USING (true) WITH CHECK (true);