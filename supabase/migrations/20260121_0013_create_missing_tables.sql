-- Create battles table if it doesn't exist
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  dj_id text not null,
  title text not null,
  category text not null,
  country text,
  is_live boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battles_category_check check (category in ('amapiano', 'dj', 'rnb', 'others'))
);

create index if not exists battles_dj_id_created_at_idx on public.battles (dj_id, created_at desc);
create index if not exists battles_is_live_started_at_idx on public.battles (is_live, started_at desc);
alter table public.battles enable row level security;

-- Create battle_invites table if it doesn't exist
create table if not exists public.battle_invites (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  from_artist_uid text not null,
  to_artist_uid text not null,
  from_artist_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint battle_invites_status_check check (status in ('pending', 'accepted', 'declined', 'expired'))
);

create index if not exists battle_invites_to_artist_uid_idx on public.battle_invites (to_artist_uid);
create index if not exists battle_invites_battle_id_idx on public.battle_invites (battle_id);
alter table public.battle_invites enable row level security;

-- Create live_invites table if it doesn't exist
create table if not exists public.live_invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  from_artist_uid text not null,
  to_artist_uid text not null,
  from_artist_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint live_invites_status_check check (status in ('pending', 'accepted', 'declined', 'expired'))
);

create index if not exists live_invites_to_artist_uid_idx on public.live_invites (to_artist_uid);
create index if not exists live_invites_session_id_idx on public.live_invites (session_id);
alter table public.live_invites enable row level security;
