-- Table des véhicules
create table public.vehicules (
  id uuid primary key default gen_random_uuid(),
  immatriculation text not null unique,
  actif boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Index pour recherche rapide
create index idx_vehicules_actif on public.vehicules(actif);
create index idx_vehicules_immatriculation on public.vehicules(immatriculation);

-- RLS
alter table public.vehicules enable row level security;

create policy "Enable all access for development"
on public.vehicules
for all
to authenticated
using (true)
with check (true);

-- Trigger updated_at
create trigger update_vehicules_updated_at
  before update on public.vehicules
  for each row
  execute function public.update_updated_at_column();