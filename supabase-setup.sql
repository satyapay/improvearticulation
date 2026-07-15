-- ============================================================
-- VTO week-1 database setup
-- Paste this whole file into: Supabase dashboard → SQL Editor
-- → New query → paste → Run. Safe to run more than once.
-- ============================================================

-- One row per banked run. Personal bests are computed from this
-- (speedrun: lowest score in ms wins; pace: highest control % wins).
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drill_id text not null check (drill_id in ('speedrun', 'pace')),
  level integer not null check (level >= 1),
  score numeric not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: users can only ever see and write their own rows.
alter table public.scores enable row level security;

drop policy if exists "read own scores" on public.scores;
create policy "read own scores"
  on public.scores for select
  using (auth.uid() = user_id);

drop policy if exists "insert own scores" on public.scores;
create policy "insert own scores"
  on public.scores for insert
  with check (auth.uid() = user_id);

-- Fast personal-best lookups.
create index if not exists scores_user_drill_idx
  on public.scores (user_id, drill_id, level);
