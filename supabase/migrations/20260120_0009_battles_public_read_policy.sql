-- Allow the consumer app (Supabase anon key) to read live battles.
-- Without this, RLS blocks SELECT and the consumer app will see nothing.
-- Safe to run multiple times.

alter table public.battles enable row level security;

drop policy if exists "public read live battles" on public.battles;

create policy "public read live battles"
  on public.battles
  for select
  to anon, authenticated
  using (is_live = true);
