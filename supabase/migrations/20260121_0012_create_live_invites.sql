-- Creates live_invites table for collaborative live streaming
-- Allows artists to invite each other to join live sessions

create table if not exists public.live_invites (
  id uuid primary key default gen_random_uuid(),

  -- Reference to the live session
  session_id uuid not null references public.live_sessions (id) on delete cascade,

  -- The artist sending the invite
  from_artist_uid text not null,

  -- The artist receiving the invite
  to_artist_uid text not null,

  -- Cached name of inviter for display
  from_artist_name text,

  -- pending | accepted | declined | expired
  status text not null default 'pending',

  created_at timestamptz not null default now(),
  responded_at timestamptz,

  constraint live_invites_status_check check (status in ('pending', 'accepted', 'declined', 'expired'))
);

create index if not exists live_invites_to_artist_uid_idx on public.live_invites (to_artist_uid);
create index if not exists live_invites_session_id_idx on public.live_invites (session_id);
create index if not exists live_invites_status_idx on public.live_invites (status);
create index if not exists live_invites_to_artist_status_idx on public.live_invites (to_artist_uid, status);

alter table public.live_invites enable row level security;

-- RLS Policy: Users can read their own invites and artists can see invites they sent
create policy live_invites_read_own on public.live_invites
  for select
  using (
    to_artist_uid = current_user_uid()
    or from_artist_uid = current_user_uid()
  );

-- RLS Policy: Only the inviter can update (accept/decline is done server-side)
create policy live_invites_update_own on public.live_invites
  for update
  using (from_artist_uid = current_user_uid());
