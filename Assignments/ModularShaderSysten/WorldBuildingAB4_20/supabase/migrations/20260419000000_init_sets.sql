-- Run in Supabase SQL Editor or via CLI: supabase db push
-- Sets: one row per performance; slug powers /p/[slug]

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  title text not null default 'Untitled',
  is_published boolean not null default false,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sets_slug_key unique (slug)
);

create index sets_user_id_idx on public.sets (user_id);
create index sets_slug_idx on public.sets (slug);

alter table public.sets enable row level security;

-- Anyone (including anon) can read published sets for performance URLs.
create policy "sets_select_public_or_owner"
  on public.sets
  for select
  using (is_published = true or auth.uid() = user_id);

create policy "sets_insert_owner"
  on public.sets
  for insert
  with check (auth.uid() = user_id);

create policy "sets_update_owner"
  on public.sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sets_delete_owner"
  on public.sets
  for delete
  using (auth.uid() = user_id);

create or replace function public.sets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sets_updated_at
  before update on public.sets
  for each row
  execute procedure public.sets_set_updated_at();
