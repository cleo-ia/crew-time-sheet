-- Désactiver RLS sur vehicules pour les tests
alter table public.vehicules disable row level security;

-- Supprimer la policy existante
drop policy if exists "Enable all access for development" on public.vehicules;