begin;

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  memory_type text not null default 'memory'
    check (memory_type in ('memory', 'place', 'recipe', 'trip', 'gift', 'other')),
  memory_date date,
  location text check (location is null or char_length(location) <= 160),
  rating smallint check (rating is null or rating between 1 and 5),
  tags text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 2000),
  image_url text check (
    image_url is null
    or image_url ~ '^https://[^[:space:]]+$'
  ),
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memories_couple_created_idx
on public.memories (couple_id, created_at desc);

create index memories_tags_idx
on public.memories using gin (tags);

create function public.set_memory_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'A memory creator cannot be changed';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_memory_updated_at();

alter table public.memories enable row level security;

revoke all on table public.memories from anon, authenticated;
grant select, insert, update, delete on table public.memories to authenticated;

create policy "Couple members can read their memories"
on public.memories
for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Couple members can add memories"
on public.memories
for insert
to authenticated
with check (
  public.is_couple_member(couple_id)
  and created_by = auth.uid()
);

create policy "Couple members can update their memories"
on public.memories
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy "Couple members can delete their memories"
on public.memories
for delete
to authenticated
using (public.is_couple_member(couple_id));

revoke all on function public.set_memory_updated_at() from public, anon, authenticated;

commit;
