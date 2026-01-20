-- Allow the consumer app (Supabase anon key) to read upcoming/live sessions.
-- Without this, RLS blocks SELECT and the consumer app will see nothing.
-- Safe to run multiple times.

alter table public.live_sessions enable row level security;

drop policy if exists "public read scheduled/live sessions" on public.live_sessions;

create policy "public read scheduled/live sessions"
  on public.live_sessions
  for select
  to anon, authenticated
  using (status in ('scheduled', 'live'));
