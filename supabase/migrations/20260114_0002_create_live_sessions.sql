-- Creates live sessions table for scheduling/live history.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),

  -- Firebase artist UID
  artist_uid text not null,

  -- scheduled | live | ended | cancelled
  status text not null default 'scheduled',

  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,

  event_url text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint live_sessions_status_check check (status in ('scheduled', 'live', 'ended', 'cancelled'))
);

create index if not exists live_sessions_artist_uid_idx on public.live_sessions (artist_uid);
create index if not exists live_sessions_starts_at_idx on public.live_sessions (starts_at desc);
create index if not exists live_sessions_artist_uid_starts_at_idx on public.live_sessions (artist_uid, starts_at desc);

alter table public.live_sessions enable row level security;
