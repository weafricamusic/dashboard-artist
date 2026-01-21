-- Safe to run multiple times.
-- Uploads table for processing pipeline (songs + videos).

create extension if not exists pgcrypto;

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  artist_uid text not null,
  type text not null,
  title text,
  original_path text not null,
  processed_path text,
  status text not null default 'processing',
  rejection_reason text,
  error_message text,
  duration_seconds numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uploads_type_check check (type in ('song', 'video')),
  constraint uploads_status_check check (status in ('processing', 'published', 'rejected'))
);

create index if not exists uploads_artist_uid_created_at_idx on public.uploads (artist_uid, created_at desc);
create index if not exists uploads_status_created_at_idx on public.uploads (status, created_at asc);

alter table public.uploads enable row level security;
