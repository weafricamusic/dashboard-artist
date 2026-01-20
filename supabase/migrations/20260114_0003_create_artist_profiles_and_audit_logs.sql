-- Artist profiles and audit logs (admin-managed flags + artist-editable public identity)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.artist_profiles (
  artist_uid text primary key,

  -- Editable by artist
  name text not null default '',
  stage_name text not null default '',
  bio text not null default '',
  genres text[] not null default array[]::text[],
  country text not null default '',
  profile_photo_url text,
  socials jsonb not null default '{}'::jsonb,

  -- Admin-managed
  verification_badge boolean not null default false,
  featured boolean not null default false,
  show_on_homepage boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_audit_logs (
  id uuid primary key default gen_random_uuid(),
  artist_uid text not null,
  actor_uid text not null,
  action text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint profile_audit_logs_action_check check (action in ('artist_update')),
  constraint profile_audit_logs_artist_uid_fkey foreign key (artist_uid) references public.artist_profiles(artist_uid) on delete cascade
);

create index if not exists profile_audit_logs_artist_uid_created_at_idx
  on public.profile_audit_logs (artist_uid, created_at desc);

alter table public.artist_profiles enable row level security;
alter table public.profile_audit_logs enable row level security;
