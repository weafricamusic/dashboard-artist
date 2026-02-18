-- Subscriptions + artist subscription status
-- Admin defines subscription plans/features.
-- Artist dashboard reads current subscription and unlocks/locks features accordingly.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  -- free | premium | platinum
  code text not null,
  name text not null,

  -- Feature flags/limits used by the dashboard to gate UI + actions.
  -- Example:
  -- {"upload":{"songs":true,"videos":true},"limits":{"maxSongs":50}}
  features jsonb not null default '{}'::jsonb,

  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_code_unique unique (code)
);

-- If the table already existed from an earlier iteration, it may be missing newer columns.
-- `create table if not exists` does not backfill schema changes, so we ensure required columns exist.
alter table if exists public.subscriptions
  add column if not exists code text;

alter table if exists public.subscriptions
  add column if not exists name text;

alter table if exists public.subscriptions
  add column if not exists features jsonb not null default '{}'::jsonb;

alter table if exists public.subscriptions
  add column if not exists sort_order int not null default 0;

alter table if exists public.subscriptions
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.subscriptions
  add column if not exists updated_at timestamptz not null default now();

-- Best-effort backfill for older schemas that used different column names.
-- This block is safe to re-run.
do $$
begin
  -- If an older schema used plan_code, copy it into code where missing.
  begin
    execute 'update public.subscriptions set code = plan_code where code is null';
  exception when undefined_column then
    null;
  end;

  -- If an older schema used plan_name, copy it into name where missing.
  begin
    execute 'update public.subscriptions set name = plan_name where name is null';
  exception when undefined_column then
    null;
  end;

  -- If code is still missing but name exists, infer code from name.
  update public.subscriptions
  set code = case
    when lower(name) like '%platinum%' then 'platinum'
    when lower(name) like '%premium%' then 'premium'
    when lower(name) like '%free%' then 'free'
    else code
  end
  where code is null and name is not null;
end $$;

create index if not exists subscriptions_sort_order_idx
  on public.subscriptions (sort_order asc, created_at desc);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),

  -- Firebase artist UID
  artist_uid text not null,

  -- Points to the plan definition
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,

  -- active | cancelled | expired
  status text not null default 'active',

  -- End of paid period (null allowed for manual/indefinite comps)
  expires_at timestamptz null,

  -- Optional provider metadata for payment integrations
  provider text null,
  provider_subscription_id text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_subscriptions_status_check check (status in ('active','cancelled','expired'))
);

-- If the table already existed from an earlier iteration, it may be missing newer columns.
-- Ensure required columns exist before creating indexes.
alter table if exists public.user_subscriptions
  add column if not exists artist_uid text;

alter table if exists public.user_subscriptions
  add column if not exists subscription_id uuid;

alter table if exists public.user_subscriptions
  add column if not exists status text not null default 'active';

alter table if exists public.user_subscriptions
  add column if not exists expires_at timestamptz null;

alter table if exists public.user_subscriptions
  add column if not exists provider text null;

alter table if exists public.user_subscriptions
  add column if not exists provider_subscription_id text null;

alter table if exists public.user_subscriptions
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.user_subscriptions
  add column if not exists updated_at timestamptz not null default now();

-- Best-effort backfill for older schemas that used different column names.
-- This block is safe to re-run.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_subscriptions'
      and column_name = 'artist_uid'
  ) then
    -- If an older schema used artist_id, copy it into artist_uid where missing.
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_subscriptions'
        and column_name = 'artist_id'
    ) then
      execute 'update public.user_subscriptions set artist_uid = artist_id where artist_uid is null';
    end if;

    -- If an older schema used user_id, copy it into artist_uid where missing.
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_subscriptions'
        and column_name = 'user_id'
    ) then
      execute 'update public.user_subscriptions set artist_uid = user_id where artist_uid is null';
    end if;
  end if;
end $$;

-- Only create indexes that reference columns that exist (legacy schemas may be missing them).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_subscriptions'
      and column_name = 'artist_uid'
  ) then
    execute 'create index if not exists user_subscriptions_artist_uid_created_at_idx on public.user_subscriptions (artist_uid, created_at desc)';
    execute 'create index if not exists user_subscriptions_artist_uid_status_idx on public.user_subscriptions (artist_uid, status)';
    execute 'create unique index if not exists user_subscriptions_one_row_per_artist_idx on public.user_subscriptions (artist_uid)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_subscriptions'
      and column_name = 'expires_at'
  ) then
    execute 'create index if not exists user_subscriptions_expires_at_idx on public.user_subscriptions (expires_at desc nulls last)';
  end if;
end $$;

alter table public.subscriptions enable row level security;
alter table public.user_subscriptions enable row level security;

-- Seed baseline plans (admin can edit features later).
insert into public.subscriptions (code, name, features, sort_order)
values
  (
    'free',
    'Free',
    jsonb_build_object(
      'tier', 'free',
      'uploads', jsonb_build_object('songs', true, 'videos', true),
      'limits', jsonb_build_object('maxSongs', 10, 'maxVideos', 5),
      'support', jsonb_build_object('priority', false)
    ),
    10
  ),
  (
    'premium',
    'Premium',
    jsonb_build_object(
      'tier', 'premium',
      'uploads', jsonb_build_object('songs', true, 'videos', true),
      'limits', jsonb_build_object('maxSongs', 100, 'maxVideos', 50),
      'support', jsonb_build_object('priority', true)
    ),
    20
  ),
  (
    'platinum',
    'Platinum',
    jsonb_build_object(
      'tier', 'platinum',
      'uploads', jsonb_build_object('songs', true, 'videos', true),
      'limits', jsonb_build_object('maxSongs', 1000, 'maxVideos', 500),
      'support', jsonb_build_object('priority', true),
      'boost', jsonb_build_object('featuredPlacement', true)
    ),
    30
  )
on conflict (code) do nothing;

-- Note: this dashboard uses the Supabase Service Role key (server-side) so RLS won't block it.
-- Add policies as needed if you later expose subscription tables to a client-side Supabase anon key.
