-- Adds a non-internal, URL-safe public identifier for live sessions.
-- This prevents exposing the primary key UUID in URLs/UI.

alter table if exists public.live_sessions
add column if not exists public_code text;

-- Ensure pgcrypto is available for gen_random_bytes.
create extension if not exists pgcrypto;

-- Backfill existing rows.
update public.live_sessions
set public_code = encode(gen_random_bytes(9), 'hex')
where public_code is null or public_code = '';

-- Set NOT NULL + default for new rows.
alter table public.live_sessions
alter column public_code set default encode(gen_random_bytes(9), 'hex');

alter table public.live_sessions
alter column public_code set not null;

-- Uniqueness.
create unique index if not exists live_sessions_public_code_uidx
on public.live_sessions (public_code);
