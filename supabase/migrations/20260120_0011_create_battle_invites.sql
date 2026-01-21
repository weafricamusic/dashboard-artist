-- Battle invites + scheduled battle matches (artist vs artist)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.battle_invites (
  id uuid primary key default gen_random_uuid(),

  from_artist_uid text not null,
  to_artist_uid text not null,

  title text not null,
  category text not null,

  message text,

  proposed_starts_at timestamptz,
  duration_minutes integer,

  -- Optional stake (coins). Default 0 (free).
  stake_coins integer not null default 0,

  expires_at timestamptz,

  status text not null default 'sent',
  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint battle_invites_category_check check (category in ('amapiano', 'dj', 'rnb', 'others')),
  constraint battle_invites_status_check check (status in ('sent', 'accepted', 'declined', 'cancelled', 'expired')),
  constraint battle_invites_duration_minutes_check check (duration_minutes is null or duration_minutes > 0),
  constraint battle_invites_stake_coins_check check (stake_coins >= 0),
  constraint battle_invites_not_self_check check (from_artist_uid <> to_artist_uid)
);

create index if not exists battle_invites_to_status_created_at_idx
  on public.battle_invites (to_artist_uid, status, created_at desc);

create index if not exists battle_invites_from_status_created_at_idx
  on public.battle_invites (from_artist_uid, status, created_at desc);

alter table public.battle_invites enable row level security;

create table if not exists public.battle_matches (
  id uuid primary key default gen_random_uuid(),

  invite_id uuid unique,

  host_artist_uid text not null,
  guest_artist_uid text not null,

  title text not null,
  category text not null,

  status text not null default 'scheduled',

  scheduled_starts_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,

  stake_coins integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint battle_matches_invite_id_fkey foreign key (invite_id) references public.battle_invites(id) on delete set null,
  constraint battle_matches_category_check check (category in ('amapiano', 'dj', 'rnb', 'others')),
  constraint battle_matches_status_check check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  constraint battle_matches_stake_coins_check check (stake_coins >= 0),
  constraint battle_matches_not_self_check check (host_artist_uid <> guest_artist_uid)
);

create index if not exists battle_matches_host_created_at_idx
  on public.battle_matches (host_artist_uid, created_at desc);

create index if not exists battle_matches_guest_created_at_idx
  on public.battle_matches (guest_artist_uid, created_at desc);

alter table public.battle_matches enable row level security;

create table if not exists public.battle_invite_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null,
  actor_uid text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint battle_invite_events_invite_id_fkey foreign key (invite_id) references public.battle_invites(id) on delete cascade,
  constraint battle_invite_events_action_check check (action in ('sent', 'accepted', 'declined', 'cancelled', 'expired'))
);

create index if not exists battle_invite_events_invite_id_created_at_idx
  on public.battle_invite_events (invite_id, created_at asc);

alter table public.battle_invite_events enable row level security;
