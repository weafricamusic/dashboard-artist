-- Promotions / boosts
-- Creates artist-targeted promotion campaigns with admin-controlled limits and basic reach/ROI tracking fields.

create extension if not exists pgcrypto;

create table if not exists public.promotion_limits (
  id int primary key default 1,
  min_budget_coins int not null default 50,
  max_budget_coins int not null default 5000,
  max_countries int not null default 5,
  max_active_campaigns int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_limits_singleton check (id = 1)
);

insert into public.promotion_limits (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  artist_uid text not null,

  content_type text not null,
  content_id text not null,
  content_label text null,

  target_countries text[] not null default array[]::text[],

  budget_coins int not null,
  daily_budget_coins int null,

  status text not null default 'pending',

  -- Basic tracking fields (typically written by backend jobs / admin tooling)
  impressions int not null default 0,
  clicks int not null default 0,
  spend_coins int not null default 0,
  revenue_coins int not null default 0,

  admin_notes text null,
  reviewed_by text null,
  reviewed_at timestamptz null,

  starts_at timestamptz null,
  ends_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promotion_campaigns_content_type_check check (content_type in ('song','video','live')),
  constraint promotion_campaigns_status_check check (status in ('pending','approved','active','paused','ended','rejected')),
  constraint promotion_campaigns_budget_positive check (budget_coins > 0),
  constraint promotion_campaigns_daily_budget_positive check (daily_budget_coins is null or daily_budget_coins > 0),
  constraint promotion_campaigns_non_negative_metrics check (
    impressions >= 0 and clicks >= 0 and spend_coins >= 0 and revenue_coins >= 0
  )
);

create index if not exists promotion_campaigns_artist_uid_created_at_idx
  on public.promotion_campaigns (artist_uid, created_at desc);

create index if not exists promotion_campaigns_artist_uid_status_idx
  on public.promotion_campaigns (artist_uid, status);

alter table public.promotion_limits enable row level security;
alter table public.promotion_campaigns enable row level security;

-- Note: this dashboard uses the Supabase Service Role key (server-side) so RLS won't block it.
-- Add policies as needed if you later expose these tables to a client-side Supabase anon key.
