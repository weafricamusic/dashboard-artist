-- Creates battles table for Live Battles.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),

  -- Firebase artist UID (DJ/artist)
  dj_id text not null,

  title text not null,

  -- amapiano | dj | rnb | others
  category text not null,

  -- Optional metadata
  country text,

  -- Live state
  is_live boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint battles_category_check check (category in ('amapiano', 'dj', 'rnb', 'others'))
);

create index if not exists battles_dj_id_created_at_idx on public.battles (dj_id, created_at desc);
create index if not exists battles_is_live_started_at_idx on public.battles (is_live, started_at desc);

-- Recommended: keep RLS enabled by default. This dashboard uses the Supabase service role
-- key server-side (bypasses RLS), so policies are optional here.
alter table public.battles enable row level security;
