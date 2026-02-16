-- Stores AI-generated outputs for artists (captions, hashtags, recommendations, etc.)
-- This table is written by the dashboard using the Supabase service role key.

create extension if not exists "pgcrypto";

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  artist_uid text not null,
  kind text not null,
  input jsonb not null default '{}'::jsonb,
  output text not null,
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists ai_outputs_artist_uid_created_at_idx
  on public.ai_outputs (artist_uid, created_at desc);
