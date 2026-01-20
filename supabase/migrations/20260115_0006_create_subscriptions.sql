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

create index if not exists user_subscriptions_artist_uid_created_at_idx
  on public.user_subscriptions (artist_uid, created_at desc);

create index if not exists user_subscriptions_artist_uid_status_idx
  on public.user_subscriptions (artist_uid, status);

create index if not exists user_subscriptions_expires_at_idx
  on public.user_subscriptions (expires_at desc nulls last);

-- Only allow one current record per artist (best-effort). If you need history,
-- remove this constraint and keep using newest created_at in queries.
create unique index if not exists user_subscriptions_one_row_per_artist_idx
  on public.user_subscriptions (artist_uid);

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
