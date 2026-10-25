-- ============================================================
-- pixel-village2 — personnage de jeu (1 par utilisateur)
-- Supabase → SQL Editor → New query → coller → Run
-- Facultatif : sans cette table le jeu fonctionne, mais chaque
-- joueur entre en invité (nom et progression locaux au navigateur).
-- ============================================================

create table if not exists public.characters (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  class text not null default 'paysan',
  level int not null default 1 check (level >= 1),
  x int not null default 0,
  y int not null default 0,
  coins int not null default 0 check (coins >= 0),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_updated_at_idx
  on public.characters (updated_at desc);

create or replace function public.touch_characters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_touch_updated_at on public.characters;
create trigger characters_touch_updated_at
  before update on public.characters
  for each row execute function public.touch_characters_updated_at();

alter table public.characters enable row level security;

-- Le serveur de jeu utilise la clé service_role (elle contourne la RLS).
-- Ces policies servent au client Supabase qui lit son propre perso.
drop policy if exists "perso lisible par son propriétaire" on public.characters;
create policy "perso lisible par son propriétaire"
  on public.characters for select
  using (auth.uid() = id);

drop policy if exists "création/mise à jour du perso soi-même" on public.characters;
create policy "création/mise à jour du perso soi-même"
  on public.characters for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
