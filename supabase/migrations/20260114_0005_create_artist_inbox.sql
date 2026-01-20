-- Artist inbox (messages/announcements)
-- Minimal schema to back the dashboard Messages page.

create extension if not exists pgcrypto;

create table if not exists public.artist_inbox_threads (
  id uuid primary key default gen_random_uuid(),
  artist_uid text not null,

  thread_type text not null default 'fan',
  fan_id text null,
  subject text null,

  last_message_preview text null,
  last_message_at timestamptz null,
  last_sender_type text null,

  unread_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artist_inbox_threads_thread_type_check check (thread_type in ('fan','system','announcement')),
  constraint artist_inbox_threads_last_sender_type_check check (
    last_sender_type is null or last_sender_type in ('fan','artist','system')
  ),
  constraint artist_inbox_threads_unread_non_negative check (unread_count >= 0)
);

create index if not exists artist_inbox_threads_artist_uid_last_message_at_idx
  on public.artist_inbox_threads (artist_uid, last_message_at desc nulls last, created_at desc);

create index if not exists artist_inbox_threads_artist_uid_thread_type_idx
  on public.artist_inbox_threads (artist_uid, thread_type);

create index if not exists artist_inbox_threads_artist_uid_fan_id_idx
  on public.artist_inbox_threads (artist_uid, fan_id)
  where fan_id is not null;

create table if not exists public.artist_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.artist_inbox_threads(id) on delete cascade,

  -- Duplicate artist_uid for fast filtering without a join.
  artist_uid text not null,

  sender_type text not null,
  sender_id text null,

  body text not null,

  created_at timestamptz not null default now(),
  read_at timestamptz null,

  constraint artist_inbox_messages_sender_type_check check (sender_type in ('fan','artist','system')),
  constraint artist_inbox_messages_body_non_empty check (char_length(body) > 0)
);

create index if not exists artist_inbox_messages_thread_id_created_at_idx
  on public.artist_inbox_messages (thread_id, created_at asc);

create index if not exists artist_inbox_messages_artist_uid_created_at_idx
  on public.artist_inbox_messages (artist_uid, created_at desc);

create index if not exists artist_inbox_messages_thread_id_unread_idx
  on public.artist_inbox_messages (thread_id, read_at)
  where read_at is null;

alter table public.artist_inbox_threads enable row level security;
alter table public.artist_inbox_messages enable row level security;

-- Note: this dashboard uses the Supabase Service Role key (server-side) so RLS won't block it.
-- Add policies as needed if you later expose these tables to a client-side Supabase anon key.
